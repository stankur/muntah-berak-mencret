<script lang="ts">
  import { marked } from 'marked';
  import type { CompressedBlock } from '../implementations/block_compression';

  let { input }: { input: CompressedBlock[] } = $props();
  let viewMode = $state('side-by-side'); // 'side-by-side', 'compressed-only', 'original-only'
</script>

<div class="flex gap-4">
  <button on:click={() => viewMode = 'side-by-side'} class="cursor-pointer border p-4">
    Side by Side
  </button>
  <button on:click={() => viewMode = 'compressed-only'} class="cursor-pointer border p-4">
    Compressed Only
  </button>
  <button on:click={() => viewMode = 'original-only'} class="cursor-pointer border p-4">
    Original Only
  </button>
</div>

<div class="flex flex-col gap-4">
  {#each input as block}
    <div 
      class={[
        'prose',
        'p-2',
        block.titleConfidence === 'high' && 'bg-green-100',
        block.titleConfidence === 'moderate' && 'bg-yellow-100'
      ]}
    >
      {#if viewMode === 'side-by-side'}
        <div style="display: flex;">
          <div style="width: 50%;">
            {@html marked(block.originalContent)}
          </div>
          <div style="width: 50%;">
            {#if block.compressedContent !== null}
              {@html marked(block.compressedContent)}
            {:else}
              {@html marked(block.originalContent)}
            {/if}
          </div>
        </div>
      {:else if viewMode === 'compressed-only'}
        <div>
          {#if block.compressedContent !== null}
            {@html marked(block.compressedContent)}
          {:else}
            {@html marked(block.originalContent)}
          {/if}
        </div>
      {:else}
        <div>
          {@html marked(block.originalContent)}
        </div>
      {/if}
    </div>
  {/each}
</div>
