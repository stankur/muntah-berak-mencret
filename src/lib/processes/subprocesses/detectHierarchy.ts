import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { encode } from 'gpt-tokenizer';
import { PUBLIC_OPENROUTER_API_KEY, PUBLIC_OPENROUTER_API_URL } from '$env/static/public';
import type {
	TitleHierarchy,
	HierarchyDetectionResult
} from '$lib/processes/implementations/hierarchy_detection';
import type {
	NumberedBlockElement,
	NumberedTitleElement
} from '$lib/processes/implementations/title_numbering_summarization';
import numberTitles from '$lib/processes/subprocesses/numberTitles';

// Base prompt for hierarchy detection
const BASE_HIERARCHY_PROMPT = `
below is an excerpt which has been passed through a preprocessing step of tagging section title blocks. The blocks identified to be section titles have been prepended with T<number> at the start of the blocks. The blocks between the titles have been summarized to provide a compressed context of the content below each title. Please reason about the hierarchy of the titles, and output your final answer of the hierarchy in an ascii tree format. These are the requirements: 

1. It is the case that sometimes there are consecutive blocks which are marked as title, however the subsequent blocks are more of a "decoration" for that title, instead of marking a new section. These decorations are sometimes quotes, or a small summary of the section, etc. In this case, you can denote them to be in the same level, in the ascii tree, mark them as T<X> - T<X+1>. If there are more than two consecutive blocks, you can continue appending them like T<X> - T<X+1> - T<X+2> ... as one level in ASCII Tree. However, there are also cases where consecutive blocks of titles are actually denoting new sections, for instance when the first block is a chapter title, and the second block is "introduction", in this case, introduction is a section title, and should be noted to be hierarchically a child under the chapter title. 
2. If it is abiguous whether a title T<X+1> is meant to be under T<X> as a subsection or combined, and they are consecutively next to each other in the excerpt, prefer combining them into 1 level.
3. In cases where it is ambiguous whether a title T<X+1> is meant to be under T<X> (as a subsection of T<X>) or next to T<X> (as a neighbor of T<X>, not combined), prefer making a subsection.
`;

/**
 * Detects the hierarchical structure of sections in the document
 * @param content The content to process
 * @returns The hierarchy detection result
 */
export default async function detectHierarchy(content: string): Promise<HierarchyDetectionResult> {
	console.log(`[detectHierarchy] Starting process on content of length: ${content.length}`);

	// Step 1: Get the title numbering summarization result
	const titleNumberingResult = await numberTitles(content);

	// Step 2: Extract title elements and prepare for processing
	const titleElements = titleNumberingResult.elements.filter(
		(element): element is NumberedTitleElement => element.type === 'title'
	);

	console.log(`[detectHierarchy] Found ${titleElements.length} title elements`);

	// If no titles found, return empty result
	if (titleElements.length === 0) {
		return {
			input: [],
			titleHierarchy: [],
			asciiTree: 'No titles found.',
			originalBlocks: titleNumberingResult.originalBlocks
		};
	}

	// Step 3: Define the maximum token limit (10% of context window)
	const MAX_TOKEN_LIMIT = Math.floor(128000 * 0.1); // 10% of context window

	// Step 4: Process titles iteratively with sliding windows
	let currentAsciiTree = '';
	const processedTitleIndices: number[] = [];
	let titleHierarchy: TitleHierarchy[] = [];

	// Set up LangChain with OpenRouter
	const model = new ChatOpenAI({
		modelName: 'anthropic/claude-3.7-sonnet',
		temperature: 0.1,
		openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
		configuration: {
			baseURL: PUBLIC_OPENROUTER_API_URL
		}
	});

	// Calculate base token count for the prompt
	const baseTokenCount = encode(BASE_HIERARCHY_PROMPT).length;

	// Reserve tokens for the response and other context
	const adjustedMaxTokenLimit = MAX_TOKEN_LIMIT - baseTokenCount;

	// Process titles in sliding windows
	while (processedTitleIndices.length < titleElements.length) {
		// Get open neighbors for context
		const openNeighbors = titleHierarchy.length > 0 ? getOpenNeighbors(titleHierarchy) : [];

		// Get context elements for this window
		const contextElements = getContextElements(titleNumberingResult.elements, openNeighbors);

		// Calculate token count for context
		let contextTokenCount = 0;
		for (const element of contextElements) {
			if (element.type === 'title') {
				contextTokenCount += encode(element.numberedContent).length;
			} else {
				contextTokenCount += encode(element.content).length;
			}
		}

		// Calculate token count for current ASCII tree
		const asciiTreeTokenCount = encode(currentAsciiTree).length;

		// Calculate remaining tokens for new titles
		const remainingTokens = adjustedMaxTokenLimit - contextTokenCount - asciiTreeTokenCount;

		// Get next batch of unprocessed titles that fit within the token limit
		const nextBatch = getNextTitleBatch(
			titleNumberingResult.elements,
			processedTitleIndices,
			remainingTokens
		);

		// If no more titles can fit, break
		if (nextBatch.elements.length === 0) {
			console.log(`[detectHierarchy] No more titles can fit in the context window`);
			break;
		}

		// Process this window
		const isFirstWindow = processedTitleIndices.length === 0;
		const windowResult = await processWindow(
			nextBatch.elements,
			currentAsciiTree,
			contextElements,
			isFirstWindow,
			model
		);

		// Update the current ASCII tree
		currentAsciiTree = windowResult;

		// Update processed title indices
		processedTitleIndices.push(...nextBatch.processedIndices);

		console.log(
			`[detectHierarchy] Processed ${processedTitleIndices.length}/${titleElements.length} titles`
		);
	}

	console.log(`[detectHierarchy] All titles processed. Converting ASCII tree to JSON structure`);

	// Step 5: Convert the ASCII tree to JSON structure
	titleHierarchy = await convertAsciiTreeToJson(currentAsciiTree, model);

	// Return the final result
	return {
		input: titleNumberingResult.elements,
		titleHierarchy,
		asciiTree: currentAsciiTree,
		originalBlocks: titleNumberingResult.originalBlocks
	};
}

/**
 * Gets the next batch of titles that fit within the token limit
 * @param elements All block elements
 * @param processedIndices Indices of already processed titles
 * @param remainingTokens Remaining tokens available
 * @returns The next batch of elements and their indices
 */
function getNextTitleBatch(
	elements: NumberedBlockElement[],
	processedIndices: number[],
	remainingTokens: number
): { elements: NumberedBlockElement[]; processedIndices: number[] } {
	const batch: NumberedBlockElement[] = [];
	const newProcessedIndices: number[] = [];
	let tokenCount = 0;

	// Find title elements that haven't been processed yet
	const titleElements = elements.filter(
		(element): element is NumberedTitleElement =>
			element.type === 'title' && !processedIndices.includes(getTitleNumber(element))
	);

	// Add titles and their associated summaries until we reach the token limit
	for (let i = 0; i < titleElements.length; i++) {
		const titleElement = titleElements[i];
		const titleNumber = getTitleNumber(titleElement);

		// Calculate token count for this title
		const titleTokens = encode(titleElement.numberedContent).length;

		// Check if adding this title would exceed the token limit
		if (tokenCount + titleTokens > remainingTokens && batch.length > 0) {
			// We've reached the limit
			break;
		}

		// Add the title to the batch
		batch.push(titleElement);
		newProcessedIndices.push(titleNumber);
		tokenCount += titleTokens;

		// Find the summary blocks that follow this title until the next title
		const titleElementIndex = elements.findIndex(
			(e) => e.type === 'title' && getTitleNumber(e) === titleNumber
		);

		if (titleElementIndex !== -1 && titleElementIndex + 1 < elements.length) {
			// Start from the element after the title
			let currentIndex = titleElementIndex + 1;

			// Add summary blocks until we reach the next title or run out of tokens
			while (currentIndex < elements.length && elements[currentIndex].type === 'summary') {
				const summaryElement = elements[currentIndex];
				const summaryTokens = encode(summaryElement.content).length;

				// Check if adding this summary would exceed the token limit
				if (tokenCount + summaryTokens <= remainingTokens) {
					// Add the summary to the batch
					batch.push(summaryElement);
					tokenCount += summaryTokens;
					currentIndex++;
				} else {
					// We've reached the token limit
					break;
				}
			}
		}
	}

	return { elements: batch, processedIndices: newProcessedIndices };
}

/**
 * Gets context elements for a window based on open neighbors
 * @param elements All block elements
 * @param openNeighbors Indices of open neighbor titles
 * @returns Context elements for the window
 */
function getContextElements(
	elements: NumberedBlockElement[],
	openNeighbors: number[]
): NumberedBlockElement[] {
	if (openNeighbors.length === 0) {
		return [];
	}

	const contextElements: NumberedBlockElement[] = [];

	// For each open neighbor, get the title and its associated summary
	for (const neighborIndex of openNeighbors) {
		// Find the title element
		const titleElement = elements.find(
			(element): element is NumberedTitleElement =>
				element.type === 'title' && getTitleNumber(element) === neighborIndex
		);

		if (titleElement) {
			contextElements.push(titleElement);

			// Find the summary that follows this title
			const titleElementIndex = elements.indexOf(titleElement);
			const nextElement = elements[titleElementIndex + 1];

			if (nextElement && nextElement.type === 'summary') {
				contextElements.push(nextElement);
			}
		}
	}

	return contextElements;
}

/**
 * Gets the title number from a numbered title element
 * @param element The numbered title element
 * @returns The title number
 */
function getTitleNumber(element: NumberedTitleElement): number {
	// Extract the number from the numberedContent (format: "T<number>: <content>")
	const match = element.numberedContent.match(/^T(\d+):/);
	return match ? parseInt(match[1]) : 0;
}

/**
 * Processes a window of title elements
 * @param windowElements The elements in this window
 * @param currentAsciiTree The current ASCII tree
 * @param contextElements Context elements from previous windows
 * @param isFirstWindow Whether this is the first window
 * @param model The LLM model to use
 * @returns The updated ASCII tree
 */
async function processWindow(
	windowElements: NumberedBlockElement[],
	currentAsciiTree: string,
	contextElements: NumberedBlockElement[],
	isFirstWindow: boolean,
	model: ChatOpenAI
): Promise<string> {
	// Create the prompt
	let promptContent = BASE_HIERARCHY_PROMPT;

	// Add current ASCII tree and context for subsequent windows
	if (!isFirstWindow) {
		promptContent += `\n\nCurrent ASCII Tree:\n${currentAsciiTree}\n\n`;

		if (contextElements.length > 0) {
			promptContent += 'Context from previous titles:\n';

			for (const element of contextElements) {
				if (element.type === 'title') {
					promptContent += `${element.numberedContent}\n`;
				} else {
					promptContent += `${element.content}\n\n`;
				}
			}
		}
	}

	// Add the window content
	promptContent += '\nThis is the excerpt to be extracted for titles hierarchy ASCII tree:\n\n';

	for (const element of windowElements) {
		if (element.type === 'title') {
			promptContent += `${element.numberedContent}\n`;
		} else {
			promptContent += `${element.content}\n\n`;
		}
	}

	// For subsequent windows, instruct the LLM to update the entire ASCII tree
	if (!isFirstWindow) {
		promptContent +=
			'\nPlease update the ASCII tree to include all titles, both from the previous tree and the new excerpt. Output the complete updated ASCII tree, not just the additions.';
	}

	// Create the prompt template
	const prompt = ChatPromptTemplate.fromTemplate(promptContent);

	try {
		// Execute the prompt
		const response = await model.invoke(await prompt.format({}));
		const asciiTree = response.content.toString();

		console.log(`[processWindow] Generated ASCII tree:\n${asciiTree}`);

		return asciiTree;
	} catch (error) {
		console.error('Error processing window with LangChain:', error);
		return isFirstWindow ? 'Error generating ASCII tree.' : currentAsciiTree;
	}
}

/**
 * Gets open neighbors from the title hierarchy
 * @param hierarchy The title hierarchy
 * @returns Array of title numbers that are open neighbors
 */
function getOpenNeighbors(hierarchy: TitleHierarchy[]): number[] {
	const openNeighbors: number[] = [];

	// Helper function to collect title numbers from a node and its children
	function collectTitlesFromNode(node: TitleHierarchy): void {
		// Add content from all children
		for (const child of node.children) {
			openNeighbors.push(...child.content);
		}

		// Only traverse to the last child for the recursive call
		if (node.children.length > 0) {
			collectTitlesFromNode(node.children[node.children.length - 1]);
		}
	}

	// If there are any nodes in the hierarchy, start with the last one
	if (hierarchy.length > 0) {
		for (const child of hierarchy) {
			openNeighbors.push(...child.content);
		}
		collectTitlesFromNode(hierarchy[hierarchy.length - 1]);
	}

	// Sort and remove duplicates
	return [...new Set(openNeighbors)].sort((a, b) => a - b);
}

/**
 * Converts the ASCII tree to a JSON structure
 * @param asciiTree The ASCII tree
 * @param model The LLM model to use
 * @returns The title hierarchy as a JSON structure
 */
async function convertAsciiTreeToJson(
	asciiTree: string,
	model: ChatOpenAI
): Promise<TitleHierarchy[]> {
	// Define the output schema using Zod
	const titleHierarchySchema: z.ZodType<TitleHierarchy> = z.object({
		content: z.array(z.number()),
		children: z.array(z.lazy(() => titleHierarchySchema))
	});

	const outputSchema = z.array(titleHierarchySchema);

	// Create the parser
	const parser = StructuredOutputParser.fromZodSchema(outputSchema);
	const formatInstructions = parser.getFormatInstructions();

	// Create the prompt
	const promptContent = `
Convert the following ASCII tree representation of title hierarchy to a JSON structure following this schema:

const titleHierarchySchema = z.lazy(() => z.object({{
  content: z.array(z.number()), // Array of numbers for consecutive titles
  children: z.array(titleHierarchySchema)
}}));

The conversion should work as follows:
- Each title is represented by its number (the T<number> part)
- Consecutive titles at the same level (e.g., "T2 - T3") should be represented as an array of numbers in the "content" field
- Child titles should be represented in the "children" array

Example:
T1 
├── T2 - T3 
└── T4 
    └── T5 

Should be converted to:
[
  {{
    "content": [1],
    "children": [
      {{
        "content": [2, 3],
        "children": []
      }},
      {{
        "content": [4],
        "children": [
          {{
            "content": [5],
            "children": []
          }}
        ]
      }}
    ]
  }}
]

{formatInstructions}

ASCII Tree to convert:
{asciiTree}
`;
	console.log('before from template');
	// Create the prompt template
	const prompt = ChatPromptTemplate.fromTemplate(promptContent);
	console.log('after promtp template');
	try {
		// Execute the prompt
		const response = await model.invoke(await prompt.format({ formatInstructions, asciiTree }));

		// Parse the structured output
		const parsedOutput = await parser.parse(response.content.toString());

		console.log(`[convertAsciiTreeToJson] Converted ASCII tree to JSON structure`);

		return parsedOutput;
	} catch (error) {
		console.error('Error converting ASCII tree to JSON with LangChain:', error);
		return []; // Return empty array on error
	}
}
