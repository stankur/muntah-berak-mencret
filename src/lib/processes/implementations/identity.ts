import type { Process } from '../types';
import { processRegistry } from '../registry';
import MarkdownRenderer from '../renderers/MarkdownRenderer.svelte';

/**
 * Identity renderer - a Svelte component that renders markdown content
 * This is defined for future use but not used in the current implementation
 */

/**
 * Identity process - returns the content unchanged
 * This is the simplest process that serves as a baseline
 */
export const identityProcess: Process<string> = {
	id: 'identity',
	name: 'Identity Process',
	description: 'Keeps the content as-is without any transformation',
	process: (content: string) => {
		console.log(
			'Identity process executed with content:',
			content.substring(0, 50) + (content.length > 50 ? '...' : '')
		);
		return content;
	},
	// @ts-expect-error - Temporarily disable type checking for next line
	renderer: MarkdownRenderer
};

// Register the process with the registry
processRegistry.register(identityProcess);
