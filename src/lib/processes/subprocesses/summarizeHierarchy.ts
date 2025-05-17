import { ChatOpenAI } from '@langchain/openai';
import { PUBLIC_OPENROUTER_API_KEY, PUBLIC_OPENROUTER_API_URL } from '$env/static/public';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import type {
	HierarchyBuildingResult,
	SectionContainerWithDirectDefinition,
	SectionWithDirectDefinition
} from '$lib/processes/implementations/hierarchy_building';
import buildHierarchy from '$lib/processes/subprocesses/buildHierarchy';

// Define the new types for the hierarchy summarization process
export type SectionContainer = Section[];

export interface Section {
	heading: string[];
	children: (SectionContainer | string)[];
	summary: string[];
	longSummary: string[];
	imageUrl?: string;
}

export interface HierarchySummarizationResult {
	sectionContainer: SectionContainer;
	originalResult: HierarchyBuildingResult;
}

// export interface Section {
// 	heading: string[];
// 	children: SectionContainer | string[];
// 	summary: string[];
// 	longSummary: string[];
// 	imageUrl?: string;
// }

// export type SectionContainer = Section[];

// export interface Document {
// 	title: string[];
// 	summary: string[];
// 	longSummary: string[];
// 	children: SectionContainer;
// }

// Define a Zod schema for the paragraphs array
const paragraphsSchema = z.array(z.string());
const paragraphsParser = StructuredOutputParser.fromZodSchema(paragraphsSchema);
// Get format instructions from the parser
const formatInstructions = paragraphsParser.getFormatInstructions();

/**
 * Summarizes a hierarchy by recursively collecting and processing summaries
 * @param content The content to process
 * @returns The hierarchy summarization result
 */
export default async function summarizeHierarchy(
	content: string
): Promise<HierarchySummarizationResult> {
	console.log(`[summarizeHierarchy] Starting process on content of length: ${content.length}`);

	// First run the hierarchy building process
	const hierarchyResult: HierarchyBuildingResult = await buildHierarchy(content);

	console.log(
		`[summarizeHierarchy] Hierarchy building complete. Found ${hierarchyResult.sectionContainer.length} top-level sections`
	);

	// Set up LLM with OpenRouter
	const model = new ChatOpenAI({
		modelName: 'openai/gpt-4o',
		temperature: 0.1,
		openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
		configuration: {
			baseURL: PUBLIC_OPENROUTER_API_URL
		}
	});

	// Create prompt templates for summarization
	const initialSummaryPromptTemplate = `
  Summarize the following to be concise into a single paragraph. Use the source words as much as possible. Keep the most important points, and maintain the tone and personality of the writer. Write directly to the user without meta-comments or acknowledgments.
  Do not include footnotes, references, appendices, or other non-main content in the summary.

  {content}
  `;

	const concisePromptTemplate = `
  Rewrite the following to be at max 15 words, and make it a good hook, while rewriting/paraphrasing inside, and not just describing what we could find inside, output the answer and nothing else:

  {content}
  `;

	const fireshipScriptPromptTemplate = `
  can you rewrite this to be fireship style script? As a script, it would be preferable to have multiple short paragraphs, representing a chunk of continuous speech, and the breaks responding to short pauses. I would prefer it to be fun, but don't try too much to be sarcastic, make it easy to understand.

  {content}
  `;

	const scriptToArrayPromptTemplate = `
  Convert this script to an array of paragraphs. Sometimes, there are lines that occur next to each other, though not exactly forming a paragraph, and there are lines that are spaced further from each other. For the lines that are placed closely to each other, combine them into a paragraph, if there also exists bigger spacings.
  
  {format_instructions}
  
  Script:
  {content}
  `;

	// Create prompt templates
	const initialSummaryPrompt = ChatPromptTemplate.fromTemplate(initialSummaryPromptTemplate);
	const concisePrompt = ChatPromptTemplate.fromTemplate(concisePromptTemplate);
	const fireshipScriptPrompt = ChatPromptTemplate.fromTemplate(fireshipScriptPromptTemplate);
	const scriptToArrayPrompt = ChatPromptTemplate.fromTemplate(scriptToArrayPromptTemplate);

	// Process the section container recursively
	const sectionContainer = await transformSectionContainer(
		hierarchyResult.sectionContainer,
		model,
		initialSummaryPrompt,
		concisePrompt,
		fireshipScriptPrompt,
		scriptToArrayPrompt,
	);

	console.log(
		`[summarizeHierarchy] Process complete. Generated section container with ${sectionContainer.length} top-level sections`
	);

	return {
		sectionContainer,
		originalResult: hierarchyResult
	};
}

/**
 * Transforms a section container from the hierarchy building result to the new format
 * This implementation processes all sections in parallel for better performance
 */
async function transformSectionContainer(
	container: SectionContainerWithDirectDefinition,
	model: ChatOpenAI,
	initialSummaryPrompt: ChatPromptTemplate,
	concisePrompt: ChatPromptTemplate,
	fireshipScriptPrompt: ChatPromptTemplate,
	scriptToArrayPrompt: ChatPromptTemplate,
): Promise<SectionContainer> {
	console.log(`[summarizeHierarchy] Processing ${container.length} sections in parallel`);

	// Process all sections in parallel
	const transformPromises = container.map((section) =>
		transformSection(
			section,
			model,
			initialSummaryPrompt,
			concisePrompt,
			fireshipScriptPrompt,
			scriptToArrayPrompt,
		)
	);

	// Wait for all sections to be transformed
	const result = await Promise.all(transformPromises);

	return result;
}

/**
 * Counts the number of words in a string
 */
function countWords(text: string): number {
	return text.trim().split(/\s+/).length;
}

/**
 * Transforms a single section from the hierarchy building result to the new format
 */
async function transformSection(
	section: SectionWithDirectDefinition,
	model: ChatOpenAI,
	initialSummaryPrompt: ChatPromptTemplate,
	concisePrompt: ChatPromptTemplate,
	fireshipScriptPrompt: ChatPromptTemplate,
	scriptToArrayPrompt: ChatPromptTemplate,
): Promise<Section> {
	// First, collect all summaries from this section and its children
	const allSummaries = collectAllSummaries(section);

	// Generate the concise summary and long summary using the LLM
	let summary: string[] = [];
	let longSummary: string[] = [];

	if (allSummaries.length > 0) {
		// Concatenate all summaries
		const concatenatedSummaries = allSummaries.join(' ');

		try {
			console.log(
				`[summarizeHierarchy] Generating summaries for section "${section.heading.join(' ')}"`
			);

			// Step 1: Generate initial summary using the initial prompt
			const initialResponse = await initialSummaryPrompt.pipe(model).invoke({
				content: concatenatedSummaries
			});

			const initialSummaryText = initialResponse.content.toString().trim();
			console.log(
				`[summarizeHierarchy] Generated initial summary: "${initialSummaryText.substring(0, 50)}..."`
			);

			// Step 2: Generate concise summary and fireship script in parallel
			const [conciseResponse, fireshipScriptResponse] = await Promise.all([
				concisePrompt.pipe(model).invoke({
					content: initialSummaryText
				}),
				fireshipScriptPrompt.pipe(model).invoke({
					content: initialSummaryText
				})
			]);

			// Set the concise summary
			let conciseSummaryText = conciseResponse.content.toString().trim();

			// Check if the concise summary exceeds 15 words
			if (countWords(conciseSummaryText) > 15) {
				console.log(
					`[summarizeHierarchy] Concise summary exceeds 15 words (${countWords(conciseSummaryText)} words). Retrying...`
				);

				// Try again with a stricter prompt
				const retryResponse = await concisePrompt.pipe(model).invoke({
					content: conciseSummaryText // Use the first attempt as input for the retry
				});

				conciseSummaryText = retryResponse.content.toString().trim();
				console.log(
					`[summarizeHierarchy] Retry generated concise summary: "${conciseSummaryText}"`
				);

				// If still over 15 words, truncate
				if (countWords(conciseSummaryText) > 15) {
					const words = conciseSummaryText.split(/\s+/);
					conciseSummaryText = words.slice(0, 15).join(' ') + '...';
					console.log(
						`[summarizeHierarchy] Truncated concise summary to 15 words: "${conciseSummaryText}"`
					);
				}
			}

			summary = [conciseSummaryText];
			console.log(
				`[summarizeHierarchy] Final concise summary (${countWords(conciseSummaryText)} words): "${summary[0]}"`
			);

			// Step 3: Convert fireship script to array of paragraphs
			const fireshipScript = fireshipScriptResponse.content.toString().trim();
			const scriptToArrayResponse = await scriptToArrayPrompt.pipe(model).invoke({
				format_instructions: formatInstructions,
				content: fireshipScript
			});

			// Parse the structured output using the parser
			try {
				const paragraphsArray = await paragraphsParser.parse(
					scriptToArrayResponse.content.toString().trim()
				);

				// The parser will ensure we get a proper array
				longSummary = paragraphsArray;
				console.log(
					`[summarizeHierarchy] Generated long summary with ${longSummary.length} paragraphs`
				);
			} catch (parseError) {
				// Fallback if parsing fails
				console.error(`[summarizeHierarchy] Error parsing structured output:`, parseError);

				// Create a simple array by splitting on paragraph breaks as fallback
				const simpleParagraphs = fireshipScript.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
				if (simpleParagraphs.length > 0) {
					longSummary = simpleParagraphs;
					console.log(
						`[summarizeHierarchy] Using fallback paragraph splitting with ${longSummary.length} paragraphs`
					);
				} else {
					// Last resort fallback
					longSummary = [fireshipScript];
					console.log(`[summarizeHierarchy] Using fireship script as single paragraph fallback`);
				}
			}

			console.log(`[summarizeHierarchy] Generated concise summary: "${summary[0]}"`);
			if (longSummary.length > 0) {
				console.log(`[summarizeHierarchy] Generated long summary first part: "${longSummary[0]}"`);
			}
		} catch (error) {
			console.error(`[summarizeHierarchy] Error generating summaries:`, error);
			summary = [allSummaries[0]];
			longSummary = [allSummaries[0]];
		}
	}

	// Transform children
	const transformedChildren: (SectionContainer | string)[] = [];

	// Process each child
	for (const child of section.children) {
		if (typeof child === 'string') {
			// If it's a string, add it directly
			transformedChildren.push(child);
		} else if (Array.isArray(child) && child.length > 0 && typeof child[0] === 'object') {
			// If it's a section container, transform it
			const transformed = await transformSectionContainer(
				child as SectionContainerWithDirectDefinition,
				model,
				initialSummaryPrompt,
				concisePrompt,
				fireshipScriptPrompt,
				scriptToArrayPrompt,

            );
			transformedChildren.push(transformed);
		}
	}

	// Create the new section
	return {
		heading: section.heading,
		children: transformedChildren,
		summary,
		longSummary
	};
}

/**
 * Collects all summaries from a section and its children recursively
 * @param section The section to collect summaries from
 * @returns Array of all summaries
 */
function collectAllSummaries(section: SectionWithDirectDefinition): string[] {
	// Start with the section's direct summaries
	const allSummaries: string[] = [...section.directSummary];

	// Recursively collect summaries from children
	for (const child of section.children) {
		if (Array.isArray(child) && child.length > 0 && typeof child[0] === 'object') {
			// This is a section container
			const childContainer = child as SectionContainerWithDirectDefinition;

			// Collect summaries from each section in the container
			for (const childSection of childContainer) {
				const childSummaries = collectAllSummaries(childSection);
				allSummaries.push(...childSummaries);
			}
		}
	}

	return allSummaries;
}
