<script lang="ts">
  import { marked } from 'marked';
  
	let { input }: { input: string } = $props();
</script>

<div class="prose">
	{@html marked(input)}
</div>
