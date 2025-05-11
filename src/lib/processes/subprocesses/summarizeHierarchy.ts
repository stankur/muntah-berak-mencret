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
}

export interface HierarchySummarizationResult {
  sectionContainer: SectionContainer;
  originalResult: HierarchyBuildingResult;
}

/**
 * Summarizes a hierarchy by recursively collecting and processing summaries
 * @param content The content to process
 * @returns The hierarchy summarization result
 */
export default async function summarizeHierarchy(content: string): Promise<HierarchySummarizationResult> {
  console.log(`[summarizeHierarchy] Starting process on content of length: ${content.length}`);

  // First run the hierarchy building process
  const hierarchyResult: HierarchyBuildingResult = await buildHierarchy(content);

  console.log(
    `[summarizeHierarchy] Hierarchy building complete. Found ${hierarchyResult.sectionContainer.length} top-level sections`
  );

  // Set up LLM with OpenRouter
  const model = new ChatOpenAI({
    modelName: 'openai/gpt-4.1',
    temperature: 0.1,
    openAIApiKey: PUBLIC_OPENROUTER_API_KEY,
    configuration: {
      baseURL: PUBLIC_OPENROUTER_API_URL
    }
  });

  // Create prompt template for summarization
  const promptTemplate = `
  Rewrite the following to be at max 15 words, and make it a good hook, while rewriting/paraphrasing inside, and not just describing what we could find inside, output the answer and nothing else:

  {content}
  `;

  const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

  // Process the section container recursively
  const sectionContainer = await transformSectionContainer(
    hierarchyResult.sectionContainer,
    model,
    prompt
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
 */
async function transformSectionContainer(
  container: SectionContainerWithDirectDefinition,
  model: ChatOpenAI,
  prompt: ChatPromptTemplate
): Promise<SectionContainer> {
  const result: SectionContainer = [];
  
  for (const section of container) {
    // Transform this section
    const transformedSection = await transformSection(section, model, prompt);
    result.push(transformedSection);
  }
  
  return result;
}

/**
 * Transforms a single section from the hierarchy building result to the new format
 */
async function transformSection(
  section: SectionWithDirectDefinition,
  model: ChatOpenAI,
  prompt: ChatPromptTemplate
): Promise<Section> {
  // First, collect all summaries from this section and its children
  const allSummaries = collectAllSummaries(section);
  
  // Generate the concise summary using the LLM
  let summary: string[] = [];
  
  if (allSummaries.length > 0) {
    // Concatenate all summaries
    const concatenatedSummaries = allSummaries.join(' ');
    
    try {
      console.log(`[summarizeHierarchy] Generating concise summary for section "${section.heading.join(' ')}"`);
      
      const response = await prompt.pipe(model).invoke({
        content: concatenatedSummaries
      });
      
      summary = [response.content.toString().trim()];
      
      console.log(`[summarizeHierarchy] Generated summary: "${summary[0]}"`);
    } catch (error) {
      console.error(`[summarizeHierarchy] Error generating summary:`, error);
      summary = [allSummaries[0]];
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
        prompt
      );
      transformedChildren.push(transformed);
    }
  }
  
  // Create the new section
  return {
    heading: section.heading,
    children: transformedChildren,
    summary
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
