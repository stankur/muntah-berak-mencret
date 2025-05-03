<script lang="ts">
	import { marked } from 'marked';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import type { Block } from '../implementations/block_divide';

	let { input }: { input: Block[] } = $props();
</script>

<div class="flex flex-col gap-4">
	{#each input as block}
		<div class={['prose', block.meaningful && "bg-gray-100", "p-2"]}>
			{@html marked(block.content)}
		</div>
	{/each}
</div>
