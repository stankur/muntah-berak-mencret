import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import summarizeHierarchy from '$lib/processes/subprocesses/summarizeHierarchy';
import HierarchySummarizationRenderer from '$lib/processes/renderers/HierarchySummarizationRenderer.svelte';
import type { 
  HierarchySummarizationResult 
} from '$lib/processes/subprocesses/summarizeHierarchy';

/**
 * Hierarchy Summarization Process - builds a hierarchical section structure with recursive summaries
 * This process takes the output of the hierarchy building process and converts it to a format with
 * concise summaries that incorporate both direct summaries and summaries from child sections
 */
export const hierarchySummarizationProcess: AsyncProcess<HierarchySummarizationResult> = {
  id: 'hierarchy-summarization',
  name: 'Hierarchy Summarization Process',
  description: 'Builds a hierarchical section structure with recursive summaries from the hierarchy building result',
  process: summarizeHierarchy,
  // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
  renderer: HierarchySummarizationRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(hierarchySummarizationProcess);
