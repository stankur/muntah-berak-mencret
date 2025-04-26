<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';

	let title = $state<string>('');
	let content = $state<string>('');
	let titles = $state<string[]>([]);
	let selectedTitle = $state<string | null>(null);
	let selectedContent = $state<string>('');
	let isLoading =  $state<boolean>(false);

	// Fetch the list of titles when the page loads
	onMount(async () => {
		await loadTitles();
	});

	async function loadTitles() {
		try {
			const response = await fetch('/api/list');
			const data = await response.json();
			titles = data.titles || [];
		} catch (error) {
			console.error('Error loading titles:', error);
		}
	}

	async function handleSave() {
		if (!title.trim() || !content.trim()) {
			alert('Please provide both title and content');
			return;
		}

		try {
			const response = await fetch('/api/save', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ title, content })
			});

			const result = await response.json();

			if (result.success) {
				alert('File saved successfully!');
				// Refresh the list of titles
				await loadTitles();
				// Clear the form
				title = '';
				content = '';
			} else {
				alert(`Error: ${result.error}`);
			}
		} catch (error) {
			alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async function selectTitle(title: string) {
        if (selectedTitle === title) {
            selectedTitle = null;
            return;
        }
		isLoading = true;
		selectedTitle = title;

		try {
			const response = await fetch(`/api/content?title=${encodeURIComponent(title)}`);
			const data = await response.json();

			if (data.success) {
				selectedContent = data.content;
			} else {
				selectedContent = `Error loading content: ${data.error}`;
			}
		} catch (error) {
			selectedContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="p-4">
<!-- Titles List -->
<div class="mb-6">
	<h2 class="text-xl font-semibold mb-2">Saved Content</h2>
	{#if titles.length === 0}
		<p class="text-gray-500">No saved content yet</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each titles as title}
				<button 
					class="px-3 py-1 border rounded-md hover:bg-gray-100 {selectedTitle === title ? 'bg-blue-100 border-blue-400' : ''}"
					on:click={() => selectTitle(title)}
				>
					{title}
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Selected Content Display -->
{#if selectedTitle}
	<div class="mb-6 p-4 border rounded-md">
		<h2 class="text-xl font-semibold mb-2">{selectedTitle}</h2>
		{#if isLoading}
			<p>Loading...</p>
		{:else}
			<div class="prose">
				{@html marked(selectedContent)}
			</div>
		{/if}
	</div>
{/if}

<!-- Input Form -->
<div class="pt-4">
	<h2 class="text-xl font-semibold mb-2">New Content</h2>
	<div class="mb-4">
		<label for="title" class="block mb-1">Title:</label>
		<input id="title" type="text" bind:value={title} class="w-full p-2 border rounded-md" />
	</div>

	<div class="mb-4">
		<label for="content" class="block mb-1">Content:</label>
		<textarea id="content" bind:value={content} rows="10" class="w-full p-2 bdorer rounded-md"></textarea>
	</div>

	<button class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600" on:click={handleSave}>Save</button>
</div>
</div>
