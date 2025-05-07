import type { AsyncProcess } from '$lib/processes/types';
import { processRegistry } from '$lib/processes/registry';
import summarizeBlocks from '$lib/processes/subprocesses/summarizeBlocks';
import BlockSummarizationRenderer from '$lib/processes/renderers/BlockSummarizationRenderer.svelte';

export interface TitleElement {
  type: 'title';
  content: string;
  confidence: 'high' | 'moderate';
  blockIndex: number; // The index of the block containing this title
}

export interface SummaryElement {
  type: 'summary';
  content: string; // The summarized content
  sourceBlocks: {
    from: number;
    to: number;
  };
}

export type BlockElement = TitleElement | SummaryElement;

/**
 * Block Summarization Process - divides content into blocks, identifies titles,
 * and summarizes content between titles while tracking source block references
 */
export const blockSummarizationProcess: AsyncProcess<BlockElement[]> = {
	id: 'block-summarization',
	name: 'Block Summarization Process',
	description: 'Identifies titles and summarizes content between them with source block references',
	process: summarizeBlocks,
	// @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
	renderer: BlockSummarizationRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(blockSummarizationProcess);
