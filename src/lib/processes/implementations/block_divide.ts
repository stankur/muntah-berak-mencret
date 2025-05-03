import type { Process } from '../types';
import { processRegistry } from '../registry';
import divideBlocks from '../subprocesses/divideBlocks';
import BlockListRenderer from '../renderers/BlockListRenderer.svelte';

export interface Block {
    content: string,
    meaningful: boolean
}

/**
 * Line numbering process - adds line numbers to each content block
 * Treats tables and lists as single blocks
 */
export const blockDividing: Process<Block[]> = {
	id: 'block-dividing',
	name: 'Block Dividing Process',
	description: 'Divides the content into blocks, and separate the blocks as meaningful or not',
	process: divideBlocks,
	// @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
	renderer: BlockListRenderer
};

// Register the process with the registry
processRegistry.register(blockDividing);
