import type { Process } from '../types';
import { processRegistry } from '../registry';
import MarkdownRenderer from '../components/MarkdownRenderer.svelte';

/**
 * Line numbering process - adds line numbers to each content block
 * Treats tables and lists as single blocks
 */
export const lineNumberingProcess: Process<string> = {
	id: 'line-numbering',
	name: 'Line Numbering Process',
	description: 'Adds line numbers to each content block, treating tables and lists as single blocks',
	process: (content: string) => {
		try {
			// Split content into lines
			const lines = content.split('\n');
			
			// Initialize variables
			const result: string[] = [];
			let lineNumber = 1;
			let inTable = false;
			let inList = false;
			let inCodeBlock = false;
			let inBlockQuote = false;
			let buffer: string[] = [];
			
			// Helper function to ensure line numbers start on a new line
			const ensureNewLine = (): void => {
				if (result.length > 0 && result[result.length - 1] !== '') {
					result.push('');
				}
			};
			
			// Helper function to check if a line should be numbered
			const shouldNumberLine = (line: string): boolean => {
				const trimmed = line.trim();
				// Don't number empty lines or lines with just whitespace
				if (trimmed === '') return false;
				
				// Don't number lines that are just figure captions, table captions, or similar
				if (trimmed.startsWith('Figure ') || trimmed.startsWith('Table ')) return false;
				
				// Don't number image links
				if (trimmed.startsWith('![') && trimmed.includes('](')) return false;
				
				// Don't number horizontal rules
				if (trimmed === '---' || trimmed === '***' || trimmed === '___') return false;
								
				return true;
			};
			
			// Process each line
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const trimmedLine = line.trim();
				
				// Skip empty lines but add them to the result
				if (trimmedLine === '') {
					// If we were in a special block, add the buffer to the result and reset
					if (buffer.length > 0) {
						result.push(...buffer);
						buffer = [];
					}
					
					result.push('');
					inTable = false;
					inList = false;
					inBlockQuote = false;
					continue;
				}
				
				// Check for code block markers
				if (trimmedLine.startsWith('```')) {
					if (!inCodeBlock) {
						// Start of code block
						inCodeBlock = true;
						// Only add line number if it should be numbered
						if (trimmedLine.length > 3 && shouldNumberLine(line)) {
							ensureNewLine();
							buffer = [`${lineNumber++}: ${line}`];
						} else {
							buffer = [line];
						}
					} else {
						// End of code block
						buffer.push(line);
						result.push(...buffer);
						buffer = [];
						inCodeBlock = false;
					}
					continue;
				}
				
				// If we're in a code block, add to buffer
				if (inCodeBlock) {
					buffer.push(line);
					continue;
				}
				
				// Check for table markers
				if (line.includes('|') && (line.trim().startsWith('|') || line.includes('|--'))) {
					if (!inTable && !inList && !inBlockQuote) {
						// Start of table
						inTable = true;
						ensureNewLine();
						if (shouldNumberLine(line)) {
							buffer = [`${lineNumber++}: ${line}`];
						} else {
							buffer = [line];
						}
					} else if (inTable) {
						// Continue table
						buffer.push(line);
					} else {
						// Not in a table but in another block
						buffer.push(line);
					}
					continue;
				}
				
				// Check for list markers
				if ((trimmedLine.startsWith('- ') || 
					 trimmedLine.startsWith('* ') || 
					 trimmedLine.startsWith('+ ') ||
					 /^\d+\.\s/.test(trimmedLine)) && 
					!inTable && !inCodeBlock && !inBlockQuote) {
					if (!inList) {
						// Start of list
						inList = true;
						ensureNewLine();
						if (shouldNumberLine(line)) {
							buffer = [`${lineNumber++}: ${line}`];
						} else {
							buffer = [line];
						}
					} else {
						// Continue list
						buffer.push(line);
					}
					continue;
				}
				
				// Check for indented lines that might be part of a list
				if (inList && (line.startsWith('  ') || line.startsWith('\t'))) {
					buffer.push(line);
					continue;
				}
				
				// Check for blockquote markers
				if (trimmedLine.startsWith('> ') && !inTable && !inList && !inCodeBlock) {
					if (!inBlockQuote) {
						// Start of blockquote
						inBlockQuote = true;
						ensureNewLine();
						if (shouldNumberLine(line)) {
							buffer = [`${lineNumber++}: ${line}`];
						} else {
							buffer = [line];
						}
					} else {
						// Continue blockquote
						buffer.push(line);
					}
					continue;
				}
				
				// If we were in a special block but this line doesn't match, add buffer to result and reset
				if (inTable || inList || inBlockQuote) {
					result.push(...buffer);
					buffer = [];
					inTable = false;
					inList = false;
					inBlockQuote = false;
				}
				
				// Regular line (paragraph, header, etc.)
				// Only add line number if it should be numbered
				if (trimmedLine !== '') {
					ensureNewLine();
					if (shouldNumberLine(line)) {
						result.push(`${lineNumber++}: ${line}`);
					} else {
						result.push(line);
					}
				} else {
					result.push(line);
				}
			}
			
			// Add any remaining buffer content
			if (buffer.length > 0) {
				result.push(...buffer);
			}
			
			// Join the result back into a string
			return result.join('\n');
		} catch (error: unknown) {
			console.error('Error in line numbering process:', error);
			// If there's an error, return the original content
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `Error processing content: ${errorMessage}\n\nOriginal content:\n${content}`;
		}
	},
	// @ts-expect-error - The renderer type is compatible but TypeScript is having trouble with it
	renderer: MarkdownRenderer
};

// Register the process with the registry
processRegistry.register(lineNumberingProcess);
