<script lang="ts">
  import { marked } from 'marked';
  import type { TitleDetectionResult } from '$lib/processes/implementations/title_detection';

  let { input }: { input: TitleDetectionResult } = $props();
  let showReasons = $state(false);
</script>

<button on:click={() => showReasons = !showReasons}>
  {showReasons ? 'Hide' : 'Show'} Reasons
</button>

{#if showReasons}
  <div>
    <div>High Confidence: {input.highConfidence.reason}</div>
    <div>Moderate Confidence: {input.moderateConfidence.reason}</div>
  </div>
{/if}

<div class="flex flex-col gap-4">
  {#each input.blocks as block, index}
    <div class={['prose', input.highConfidence.lines.includes(index) && "bg-green-100", input.moderateConfidence.lines.includes(index) && "bg-yellow-100", "p-2"]}>
      {@html marked(block)}
    </div>
  {/each}
</div>
