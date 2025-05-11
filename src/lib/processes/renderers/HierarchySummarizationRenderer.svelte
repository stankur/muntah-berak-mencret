<script lang="ts">
	import { marked } from 'marked';
	import type {
		HierarchySummarizationResult,
		Section,
		SectionContainer
	} from '$lib/processes/subprocesses/summarizeHierarchy';

	export let input: HierarchySummarizationResult;

	/**
	 * Generates HTML content with collapsible sections that contain markdown
	 */
	function generateSections(container: SectionContainer): string {
		let html = '';

		for (const section of container) {
			html += generateSectionHTML(section, 1);
		}

		return html;
	}

	/**
	 * Generates HTML for a single section with collapsible details
	 */
	function generateSectionHTML(section: Section, level: number): string {
		const headingLevel = Math.min(level, 6);
		const sectionId = `section-${section.heading
			.join('-')
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '')}`;

		// Start details element
		let html = `<details class="section-details level-${level}">\n`;

		// Create summary with heading
		html += `<summary class="section-summary">\n`;
		html += `<span class="heading-${level}">${section.heading.join(' ')}</span>\n`;

		// Add summary if available
		if (section.summary && section.summary.length > 0) {
			html += `<span class="summary-box">${section.summary[0]}</span>\n`;
		}

		html += `</summary>\n`;

		// Process content
		let contentMarkdown = '';

		// Process children
		for (const child of section.children) {
			if (Array.isArray(child) && child.length > 0 && typeof child[0] === 'object') {
				// This is a section container - render as nested collapsible sections
				html += generateSections(child as SectionContainer);
			} else if (typeof child === 'string') {
				// This is a direct content string - add to markdown content
				contentMarkdown += `${child}\n\n`;
			}
		}

		// If we have markdown content, render it
		if (contentMarkdown) {
			html += `<div class="section-content">${marked(contentMarkdown)}</div>\n`;
		}

		// Close details element
		html += `</details>\n`;

		return html;
	}

	const sectionsHTML = generateSections(input.sectionContainer);
</script>

<div class="p-4">
	<h2 class="mb-4 text-xl font-bold">Hierarchy Summarization Result</h2>

	<div class="hierarchy-container">
		{@html sectionsHTML}
	</div>
</div>

<style>
	.hierarchy-container {
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			'Open Sans',
			'Helvetica Neue',
			sans-serif;
	}

	:global(.section-details) {
		margin-bottom: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.25rem;
		padding: 0.5rem;
	}

	:global(.section-summary) {
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	:global(.summary-box) {
		background-color: #e0f2fe;
		border-left: 4px solid #3b82f6;
		padding: 0.5rem;
		margin-top: 0.25rem;
		font-style: italic;
		font-size: 0.875rem;
	}

	:global(.heading-1) {
		font-size: 1.25rem;
		font-weight: bold;
	}

	:global(.heading-2) {
		font-size: 1.125rem;
		font-weight: bold;
	}

	:global(.heading-3, .heading-4, .heading-5, .heading-6) {
		font-size: 1rem;
		font-weight: bold;
	}

	:global(.section-content) {
		margin-top: 0.5rem;
		padding-left: 1rem;
	}

	:global(.level-2) {
		margin-left: 1rem;
	}

	:global(.level-3) {
		margin-left: 2rem;
	}

	:global(.level-4) {
		margin-left: 3rem;
	}

	:global(.level-5),
	:global(.level-6) {
		margin-left: 4rem;
	}
</style>
