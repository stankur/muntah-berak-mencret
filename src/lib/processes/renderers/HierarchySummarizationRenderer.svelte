<script lang="ts">
	import type {
		HierarchySummarizationResult
	} from '$lib/processes/subprocesses/summarizeHierarchy';
	import SectionContainer from './SectionContainer.svelte';

	export let input: HierarchySummarizationResult;
</script>

<div class="p-4">
	<h2 class="mb-4 text-xl font-bold">Hierarchy Summarization Result</h2>

	<div class="hierarchy-container">
		<SectionContainer sections={input.sectionContainer} />
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
</style>
