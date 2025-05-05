import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { encode } from 'gpt-tokenizer';
import divideBlocks from '$lib/processes/subprocesses/divideBlocks';
import type { TitleDetectionResult } from '$lib/processes/implementations/title_detection';
import { PUBLIC_OPENROUTER_API_KEY, PUBLIC_OPENROUTER_API_URL } from '$env/static/public';

export default async function detectTitles(content: string): Promise<TitleDetectionResult> {
	// Divide content into blocks
	const blocks = divideBlocks(content);

	// Prepend block numbers (zero-indexed)
	const numberedBlocks = blocks.map((block, index) => `L${index}: ${block.content}`);

	// Define the maximum token limit (20% of GPT-4o's context window)
	const MAX_TOKEN_LIMIT = Math.floor(128000 * 0.05); // 10% of context window

	// Group blocks to stay within token limit
	const blockGroups: string[][] = [];
	let currentGroup: string[] = [];
	let currentTokenCount = 0;

	// Create the prompt template and calculate its token count
	const promptTemplate = `
    This is an excerpt from a document. 
    
    In documents, we sometimes have titles, either chapter titles, section titles, or subsection titles.

    The excerpt's blocks have been denoted by L<number> where the numbering starts from 0 (zero-indexed).
    
    Your task is to identify which blocks are likely to be textual section titles and categorize them into two groups:
    1. High confidence: Blocks you are very confident are textual section titles titles
    2. Moderate confidence: Blocks you think might be textual section titles titles but are less certain

    keep in mind of the following specification of titles:
    1. Figure title, Table titles, Chart tile, and other attachment titles or labels should never be considered as textual section titles. They don't count as title. Line breaks are also not considered as title.
    1a) Labels that are describing figures, tables, or other attachments, are not counted as title. 
    1b) Titles should not be describing attachments. The detected titles should be a label for more than 1 block below
    2. Title must be visually distinct from their surroundings. Title might be bolded, might have all capital letters, italicized, or have some other variations. Note that this is not about the content. It doesn't matter whether a block content seems to be a title if there is no visual distinction, then this should be skipped.
    3. Titles are not meant to be paragraphs, they are concise. So if you think that a block feels like an introduction, but it is not visibly of a less length than its surrounding, it is most probably not a title.
    4. The detection is for the full block. If you believe that the start of the block is a title, but not everything in the block, don't consider the block to be a title.
    4a) when you are trying to reason that a block is a title for step 3, you need to mention the whole block, not only the start, we have an automated checker that will fail if you don't mentione the whole L<number> content.
    4b) If your argument about the block passing requirement 3 doesn't mention the whole block, and just a portion, that it probably doesn't pass the third requirement. You should literally mention the whole block in your reasoning for this step. So, when I see the reasoning for this step, I need to see the exact block in it.
    5. Occationally, there will be a list of items, each with a label block and a series of paragraphs following them. This could range from:
     - a list of questions, with their answers as paragraphs follwoing the question labels
     - a list of items/nouns, with their descriptions as paragraphs following the items labels

     In this case, the label blocks are counted as titles too, even if they are not typically considered as section title. Requirement 4 is meant to be general and lenient, so if you are considering something might meet this requirement, it does.
    6. Reflect on every point of this specification before you give your answer. Each block you identify as title must meet these specifcations.

    It is okay for the text to not have any title, in fact it is entirely possible since I am giving you a sliding window of a content. 
        
    For each group, provide the line numbers (using the zero-indexed L numbers) and explain your reasoning. In your reasoning you must explain your check against the 4 requirements mentioned above, in a numbered list of 4 items. Please reason and think deeply before you give your answer. You need to start your answer with your thinking.
    
    {format_instructions}
    
    Content:
    {content}`;

	// Define the output schema using Zod
	const outputSchema = z.object({
		highConfidence: z.object({
			reason: z.string().describe('Explanation of why these lines are highly likely to be titles'),
			lines: z.array(z.number()),
		}),
		moderateConfidence: z.object({
			reason: z
				.string()
				.describe('Explanation of why these lines might be titles but with less certainty'),
			lines: z.array(z.number())
		})
	});

	// Create the parser
	const parser = StructuredOutputParser.fromZodSchema(outputSchema);

	// Calculate the token count for the prompt and format instructions
	const formatInstructions = parser.getFormatInstructions();

	// Adjust the max token limit to account for the prompt and response
	const adjustedMaxTokenLimit = MAX_TOKEN_LIMIT - encode(promptTemplate).length; // Reserve 1000 tokens for the response

	// Group blocks while respecting token limits
	for (const block of numberedBlocks) {
		const blockTokens = encode(block).length;

		if (currentTokenCount + blockTokens > adjustedMaxTokenLimit && currentGroup.length > 0) {
			// Current group is full, start a new one
			blockGroups.push([...currentGroup]);
			currentGroup = [block];
			currentTokenCount = blockTokens;
		} else {
			// Add to current group
			currentGroup.push(block);
			currentTokenCount += blockTokens;
		}
	}

	// Add the last group if it's not empty
	if (currentGroup.length > 0) {
		blockGroups.push(currentGroup);
	}

	console.log(`Split content into ${blockGroups.length} groups`);

	// Set up LangChain with OpenRouter
	const model = new ChatOpenAI({
		modelName: 'anthropic/claude-3.7-sonnet',
		temperature: 0.1,
		openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
		configuration: {
			baseURL: PUBLIC_OPENROUTER_API_URL
		}
	});

	// Create prompt template
	const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

	try {
		// Process each group and combine results
		const allHighConfidenceLines: number[] = [];
		const allModerateConfidenceLines: number[] = [];
		let highConfidenceReason = '';
		let moderateConfidenceReason = '';

		for (let i = 0; i < blockGroups.length; i++) {
			const groupContent = blockGroups[i].join('\n\n');
			console.log(
				`Processing group ${i + 1}/${blockGroups.length} with ${blockGroups[i].length} blocks`
			);

			// Run the chain for this group
			const response = await prompt.pipe(model).invoke({
				format_instructions: formatInstructions,
				content: groupContent
			});
            
            console.log("response: ");
            console.log(response.content.toString());

			// Parse the structured output
			const parsedOutput = await parser.parse(response.content.toString());

			// Add lines to the combined results
			allHighConfidenceLines.push(...parsedOutput.highConfidence.lines);
			allModerateConfidenceLines.push(...parsedOutput.moderateConfidence.lines);

			// Combine reasons
			if (parsedOutput.highConfidence.reason) {
				highConfidenceReason +=
					(highConfidenceReason ? '\n\n' : '') +
					(blockGroups.length > 1 ? `Group ${i + 1}: ` : '') +
					parsedOutput.highConfidence.reason;
			}

			if (parsedOutput.moderateConfidence.reason) {
				moderateConfidenceReason +=
					(moderateConfidenceReason ? '\n\n' : '') +
					(blockGroups.length > 1 ? `Group ${i + 1}: ` : '') +
					parsedOutput.moderateConfidence.reason;
			}
		}

		return {
			blocks: numberedBlocks,
			highConfidence: {
				lines: allHighConfidenceLines,
				reason: highConfidenceReason || 'No high confidence titles found.'
			},
			moderateConfidence: {
				lines: allModerateConfidenceLines,
				reason: moderateConfidenceReason || 'No moderate confidence titles found.'
			}
		};
	} catch (error) {
		console.error('Error processing content with LangChain:', error);
		return {
			blocks: numberedBlocks,
			highConfidence: { lines: [], reason: 'Error processing content' },
			moderateConfidence: { lines: [], reason: 'Error processing content' }
		};
	}
}
