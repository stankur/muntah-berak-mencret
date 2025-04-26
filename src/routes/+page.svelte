<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import { processRegistry, type Process } from '$lib/processes';
	import DiagramSection from '$lib/components/DiagramSection.svelte';

	let title = $state<string>('');
	let content = $state<string>('');
	let titles = $state<string[]>([]);
	let selectedTitle = $state<string | null>(null);
	let selectedContent = $state<string>('');
	let isLoading = $state<boolean>(false);
	
	// Process-related state
	let selectedProcess = $state<Process<any> | null>(null);
	let selectedContentTitles = $state<string[]>([]);
	let processes = $state<Process<any>[]>([]);

	// Load available processes
	onMount(() => {
		processes = processRegistry.getAll();
	});

	// Toggle content selection for processing
	function toggleContentSelection(title: string) {
		const index = selectedContentTitles.indexOf(title);
		if (index === -1) {
			selectedContentTitles = [...selectedContentTitles, title];
		} else {
			selectedContentTitles = selectedContentTitles.filter(t => t !== title);
		}
	}

	// Function to run the selected process on all selected content
	async function runProcess() {
		if (!selectedProcess || selectedContentTitles.length === 0) {
			alert('Please select both a process and at least one content item to process');
			return;
		}

		try {
			// Process each selected content item
			for (const title of selectedContentTitles) {
				// Fetch the content
				const response = await fetch(`/api/content?title=${encodeURIComponent(title)}`);
				const data = await response.json();

				if (data.success) {
					// Run the process on the content
					const result = selectedProcess.process(data.content);
					console.log(`Process result for ${title}:`, result);
					console.log(`Process ${selectedProcess.name} executed on ${title}`);
				} else {
					console.error(`Error loading content for ${title}: ${data.error}`);
				}
			}
			
			alert(`Process executed successfully on ${selectedContentTitles.length} content items! Check the console for details.`);
		} catch (error) {
			alert(`Error running process: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

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
<!-- Diagram Section -->
<DiagramSection />

<!-- Titles List -->
<div class="mb-6">
	<h2 class="text-xl font-semibold mb-2">Saved Content</h2>
    <div class="text-xs text-gray-500 mb-4">These are the saved markdown contents available for us to use and experiment on. If you want to view, simply pick one.</div>
	{#if titles.length === 0}
		<p class="text-gray-500">No saved content yet</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each titles as title}
				<button 
					class="px-3 py-1 border rounded-md {selectedTitle === title 
						? 'bg-blue-100 border-blue-400 hover:bg-blue-200' 
						: 'hover:bg-gray-100'}"
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
    <div class="text-xs text-gray-500 mb-4">You can create new content here. The content will be saved and available to run experiments on.</div>
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

<!-- Process Section -->
<div class="pt-6 mt-6">
	<h2 class="text-xl font-semibold mb-2">Processes</h2>
	<div class="text-xs text-gray-500 mb-4">These are the available processes to run on the available content. Processes are like experiments, they try to do something with the content, tranform it, extract sections, or whatever, it is just a genral kind of thing that takes in the content, do something with it, and show the result.</div>

	<!-- Process Selection -->
	<div class="mb-4">
		<label class="block mb-1">Select Process:</label>
		<div class="flex flex-wrap gap-2">
			{#if processes.length === 0}
				<p class="text-gray-500">No processes available</p>
			{:else}
				{#each processes as process}
					<button 
						class="px-3 py-1 border rounded-md {selectedProcess?.id === process.id 
							? 'bg-blue-100 border-blue-400 hover:bg-blue-200' 
							: 'hover:bg-gray-100'}"
						on:click={() => selectedProcess = process}
					>
						{process.name}
					</button>
				{/each}
			{/if}
		</div>
	</div>
	
	<!-- Content Selection for Process -->
	{#if selectedProcess}
		<div class="mb-4">
			<label class="block mb-1">Select Content to Process (multiple selection):</label>
			<div class="flex flex-wrap gap-2">
				{#if titles.length === 0}
					<p class="text-gray-500">No content available</p>
				{:else}
				{#each titles as title}
					<button 
						class="px-3 py-1 border rounded-md {selectedContentTitles.includes(title) 
							? 'bg-blue-100 border-blue-400 hover:bg-blue-200' 
							: 'hover:bg-gray-100'}"
						on:click={() => toggleContentSelection(title)}
					>
						{title}
					</button>
					{/each}
				{/if}
			</div>
		</div>
		
		<!-- Run Process Button -->
		{#if selectedContentTitles.length > 0}
			<button 
				class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
				on:click={runProcess}
			>
				Run {selectedProcess.name} on {selectedContentTitles.length} selected item{selectedContentTitles.length > 1 ? 's' : ''}
			</button>
		{/if}
	{/if}
</div>
</div>
