import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { PUBLIC_OPENROUTER_API_KEY, PUBLIC_OPENROUTER_API_URL } from '$env/static/public';
import divideBlocks from './divideBlocks';
import detectTitles from './detectTitles';
import type { CompressedBlock } from '../implementations/block_compression';
import type { Block } from '../implementations/block_divide';

/**
 * Counts the number of words in a string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Compresses blocks using LLM
 */
export default async function compressBlocks(content: string): Promise<CompressedBlock[]> {
  // Step 1: Divide content into blocks
  const blocks: Block[] = divideBlocks(content);
  
  // Step 2: Run title detection
  const titleDetectionResult = await detectTitles(content);
  
  // Step 3: Process each block
  const compressedBlocks: CompressedBlock[] = [];
  const blocksToCompress: { index: number; content: string }[] = [];
  
  // First pass: identify blocks to compress and prepare initial result array
  blocks.forEach((block, index) => {
    const isTitle = titleDetectionResult.highConfidence.lines.includes(index) || 
                   titleDetectionResult.moderateConfidence.lines.includes(index);
    
    const titleConfidence = titleDetectionResult.highConfidence.lines.includes(index) 
      ? 'high' 
      : titleDetectionResult.moderateConfidence.lines.includes(index) 
        ? 'moderate' 
        : 'none';
    
    // Create the compressed block with null compressed content initially
    compressedBlocks.push({
      originalContent: block.content,
      compressedContent: null,
      isTitle,
      titleConfidence
    });
    
    // Check if this block should be compressed
    if (block.meaningful && !isTitle && countWords(block.content) > 10) {
      blocksToCompress.push({ index, content: block.content });
    }
  });
  
  // If there are no blocks to compress, return early
  if (blocksToCompress.length === 0) {
    return compressedBlocks;
  }
  
  // Step 4: Set up LLM with OpenRouter
  const model = new ChatOpenAI({
    modelName: 'anthropic/claude-3.7-sonnet',
    temperature: 0.1,
    openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
    configuration: {
      baseURL: PUBLIC_OPENROUTER_API_URL
    }
  });
  
  // Define the output schema using Zod
  const outputSchema = z.object({
    compressedText: z.string().describe('The compressed version of the text, ~10 words')
  });
  
  // Create the parser
  const parser = StructuredOutputParser.fromZodSchema(outputSchema);
  const formatInstructions = parser.getFormatInstructions();
  
  // Create prompt template
  const promptTemplate = `
  Make the following more concise, preferably ~10 words, but keep transitional markers that link to previous or following content (colon, first, second, hence, etc). Do not add any information not present in the source text.

  Some content should NOT be summarized. If the content appears to be:
  - Reference material
  - Supporting evidence
  - Technical specifications
  - Direct quotations
  - Specialized notation

  Keep these in their original form. If unsure, err on the side of not summarizing.

  Maintain the author's original voice and perspective (first/third person).

  {format_instructions}
  
  Content to compress:
  {content}
  `;
  
  const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
  
  // Process blocks in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < blocksToCompress.length; i += batchSize) {
    const batch = blocksToCompress.slice(i, i + batchSize);
    
    // Process each block in the batch concurrently
    const batchResults = await Promise.all(
      batch.map(async ({ index, content }) => {
        try {
          const response = await prompt.pipe(model).invoke({
            format_instructions: formatInstructions,
            content
          });
          
          const parsedOutput = await parser.parse(response.content.toString());
          return { index, compressedContent: parsedOutput.compressedText };
        } catch (error) {
          console.error(`Error compressing block ${index}:`, error);
          return { index, compressedContent: null };
        }
      })
    );
    
    // Update the compressed blocks with the results
    batchResults.forEach(({ index, compressedContent }) => {
      if (compressedContent) {
        compressedBlocks[index].compressedContent = compressedContent;
      }
    });
  }
  
  return compressedBlocks;
}
