import { ChatOpenAI } from '@langchain/openai';
import { PUBLIC_OPENROUTER_API_KEY, PUBLIC_OPENROUTER_API_URL } from '$env/static/public';
import { ChatPromptTemplate } from '@langchain/core/prompts';
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
	const concisePromptTemplate = `
  Rewrite the following to be at max 15 words, and make it a good hook, while rewriting/paraphrasing inside, and not just describing what we could find inside, output the answer and nothing else:

  {content}
  `;

	const longSummaryPromptTemplate = `
  Summarize the following to be concise into a single paragraph, at most 100 words. Use the source words as much as possible. Keep the most important points, and maintain the tone and personality of the writer. Write directly to the user without meta-comments or acknowledgments. Do not include footnotes, references, appendices, or other non-main content in the summary.

  {content}
  `;
	
	const rewritePromptTemplate = `
  Rewrite the following summary to be less than 100 words total while preserving the key information. Keep the most important points, and maintain the tone and personality of the writer. Write directly to the user without meta-comments or acknowledgments.

  {summary}
  `;

	const concisePrompt = ChatPromptTemplate.fromTemplate(concisePromptTemplate);
	const longSummaryPrompt = ChatPromptTemplate.fromTemplate(longSummaryPromptTemplate);
	const rewritePrompt = ChatPromptTemplate.fromTemplate(rewritePromptTemplate);

	// Process the section container recursively
	const sectionContainer = await transformSectionContainer(
		hierarchyResult.sectionContainer,
		model,
		concisePrompt,
		longSummaryPrompt,
		rewritePrompt
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
	concisePrompt: ChatPromptTemplate,
	longSummaryPrompt: ChatPromptTemplate,
	rewritePrompt: ChatPromptTemplate
): Promise<SectionContainer> {
	console.log(`[summarizeHierarchy] Processing ${container.length} sections in parallel`);
	
	// Process all sections in parallel
	const transformPromises = container.map(section => 
		transformSection(section, model, concisePrompt, longSummaryPrompt, rewritePrompt)
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
	concisePrompt: ChatPromptTemplate,
	longSummaryPrompt: ChatPromptTemplate,
	rewritePrompt: ChatPromptTemplate
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

			// Generate both summaries in parallel for efficiency
			const [conciseResponse, longResponse] = await Promise.all([
				concisePrompt.pipe(model).invoke({
					content: concatenatedSummaries
				}),
				longSummaryPrompt.pipe(model).invoke({
					content: concatenatedSummaries
				})
			]);

			summary = [conciseResponse.content.toString().trim()];
			let longSummaryText = longResponse.content.toString().trim();
			
			// Check if the long summary exceeds 100 words
			if (countWords(longSummaryText) > 100) {
				console.log(`[summarizeHierarchy] Long summary exceeds 100 words (${countWords(longSummaryText)} words). Rewriting...`);
				
				// Rewrite to be less than 100 words
				const rewriteResponse = await rewritePrompt.pipe(model).invoke({
					summary: longSummaryText
				});
				
				longSummaryText = rewriteResponse.content.toString().trim();
				console.log(`[summarizeHierarchy] Rewritten summary word count: ${countWords(longSummaryText)} words`);
			}
			
			longSummary = [longSummaryText];

			console.log(`[summarizeHierarchy] Generated concise summary: "${summary[0]}"`);
			console.log(`[summarizeHierarchy] Generated long summary: "${longSummary[0]}"`);
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
				concisePrompt,
				longSummaryPrompt,
				rewritePrompt
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