<script lang="ts">
	import { marked } from 'marked';
	import type { Section } from '$lib/processes/subprocesses/summarizeHierarchy';
	import SectionContainerComponent from './SectionContainer.svelte';

	export let section: Section;
	export let level: number = 1;
</script>

<details class="mb-2 rounded border border-slate-200 p-2">
	<summary class="flex cursor-pointer flex-col gap-2 p-2">
		{#each section.heading as headingPart}
			{@html marked(headingPart)}
		{/each}

		{#if section.summary && section.summary.length > 0}
			<div class="mt-1 border-l-4 border-blue-500 bg-blue-50 p-2 text-sm italic">
				{section.summary[0]}
			</div>
		{/if}
		
		{#if section.longSummary && section.longSummary.length > 0}
			<div class="mt-1 border-l-4 border-green-500 bg-green-50 p-2 text-sm">
				{#each section.longSummary as paragraph}
					<p class="mb-2 last:mb-0">{paragraph}</p>
				{/each}
			</div>
		{/if}
		
		{#if 'imageUrl' in section && section.imageUrl}
			<div class="mt-1 flex justify-center">
				<img src={section.imageUrl} alt="Section visualization" class="w-16 h-16 rounded object-cover" />
			</div>
		{/if}
	</summary>

	<div class="flex flex-col gap-4">
		{#each section.children as child}
			{#if Array.isArray(child) && child.length > 0 && typeof child[0] === 'object'}
				<!-- This is a section container - render as nested collapsible sections -->
				<SectionContainerComponent sections={child} level={level + 1} />
			{:else if typeof child === 'string'}
				<!-- This is a direct content string - render as markdown -->
				<div class="mt-2 pl-4">
					{@html marked(child)}
				</div>
			{/if}
		{/each}
	</div>
</details>
