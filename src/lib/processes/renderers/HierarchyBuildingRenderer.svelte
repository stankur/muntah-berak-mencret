<script lang="ts">
    import type { HierarchyBuildingResult } from '$lib/processes/implementations/hierarchy_building';
    import JSONTree from 'svelte-json-tree';

    export let input: HierarchyBuildingResult;
</script>

<div class="hierarchy-building-result">
    <h2>Hierarchy Building Result</h2>
    <div class="section-container">
        <JSONTree value={input.sectionContainer} />
    </div>
</div>

<style>
    .hierarchy-building-result {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 1rem 0;
    }

    h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

    .section-container {
        background-color: #f5f5f5;
        border-radius: 0.25rem;
        padding: 1rem;
        overflow: auto;
        max-height: 80vh;
    }

    :global(.svelte-json-tree) {
        --json-tree-font-family: monospace;
        --json-tree-label-color: #881391;
        --json-tree-value-color: #1a1aa6;
        --json-tree-string-color: #c41a16;
        --json-tree-number-color: #1c00cf;
        --json-tree-boolean-color: #1c00cf;
        --json-tree-null-color: #808080;
    }
</style>
