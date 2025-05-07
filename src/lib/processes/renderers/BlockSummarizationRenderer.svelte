<script lang="ts">
  import { marked } from 'marked';
  import type { BlockElement, TitleElement, SummaryElement, BlockSummarizationResult } from '$lib/processes/implementations/block_summarization';
  import type { Block } from '$lib/processes/implementations/block_divide';

  let { input }: { input: BlockSummarizationResult } = $props();
  type ViewMode = 'side-by-side' | 'summaries-only' | 'original-only';
  let viewMode = $state<ViewMode>('side-by-side');
  
  // Function to get the original content blocks for a range of blocks
  function getOriginalContentBlocks(from: number, to: number): string[] {
    // Get the original blocks from the input
    const { originalBlocks } = input;
    
    // Collect all blocks in the range as separate items
    const contentBlocks: string[] = [];
    for (let i = from; i <= to; i++) {
      if (i >= 0 && i < originalBlocks.length) {
        contentBlocks.push(originalBlocks[i].content);
      }
    }
    
    return contentBlocks;
  }
</script>

<div class="flex gap-4 mb-4">
  <button on:click={() => viewMode = 'side-by-side'} class={`cursor-pointer border p-4 ${viewMode === 'side-by-side' ? 'bg-blue-100' : ''}`}>
    Side by Side
  </button>
  <button on:click={() => viewMode = 'summaries-only'} class={`cursor-pointer border p-4 ${viewMode === 'summaries-only' ? 'bg-blue-100' : ''}`}>
    Summaries Only
  </button>
  <button on:click={() => viewMode = 'original-only'} class={`cursor-pointer border p-4 ${viewMode === 'original-only' ? 'bg-blue-100' : ''}`}>
    Original Only
  </button>
</div>

<div class="flex flex-col gap-4">
  {#each input.elements as element}
    {#if element.type === 'title'}
      <div 
        class={[
          'prose',
          'p-2',
          element.confidence === 'high' ? 'bg-green-100' : 'bg-yellow-100'
        ]}
      >
        {#if viewMode === 'side-by-side'}
          <div style="display: flex;">
            <div style="width: 50%;">
              {@html marked(element.content)}
            </div>
            <div style="width: 50%;">
              {@html marked(element.content)}
            </div>
          </div>
        {:else if viewMode === 'summaries-only' || viewMode === 'original-only'}
          <div>
            {@html marked(element.content)}
          </div>
        {/if}
      </div>
    {:else if element.type === 'summary'}
      <div class="prose p-2">
        {#if viewMode === 'side-by-side'}
          <div style="display: flex;">
            <div style="width: 50%;" class="flex flex-col gap-2">
              <!-- Find the original content for this summary's source blocks -->
              {#each getOriginalContentBlocks(element.sourceBlocks.from, element.sourceBlocks.to) as block}
                <div class="mb-2">
                  {@html marked(block)}
                </div>
              {/each}
            </div>
            <div style="width: 50%;">
              {@html marked(element.content)}
            </div>
          </div>
        {:else if viewMode === 'summaries-only'}
          <div>
            {@html marked(element.content)}
          </div>
        {:else if viewMode === 'original-only'}
          <div class="flex flex-col gap-2">
            {#each getOriginalContentBlocks(element.sourceBlocks.from, element.sourceBlocks.to) as block}
              <div class="mb-2">
                {@html marked(block)}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/each}
</div>
