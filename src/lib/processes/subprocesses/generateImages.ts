import summarizeHierarchy from '$lib/processes/subprocesses/summarizeHierarchy';
import { escapeCurlyBraces } from '$lib/processes/subprocesses/detectHierarchy';
import type {
	HierarchySummarizationResult,
	Section,
	SectionContainer
} from '$lib/processes/subprocesses/summarizeHierarchy';

// Define the new types for the image generation process
export interface SectionWithImage extends Section {
	imageUrl: string;
}

export type SectionContainerWithImages = SectionWithImage[];

export interface ImageGenerationResult {
	sectionContainer: SectionContainerWithImages;
	originalResult: HierarchySummarizationResult;
}

/**
 * Generates images for each section in the hierarchy
 * @param content The markdown content to process
 * @returns The image generation result
 */
export default async function generateImages(content: string): Promise<ImageGenerationResult> {
	console.log(`[generateImages] Starting process on content of length: ${content.length}`);

	// First run the hierarchy summarization process
	const hierarchyResult = await summarizeHierarchy(content);

	console.log(
		`[generateImages] Hierarchy summarization complete. Found ${hierarchyResult.sectionContainer.length} top-level sections`
	);

	// Process the section container recursively
	const sectionContainer = await transformSectionContainer(hierarchyResult.sectionContainer);

	console.log(
		`[generateImages] Process complete. Generated section container with ${sectionContainer.length} top-level sections with images`
	);

	return {
		sectionContainer,
		originalResult: hierarchyResult
	};
}

/**
 * Transforms a section container by adding images to each section
 */
async function transformSectionContainer(
	container: SectionContainer
): Promise<SectionContainerWithImages> {
	console.log(`[generateImages] Transforming ${container.length} sections in parallel`);
	
	// Process all sections in parallel
	const transformedSections = await Promise.all(
		container.map(section => transformSection(section))
	);
	
	return transformedSections;
}

/**
 * Transforms a single section by adding an image
 */
async function transformSection(section: Section): Promise<SectionWithImage> {
	// Create a copy of the section
	const newSection: SectionWithImage = {
		...section,
		imageUrl: '' // Will be populated later
	};

	// Generate an image for this section if it has a longSummary
	if (section.longSummary && section.longSummary.length > 0) {
		try {
			console.log(`[generateImages] Generating image for section "${section.heading.join(' ')}"`);

			// Join all paragraphs with spaces for image generation
			const fullSummary = section.longSummary.join(' ');
			
			// Call our API endpoint to generate the image
			const response = await fetch('/api/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					summary: escapeCurlyBraces(fullSummary)
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`API error: ${errorData.error || response.statusText}`);
			}

			const data = await response.json();
			console.log('Generated image URL:', data.imageUrl);

			// Update the section with the image URL
			newSection.imageUrl = data.imageUrl;
		} catch (error) {
			console.error(`[generateImages] Error generating image:`, error);
			newSection.imageUrl = ''; // Set to empty string if there was an error
		}
	}

	// Transform children recursively
	const transformedChildren: (SectionContainerWithImages | string)[] = [];

	// Process each child
	for (const child of section.children) {
		if (typeof child === 'string') {
			// If it's a string, add it directly
			transformedChildren.push(child);
		} else if (Array.isArray(child)) {
			// If it's a section container, transform it
			const transformed = await transformSectionContainer(child);
			transformedChildren.push(transformed);
		}
	}

	// Update the children
	newSection.children = transformedChildren;

	return newSection;
}
