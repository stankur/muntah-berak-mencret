<script lang="ts">
	import type { SectionContainer as SectionContainerType } from '$lib/processes/subprocesses/summarizeHierarchy';
	import Section from './Section.svelte';

	export let sections: SectionContainerType;
	export let level: number = 1;
</script>

<div class="flex flex-col gap-2">
	{#each sections as section}
		<Section {section} {level} />
	{/each}
</div>
