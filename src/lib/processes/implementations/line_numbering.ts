import type { Process } from '../types';
import { processRegistry } from '../registry';
import MarkdownRenderer from '../renderers/MarkdownRenderer.svelte';
import numberLines from '../subprocesses/numberLines';

/**
 * Line numbering process - adds line numbers to each content block
 * Treats tables and lists as single blocks
 */
export const lineNumberingProcess: Process<string> = {
	id: 'line-numbering',
	name: 'Line Numbering Process',
	description: 'Adds line numbers to each content block, treating tables and lists as single blocks',
	process: numberLines,
	// @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
	renderer: MarkdownRenderer
};

// Register the process with the registry
processRegistry.register(lineNumberingProcess);
