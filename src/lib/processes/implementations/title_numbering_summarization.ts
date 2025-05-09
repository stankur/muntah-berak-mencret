import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import numberTitles from '$lib/processes/subprocesses/numberTitles';
import TitleNumberingSummarizationRenderer from '$lib/processes/renderers/TitleNumberingSummarizationRenderer.svelte';
import type { Block } from '$lib/processes/implementations/block_divide';
import type { SummaryElement } from '$lib/processes/implementations/block_summarization';

// Extend the TitleElement interface to include numberedContent
export interface NumberedTitleElement {
  type: 'title';
  content: string;
  numberedContent: string; // New field for numbered title content
  confidence: 'high' | 'moderate';
  blockIndex: number;
}

export type NumberedBlockElement = NumberedTitleElement | SummaryElement;

export interface TitleNumberingSummarizationResult {
  elements: NumberedBlockElement[];
  originalBlocks: Block[];
}

/**
 * Title Numbering Summarization Process - divides content into blocks, identifies titles,
 * numbers them sequentially, and summarizes content between titles
 */
export const titleNumberingSummarizationProcess: AsyncProcess<TitleNumberingSummarizationResult> = {
  id: 'title-numbering-summarization',
  name: 'Title Numbering Summarization Process',
  description: 'Identifies titles, numbers them sequentially, and summarizes content between them',
  process: numberTitles,
  // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
  renderer: TitleNumberingSummarizationRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(titleNumberingSummarizationProcess);
