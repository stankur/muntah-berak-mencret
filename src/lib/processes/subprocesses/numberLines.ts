import {
	detectCodeBlock,
	detectTable,
	detectList,
	detectBlockQuote,
	shouldNumberLine
} from './blockDetection';

export default (content: string) => {
	try {
		// Split content into lines
		const lines = content.split('\n');
        console.log(lines)

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

		// Helper function to process a buffer with line numbers
		const processBufferWithLineNumbers = (buffer: string[]): string[] => {
			if (buffer.length === 0) return [];

			// Only number the first line of a block if it should be numbered
			if (shouldNumberLine(buffer[0])) {
				const numberedFirstLine = `${lineNumber++}: ${buffer[0]}`;
				return [numberedFirstLine, ...buffer.slice(1)];
			}

			return buffer;
		};

		// Process each line
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();

			// Check for code blocks
			const codeBlockResult = detectCodeBlock(line, buffer, inCodeBlock);
			if (codeBlockResult.isBlock) {
				buffer = codeBlockResult.buffer;

				if (codeBlockResult.isComplete) {
					// Process the buffer with line numbers before adding to result
					const processedBuffer = processBufferWithLineNumbers(buffer);
					result.push(...processedBuffer);
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
                console.log(line)
                console.log(tableResult);

				buffer = tableResult.buffer;

				if (tableResult.isComplete) {
					// Process the buffer with line numbers before adding to result
					const processedBuffer = processBufferWithLineNumbers(buffer);
					result.push(...processedBuffer);
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
					// Process the buffer with line numbers before adding to result
					const processedBuffer = processBufferWithLineNumbers(buffer);
					result.push(...processedBuffer);
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
					const processedBuffer = processBufferWithLineNumbers(buffer);
					result.push(...processedBuffer);
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
				const processedBuffer = processBufferWithLineNumbers(buffer);
				result.push(...processedBuffer);
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
			// Process the buffer with line numbers before adding to result
			const processedBuffer = processBufferWithLineNumbers(buffer);
			result.push(...processedBuffer);
		}

		// Join the result back into a string
		return result.join('\n');
	} catch (error: unknown) {
		console.error('Error in line numbering process:', error);
		// If there's an error, return the original content
		const errorMessage = error instanceof Error ? error.message : String(error);
		return `Error processing content: ${errorMessage}\n\nOriginal content:\n${content}`;
	}
};
