import type { Block } from '../implementations/block_divide';
import {
	detectCodeBlock,
	detectTable,
	detectList,
	detectBlockQuote,
	meaningfulLine
} from './blockDetection';

export default (content: string) => {
	// Split content into lines
	const lines = content.split('\n');
	console.log(lines);

	// Initialize variables
	const result: Block[] = [];
	let inTable = false;
	let inList = false;
	let inCodeBlock = false;
	let inBlockQuote = false;
	let buffer: string[] = [];

	// Process each line
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		// Check for code blocks
		const codeBlockResult = detectCodeBlock(line, buffer, inCodeBlock);
		if (codeBlockResult.isBlock) {
			buffer = codeBlockResult.buffer;

			if (codeBlockResult.isComplete) {
				result.push({
					content: buffer.join('\n'),
					meaningful: true
				});
				buffer = [];
				inCodeBlock = false;
			} else {
				inCodeBlock = true;
			}
			continue;
		}

		// Check for tables
		const tableResult = detectTable(line, buffer, inTable);
		if (tableResult.isBlock) {
			console.log(line);
			console.log(tableResult);

			buffer = tableResult.buffer;

			if (tableResult.isComplete) {
				result.push({
					content: buffer.join('\n'),
					meaningful: true
				});
				buffer = [];
				inTable = false;
			} else {
				inTable = true;
			}
			continue;
		}

		// Check for lists
		const listResult = detectList(line, buffer, inList);
		if (listResult.isBlock) {
			buffer = listResult.buffer;

			if (listResult.isComplete) {
				result.push({
					content: buffer.join('\n'),
					meaningful: true
				});
				buffer = [];
				inList = false;
			} else {
				inList = true;
			}
			continue;
		}

		// Check for block quotes
		const blockQuoteResult = detectBlockQuote(line, buffer, inBlockQuote);
		if (blockQuoteResult.isBlock) {
			buffer = blockQuoteResult.buffer;

			if (blockQuoteResult.isComplete) {
				// Process the buffer with line numbers before adding to result
				result.push({
					content: buffer.join('\n'),
					meaningful: true
				});
				buffer = [];
				inBlockQuote = false;
			} else {
				inBlockQuote = true;
			}
			continue;
		}

		// If we were in a special block but this line doesn't match, add buffer to result and reset
		if (inTable || inList || inBlockQuote) {
			// Process the buffer with line numbers before adding to result
			result.push({
				content: buffer.join('\n'),
				meaningful: true
			});
			buffer = [];
			inTable = false;
			inList = false;
			inBlockQuote = false;
		}

		// Regular line (paragraph, header, etc.)
		// Only add line number if it should be numbered
		if (trimmedLine !== '') {
			result.push({
				content: line,
				meaningful: meaningfulLine(line)
			});
		}
	}

	// Add any remaining buffer content
	if (buffer.length > 0) {
		result.push({
			content: buffer.join('\n'),
			meaningful: meaningfulLine(buffer.join('\n'))
		});
	}

	return result;
};
