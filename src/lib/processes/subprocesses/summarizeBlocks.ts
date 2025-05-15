import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { PUBLIC_OPENROUTER_API_KEY, PUBLIC_OPENROUTER_API_URL } from '$env/static/public';
import divideBlocks from '$lib/processes/subprocesses/divideBlocks';
import detectTitles from '$lib/processes/subprocesses/detectTitles';
import type { Block } from '$lib/processes/implementations/block_divide';
import type {
	BlockElement,
	SummaryElement,
	BlockSummarizationResult
} from '$lib/processes/implementations/block_summarization';

// Define the output schema using Zod
const summarySchema = z.object({
	summary: z.string().describe('The summarized content'),
	isAbruptChange: z
		.boolean()
		.describe('Whether this summary represents an abrupt change in content type (like footnotes)'),
	startBlockIndex: z.number().describe('The index of the first block in this summary'),
	endBlockIndex: z.number().describe('The index of the last block in this summary')
});

const outputSchema = z.object({
	summaries: z.array(summarySchema)
});

type SummaryItem = z.infer<typeof summarySchema>;

/**
 * Helper function to summarize a section of blocks
 */
async function summarizeSection(
	blocks: Block[],
	startIndex: number,
	endIndex: number,
	model: ChatOpenAI,
	prompt: ChatPromptTemplate,
	formatInstructions: string,
	parser: StructuredOutputParser<typeof outputSchema>
): Promise<SummaryElement[]> {
	// Skip empty sections or sections with only non-meaningful blocks
	const sectionBlocks = blocks.slice(startIndex, endIndex + 1);
	if (sectionBlocks.length === 0 || !sectionBlocks.some((block) => block.meaningful)) {
		console.log(
			`[summarizeBlocks] Skipping section with no meaningful blocks: ${startIndex}-${endIndex}`
		);
		return [];
	}

	// Format blocks with their indices
	const numberedBlocks = sectionBlocks
		.map((block, idx) => `Block ${startIndex + idx}: ${block.content}`)
		.join('\n\n');

	console.log(
		`[summarizeBlocks] Summarizing section ${startIndex}-${endIndex} (${sectionBlocks.length} blocks)`
	);

	try {
		const response = await prompt.pipe(model).invoke({
			format_instructions: formatInstructions,
			content: numberedBlocks
		});

		const parsedOutput = await parser.parse(response.content.toString());
		console.log(
			`[summarizeBlocks] Received ${parsedOutput.summaries.length} summaries for section ${startIndex}-${endIndex}`
		);

		// The LLM already returns absolute indices since we labeled blocks with absolute indices
		return parsedOutput.summaries.map((summary: SummaryItem) => ({
			type: 'summary',
			content: summary.summary,
			sourceBlocks: {
				from: summary.startBlockIndex,
				to: summary.endBlockIndex
			}
		}));
	} catch (error) {
		console.error(`[summarizeBlocks] Error summarizing section ${startIndex}-${endIndex}:`, error);
		return [
			{
				type: 'summary',
				content: 'Error generating summary.',
				sourceBlocks: { from: startIndex, to: endIndex }
			}
		];
	}
}

/**
 * Summarizes blocks between titles
 */
export default async function summarizeBlocks(content: string): Promise<BlockSummarizationResult> {
	console.log(`[summarizeBlocks] Starting process on content of length: ${content.length}`);

	// Step 1: Divide content into blocks
	const blocks: Block[] = divideBlocks(content);
	console.log(`[summarizeBlocks] Divided content into ${blocks.length} blocks`);

	// Step 2: Run title detection
	console.log(`[summarizeBlocks] Running title detection...`);
	const titleDetectionResult = await detectTitles(content);

	// Step 3: Collect and sort title indices with sentinel values
	const titleIndices: number[] = [
		-1, // Sentinel value for start
		...new Set([
			...titleDetectionResult.highConfidence.lines,
			...titleDetectionResult.moderateConfidence.lines
		]),
		blocks.length // Sentinel value for end
	].sort((a, b) => a - b);

	// Create confidence map for actual titles (excluding sentinels)
	const titleConfidence = new Map<number, 'high' | 'moderate'>();
	titleDetectionResult.highConfidence.lines.forEach((idx) => titleConfidence.set(idx, 'high'));
	titleDetectionResult.moderateConfidence.lines.forEach((idx) => {
		if (!titleConfidence.has(idx)) titleConfidence.set(idx, 'moderate');
	});

	console.log(
		`[summarizeBlocks] Title detection complete. Found ${titleIndices.length - 2} titles`
	);
	console.log(`[summarizeBlocks] Processing sections between indices: ${titleIndices.join(', ')}`);

	// Step 4: Set up LLM with OpenRouter
	const model = new ChatOpenAI({
		modelName: 'anthropic/claude-3.7-sonnet',
		temperature: 0.1,
		openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
		configuration: {
			baseURL: PUBLIC_OPENROUTER_API_URL
		}
	});

	// Create the parser
	const parser = StructuredOutputParser.fromZodSchema(outputSchema);
	const formatInstructions = parser.getFormatInstructions();

	// Create prompt template
	const promptTemplate = `
  Summarize the following to be concise into a single paragraph. Use the source words as much as possible. Keep the most important points, and maintain the tone and personality of the writer. Write directly to the user without meta-comments or acknowledgments.
  
  If you detect an abrupt change in content type (like a transition from main content to footnotes, references, or appendices), provide separate summaries for each distinct section. Only split for major content type changes, not for topic changes within the same content type.
  
  Each block is prefixed with its index number (e.g., "Block 5:").
  
  {format_instructions}
  
  Content to summarize:
  {content}
  `;

	const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

	// Step 5: Process all sections
	const result: BlockElement[] = [];
	const sectionPromises: Promise<{ titleElement?: BlockElement; summaries: SummaryElement[] }>[] = [];

	// Prepare all section processing tasks
	for (let i = 0; i < titleIndices.length - 1; i++) {
		const currentIdx = titleIndices[i];
		const nextIdx = titleIndices[i + 1];
		
		const task = async () => {
			let titleElement: BlockElement | undefined;
			
			// If current index is a real title (not the start sentinel), create title element
			if (currentIdx >= 0 && currentIdx < blocks.length) {
				titleElement = {
					type: 'title',
					content: blocks[currentIdx].content,
					confidence: titleConfidence.get(currentIdx)!,
					blockIndex: currentIdx
				};
				console.log(`[summarizeBlocks] Added title at index ${currentIdx}`);
			}

			// Process content between current position (or after title) and next title
			const startIdx = currentIdx + 1;
			const endIdx = nextIdx - 1;

			// Only process if there are blocks in this range
			let summaries: SummaryElement[] = [];
			if (startIdx <= endIdx) {
				summaries = await summarizeSection(
					blocks,
					startIdx,
					endIdx,
					model,
					prompt,
					formatInstructions,
					parser
				);
			}
			
			return { titleElement, summaries };
		};
		
		sectionPromises.push(task());
	}

	// Execute all section processing tasks in parallel
	console.log(`[summarizeBlocks] Processing ${sectionPromises.length} sections in parallel`);
	const sectionResults = await Promise.all(sectionPromises);
	
	// Combine results in order
	for (const sectionResult of sectionResults) {
		if (sectionResult.titleElement) {
			result.push(sectionResult.titleElement);
		}
		result.push(...sectionResult.summaries);
	}

	console.log(
		`[summarizeBlocks] Process complete. Generated ${result.length} elements (titles + summaries)`
	);
	
	// Return both the processed elements and the original blocks
	return {
		elements: result,
		originalBlocks: blocks
	};
}
