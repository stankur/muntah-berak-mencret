import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import detectHierarchy from '$lib/processes/subprocesses/detectHierarchy';
import HierarchyDetectionRenderer from '$lib/processes/renderers/HierarchyDetectionRenderer.svelte';
import type { Block } from '$lib/processes/implementations/block_divide';
import type { BlockElement } from '$lib/processes/implementations/block_summarization';

// Title hierarchy schema as specified in requirements
export type TitleHierarchy = {
  content: number[]; // Array of numbers for consecutive titles
  children: TitleHierarchy[];
};

export interface HierarchyDetectionResult {
  input: BlockElement[]; // The input block elements
  titleHierarchy: TitleHierarchy[]; // The detected hierarchy structure
  asciiTree: string; // ASCII tree representation
  originalBlocks: Block[]; // The original blocks from divideBlocks
}

/**
 * Hierarchy Detection Process - detects the hierarchical structure of sections in the document
 * Builds on the title_numbering_summarization process to identify section/subsection relationships
 */
export const hierarchyDetectionProcess: AsyncProcess<HierarchyDetectionResult> = {
  id: 'hierarchy-detection',
  name: 'Hierarchy Detection Process',
  description: 'Detects the hierarchical structure of sections in the document',
  process: detectHierarchy,
  // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
  renderer: HierarchyDetectionRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(hierarchyDetectionProcess);
