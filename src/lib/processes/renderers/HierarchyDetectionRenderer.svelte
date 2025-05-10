<script lang="ts">
	import type { HierarchyDetectionResult } from '$lib/processes/implementations/hierarchy_detection';

	export let input: HierarchyDetectionResult;

	// Function to format the JSON structure for display
	function formatJSON(json: any): string {
		return JSON.stringify(json, null, 2);
	}
</script>

<div class="hierarchy-detection-result">
	<h2>Hierarchy Detection Result</h2>

	<div class="result-section">
		<h3>ASCII Tree Representation</h3>
		<pre class="ascii-tree">{input.asciiTree}</pre>
	</div>

	<div class="result-section">
		<h3>JSON Structure</h3>
		<pre class="json-structure">{formatJSON(input.titleHierarchy)}</pre>
	</div>

	<div class="result-section">
		<h3>Original Blocks</h3>
		<div class="blocks-container">
			{#each input.originalBlocks as block, index}
				<div class="block">
					<div class="block-header">Block {index}</div>
					<div class="block-content">{block.content}</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.hierarchy-detection-result {
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
		max-width: 100%;
		margin: 0 auto;
		padding: 1rem;
	}

	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: #333;
	}

	h3 {
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
		color: #555;
	}

	.result-section {
		margin-bottom: 2rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 1rem;
		background-color: #f9f9f9;
	}

	pre {
		background-color: #f5f5f5;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		font-family: 'Courier New', Courier, monospace;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.ascii-tree {
		font-family: 'Courier New', Courier, monospace;
	}

	.blocks-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.block {
		border: 1px solid #ddd;
		border-radius: 4px;
		overflow: hidden;
	}

	.block-header {
		background-color: #eee;
		padding: 0.5rem;
		font-weight: bold;
		border-bottom: 1px solid #ddd;
	}

	.block-content {
		padding: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		white-space: pre-wrap;
		font-family: 'Courier New', Courier, monospace;
		font-size: 0.8rem;
	}
</style>
