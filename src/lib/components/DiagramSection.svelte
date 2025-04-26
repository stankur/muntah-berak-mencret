<script lang="ts">
  import { onMount } from 'svelte';
  import mermaid from 'mermaid';
  
  let isExpanded = $state(false);
  let diagramElement: HTMLElement;
  
  function toggleExpand() {
    isExpanded = !isExpanded;
    // Re-render mermaid diagram when expanding
    if (isExpanded) {
      setTimeout(() => {
        mermaid.init(undefined, diagramElement);
      }, 0);
    }
  }
  
  onMount(() => {
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'neutral',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    });
    mermaid.init(undefined, diagramElement);
  });
</script>

<div class="mb-6 border rounded-md overflow-hidden">
  <div class="flex justify-between items-center p-3 bg-gray-50 cursor-pointer" on:click={toggleExpand}>
    <h2 class="text-xl font-semibold">Content Processing Experimentation Tool</h2>
    <button class="text-gray-500">
      {isExpanded ? '▼' : '►'}
    </button>
  </div>
  
  {#if isExpanded}
    <div class="p-4">
      <div class="text-xs text-gray-500 mb-4">
        This diagram illustrates the core workflow of the application: Content is processed by a Process Function, 
        which produces Output Data that is then visualized by a Renderer to create the Display.
      </div>
      
      <div class="mermaid" bind:this={diagramElement}>
        flowchart TD
          subgraph Content["Content"]
            C[Markdown Text]
          end
          
          C --> Process
          
          subgraph Process["Process"]
            direction LR
            ProcessFn[Process Function] --> Output[(Output Data)]
            Output --> Renderer[Renderer]
          end
          
          Process --> Result
          
          subgraph Result["Result"]
            D>Display]
          end
      </div>
    </div>
  {/if}
</div>
