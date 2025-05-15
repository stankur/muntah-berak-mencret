<script lang="ts">
	import type { ImageGenerationResult } from '$lib/processes/subprocesses/generateImages';
	import SectionContainer from './SectionContainer.svelte';

	export let input: ImageGenerationResult;
</script>

<div class="p-4">
	<h2 class="mb-4 text-xl font-bold">Image Generation Result</h2>

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
