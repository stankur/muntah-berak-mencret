// Interface for block detection results
export interface BlockDetectionResult {
	isBlock: boolean; // Whether this is a block of the specified type
	isComplete: boolean; // Whether the block is complete
	buffer: string[]; // The updated buffer with the processed line
}

/**
 * Helper function to check if a line should be numbered
 * This is kept here for reuse in other modules
 */
export function shouldNumberLine(line: string): boolean {
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
}

/**
 * Detects if a line is part of a code block
 */
export function detectCodeBlock(
	line: string,
	buffer: string[] = [],
	inCodeBlock: boolean = false
): BlockDetectionResult {
	const trimmedLine = line.trim();

	// Check for code block markers
	if (trimmedLine.startsWith('```')) {
		if (!inCodeBlock) {
			// Start of code block
			return {
				isBlock: true,
				isComplete: false,
				buffer: [line]
			};
		} else {
			// End of code block
			buffer.push(line);

			return {
				isBlock: true,
				isComplete: true,
				buffer
			};
		}
	}

	// If we're in a code block, add to buffer
	if (inCodeBlock) {
		buffer.push(line);

		return {
			isBlock: true,
			isComplete: false,
			buffer
		};
	}

	// Not a code block
	return {
		isBlock: false,
		isComplete: false,
		buffer
	};
}

/**
 * Detects if a line is part of a table
 */
export function detectTable(
	line: string,
	buffer: string[] = [],
	inTable: boolean = false
): BlockDetectionResult {
	// Check for table markers
	if (line.includes('|') && (line.trim().startsWith('|') || line.includes('|--'))) {
		if (!inTable) {
			// Start of table
			return {
				isBlock: true,
				isComplete: false,
				buffer: [line]
			};
		} else {
			// Continue table
			buffer.push(line);

			return {
				isBlock: true,
				isComplete: false,
				buffer
			};
		}
	}

	// If we're in a table but this line doesn't match, the table is complete
	if (inTable) {
		return {
			isBlock: true,
			isComplete: true,
			buffer
		};
	}

	// Not a table
	return {
		isBlock: false,
		isComplete: false,
		buffer
	};
}

/**
 * Detects if a line is part of a list
 */
export function detectList(
	line: string,
	buffer: string[] = [],
	inList: boolean = false
): BlockDetectionResult {
	const trimmedLine = line.trim();

	// Check for list markers
	if (
		trimmedLine.startsWith('- ') ||
		trimmedLine.startsWith('* ') ||
		trimmedLine.startsWith('+ ') ||
		/^\d+\.\s/.test(trimmedLine)
	) {
		if (!inList) {
			// Start of list
			return {
				isBlock: true,
				isComplete: false,
				buffer: [line]
			};
		} else {
			// Continue list
			buffer.push(line);

			return {
				isBlock: true,
				isComplete: false,
				buffer
			};
		}
	}

	// Check for indented lines that might be part of a list
	if (inList && (line.startsWith('  ') || line.startsWith('\t'))) {
		buffer.push(line);

		return {
			isBlock: true,
			isComplete: false,
			buffer
		};
	}

	// If we're in a list but this line doesn't match, the list is complete
	if (inList) {
		return {
			isBlock: true,
			isComplete: true,
			buffer
		};
	}

	// Not a list
	return {
		isBlock: false,
		isComplete: false,
		buffer
	};
}

/**
 * Detects if a line is part of a block quote
 */
export function detectBlockQuote(
	line: string,
	buffer: string[] = [],
	inBlockQuote: boolean = false
): BlockDetectionResult {
	const trimmedLine = line.trim();

	// Check for blockquote markers
	if (trimmedLine.startsWith('> ')) {
		if (!inBlockQuote) {
			// Start of blockquote
			return {
				isBlock: true,
				isComplete: false,
				buffer: [line]
			};
		} else {
			// Continue blockquote
			buffer.push(line);

			return {
				isBlock: true,
				isComplete: false,
				buffer
			};
		}
	}

	// If we're in a blockquote but this line doesn't match, the blockquote is complete
	if (inBlockQuote) {
		return {
			isBlock: true,
			isComplete: true,
			buffer
		};
	}

	// Not a blockquote
	return {
		isBlock: false,
		isComplete: false,
		buffer
	};
}
