import type {
	HierarchyDetectionResult,
	TitleHierarchy
} from '$lib/processes/implementations/hierarchy_detection';
import type {
	NumberedBlockElement,
	NumberedTitleElement
} from '$lib/processes/implementations/title_numbering_summarization';
import type {
	HierarchyBuildingResult,
	SectionContainer,
	Section
} from '$lib/processes/implementations/hierarchy_building';
import detectHierarchy from '$lib/processes/subprocesses/detectHierarchy';
import type { Block } from '../implementations/block_divide';

/**
 * Extracts the title number from a numbered title element
 * @param element The numbered title element
 * @returns The title number
 */
function getTitleNumber(element: NumberedTitleElement): number {
	const match = element.numberedContent.match(/^T(\d+):/);
	return match ? parseInt(match[1]) : 0;
}

/**
 * Builds a hierarchical section structure from the hierarchy detection result
 * @param content The content to process
 * @returns The hierarchy building result
 */
export default async function buildHierarchy(content: string): Promise<HierarchyBuildingResult> {
	console.log(`[buildHierarchy] Starting process on content of length: ${content.length}`);

	// First run the hierarchy detection process
	const hierarchyResult: HierarchyDetectionResult = await detectHierarchy(content);

	console.log(
		`[buildHierarchy] Hierarchy detection complete. Found ${hierarchyResult.titleHierarchy.length} top-level sections`
	);

	// Extract the title elements from the input
	const titleElements = hierarchyResult.input.filter(
		(element): element is NumberedTitleElement => element.type === 'title'
	);

	// Create a map of title numbers to their content
	const titleContentMap = new Map<number, string>();
	for (const titleElement of titleElements) {
		titleContentMap.set(getTitleNumber(titleElement), titleElement.content);
	}

	// Process the title hierarchy recursively
	const sectionContainer = processTitleHierarchy(
		hierarchyResult.titleHierarchy,
		hierarchyResult.input,
		titleContentMap,
		hierarchyResult.originalBlocks
	);

	console.log(
		`[buildHierarchy] Process complete. Generated section container with ${sectionContainer.length} top-level sections`
	);

	return {
		sectionContainer,
		originalResult: hierarchyResult
	};
}

/**
 * Processes a title hierarchy array into a section container
 * @param hierarchy The title hierarchy array
 * @param elements The block elements
 * @param titleContentMap Map of title numbers to their content
 * @returns The section container
 */
function processTitleHierarchy(
	hierarchy: TitleHierarchy[],
	elements: NumberedBlockElement[],
	titleContentMap: Map<number, string>,
	originalBlocks: Block[]
): SectionContainer {
	const sections: Section[] = [];

	for (const node of hierarchy) {
		// Get the heading content for this node
		const heading = node.content.map(
			(titleNum) => titleContentMap.get(titleNum) || `Unknown Title ${titleNum}`
		);

		// Find direct summaries for this node
		const directSummary = findDirectSummaries(node, elements);

		// Process children
		const children = processChildren(node, elements, titleContentMap, originalBlocks);

		// Create the section
		sections.push({
			heading,
			children,
			directSummary
		});
	}

	return sections;
}

/**
 * Finds direct summaries for a title hierarchy node
 * @param node The title hierarchy node
 * @param elements The block elements
 * @returns Array of direct summary strings
 */
function findDirectSummaries(node: TitleHierarchy, elements: NumberedBlockElement[]): string[] {
	const directSummaries: string[] = [];

	// Get the last title number in this node's content
	const lastTitleNum = node.content[node.content.length - 1];

	// Find the index of this title in the elements array
	const titleIndex = elements.findIndex(
		(element) =>
			element.type === 'title' && getTitleNumber(element as NumberedTitleElement) === lastTitleNum
	);

	if (titleIndex === -1 || titleIndex >= elements.length - 1) {
		return directSummaries;
	}

	// Start looking at elements after this title
	let currentIndex = titleIndex + 1;

	// Collect summaries until we hit another title or run out of elements
	while (currentIndex < elements.length && elements[currentIndex].type === 'summary') {
		directSummaries.push(elements[currentIndex].content);
		currentIndex++;

		// If the next element is a title, stop collecting summaries
		if (currentIndex < elements.length && elements[currentIndex].type === 'title') {
			break;
		}
	}

	return directSummaries;
}

/**
 * Finds direct paragraphs for a title hierarchy node
 * @param node The title hierarchy node
 * @param elements The block elements
 * @param originalBlocks The original blocks from the hierarchy detection result
 * @returns Array of paragraph strings
 */
function findDirectParagraphs(
    node: TitleHierarchy,
    elements: NumberedBlockElement[],
    originalBlocks: Block[]
): string[] {
    const directParagraphs: string[] = [];
    
    // Get the last title number in this node's content
    const lastTitleNum = node.content[node.content.length - 1];
    
    // Find the index of this title in the elements array
    const titleIndex = elements.findIndex(
        element => element.type === 'title' && getTitleNumber(element as NumberedTitleElement) === lastTitleNum
    );
    
    if (titleIndex === -1 || titleIndex >= elements.length - 1) {
        return directParagraphs;
    }
    
    // Start looking at elements after this title
    let currentIndex = titleIndex + 1;
    
    // Process summaries until we hit another title or run out of elements
    while (
        currentIndex < elements.length && 
        elements[currentIndex].type === 'summary'
    ) {
        const summaryElement = elements[currentIndex];
        
        // Get the original blocks for this summary
        if ('sourceBlocks' in summaryElement) {
            const { from, to } = summaryElement.sourceBlocks;
            
            // Add the original blocks as paragraph strings
            for (let i = from; i <= to; i++) {
                if (i < originalBlocks.length) {
                    directParagraphs.push(originalBlocks[i].content);
                }
            }
        }
        
        currentIndex++;
        
        // If the next element is a title, stop processing
        if (
            currentIndex < elements.length && 
            elements[currentIndex].type === 'title'
        ) {
            break;
        }
    }
    
    return directParagraphs;
}

/**
 * Processes the children of a title hierarchy node
 * @param node The title hierarchy node
 * @param elements The block elements
 * @param titleContentMap Map of title numbers to their content
 * @returns Array of children (either strings or section containers)
 */
function processChildren(
    node: TitleHierarchy,
    elements: NumberedBlockElement[],
    titleContentMap: Map<number, string>,
    originalBlocks: Block[]
): (SectionContainer | string)[] {
	const children: (SectionContainer | string)[] = [];
	// Add direct paragraphs (strings) that belong to this section but not to subsections
	const directParagraphs = findDirectParagraphs(node, elements, originalBlocks);
	children.push(...directParagraphs);
    
	// If this node has child sections, process them recursively
	if (node.children.length > 0) {
		// Process each child node
		const childSections = processTitleHierarchy(node.children, elements, titleContentMap, originalBlocks);

		// Add the child sections as a section container
		if (childSections.length > 0) {
			children.push(childSections);
		}
	}

	return children;
}
