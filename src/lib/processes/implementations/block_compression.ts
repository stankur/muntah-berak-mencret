import type { AsyncProcess } from '../types';
import { processRegistry } from '../registry';
import compressBlocks from '$lib/processes/subprocesses/compressBlocks';
import BlockCompressionRenderer from '../renderers/BlockCompressionRenderer.svelte';

export interface CompressedBlock {
  originalContent: string;
  compressedContent: string | null; // null if not compressed
  isTitle: boolean; // from title detection
  titleConfidence: 'high' | 'moderate' | 'none'; // from title detection
}

/**
 * Block Compression Process - divides content into blocks, runs title detection,
 * and summarizes meaningful blocks to ~10 words while preserving original structure
 */
export const blockCompressionProcess: AsyncProcess<CompressedBlock[]> = {
  id: 'block-compression',
  name: 'Block Compression Process',
  description: 'Divides content into blocks, detects titles, and summarizes meaningful blocks to ~10 words',
  process: compressBlocks,
  // @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
  renderer: BlockCompressionRenderer
};

// Register the process with the registry using registerAsync
processRegistry.registerAsync(blockCompressionProcess);
