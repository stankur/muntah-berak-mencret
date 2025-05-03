<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import { processRegistry, type Process, type AsyncProcess } from '$lib/processes';
	import DiagramSection from '$lib/components/DiagramSection.svelte';
	import type { ProcessResult } from '$lib/processes/types';

	// Define interfaces for process runs and content files
	interface ProcessRun {
		folderName: string;
		processId: string;
		dateTime: string;
		displayName: string;
	}

	interface ContentFile {
		fileName: string;
		title: string;
	}

	let title = $state<string>('');
	let content = $state<string>('');
	let titles = $state<string[]>([]);
	let selectedTitle = $state<string | null>(null);
	let selectedContent = $state<string>('');
	let isLoading = $state<boolean>(false);

	// Process-related state
	let selectedProcess = $state<Process<any> | AsyncProcess<any> | null>(null);
	let selectedContentTitles = $state<string[]>([]);
	let processes = $state<(Process<any> | AsyncProcess<any>)[]>([]);

	// Results-related state
	let processRuns = $state<ProcessRun[]>([]);
	let selectedRun = $state<ProcessRun | null>(null);
	let runContentFiles = $state<ContentFile[]>([]);
	let selectedRunContent = $state<ContentFile | null>(null);
	let resultContent = $state<any | null>(null);
	let isLoadingResult = $state<boolean>(false);
	let resultProcess = $state<Process<any> | AsyncProcess<any> | null>(null);

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
			selectedContentTitles = selectedContentTitles.filter((t) => t !== title);
		}
	}

	// Function to run the selected process on all selected content
	async function runProcess() {
		if (!selectedProcess || selectedContentTitles.length === 0) {
			alert('Please select both a process and at least one content item to process');
			return;
		}

		try {
			const processResults: ProcessResult<any>[] = [];

			// Process each selected content item
			for (const title of selectedContentTitles) {
				// Fetch the content
				const response = await fetch(`/api/content?title=${encodeURIComponent(title)}`);
				const data = await response.json();

				if (data.success) {
					// Run the process on the content, handling both sync and async
					let result;
					if (processRegistry.isAsync(selectedProcess.id)) {
						// Handle async process
						result = await selectedProcess.process(data.content);
					} else {
						// Handle sync process
						result = selectedProcess.process(data.content);
					}

					processResults.push({
						title,
						content: result
					});
				} else {
					console.error(`Error loading content for ${title}: ${data.error}`);
				}
			}

			// Save the results
			if (processResults.length > 0) {
				const saveResponse = await fetch('/api/save-results', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						processName: selectedProcess.id,
						results: processResults
					})
				});

				const saveResult = await saveResponse.json();

				if (saveResult.success) {
					alert(
						`Process executed successfully on ${selectedContentTitles.length} content items! Results have been saved.`
					);
				} else {
					alert(`Process executed successfully but failed to save results: ${saveResult.error}`);
				}
			} else {
				alert('No results were generated. Check the console for errors.');
			}
		} catch (error) {
			alert(`Error running process: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	// Fetch the list of titles and process runs when the page loads
	onMount(async () => {
		await loadTitles();
		await loadProcessRuns();
	});

	// Load the list of process runs
	async function loadProcessRuns() {
		try {
			const response = await fetch('/api/list-results');
			const data = await response.json();

			if (data.success) {
				processRuns = data.runs || [];
			} else {
				console.error('Error loading process runs:', data.error);
			}
		} catch (error) {
			console.error('Error loading process runs:', error);
		}
	}

	// Select a process run and load its content files
	async function selectRun(run: ProcessRun) {
		if (selectedRun === run) {
			selectedRun = null;
			runContentFiles = [];
			selectedRunContent = null;
			resultContent = null;
			return;
		}

		selectedRun = run;
		selectedRunContent = null;
		resultContent = null;

		try {
			const response = await fetch(
				`/api/list-run-content?folder=${encodeURIComponent(run.folderName)}`
			);
			const data = await response.json();

			if (data.success) {
				runContentFiles = data.contentFiles || [];
			} else {
				console.error('Error loading run content files:', data.error);
				runContentFiles = [];
			}
		} catch (error) {
			console.error('Error loading run content files:', error);
			runContentFiles = [];
		}
	}

	// Select a run content file and load its content
	async function selectRunContent(contentFile: ContentFile) {
		if (!selectedRun) return;

		if (selectedRunContent === contentFile) {
			selectedRunContent = null;
			resultContent = null;
			resultProcess = null;
			return;
		}

		selectedRunContent = contentFile;
		isLoadingResult = true;

		try {
			const response = await fetch(
				`/api/result-content?folder=${encodeURIComponent(selectedRun.folderName)}&file=${encodeURIComponent(contentFile.fileName)}`
			);
			const data = await response.json();

			if (data.success) {
				resultContent = data.result;

				// Get the process from the registry using the process ID
				resultProcess = processRegistry.getById(selectedRun.processId) || null;

				if (!resultProcess) {
					console.warn(`Process with ID ${selectedRun.processId} not found in registry`);
				}
			} else {
				console.error('Error loading result content:', data.error);
				resultContent = null;
				resultProcess = null;
			}
		} catch (error) {
			console.error('Error loading result content:', error);
			resultContent = null;
			resultProcess = null;
		} finally {
			isLoadingResult = false;
		}
	}

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
		<h2 class="mb-2 text-xl font-semibold">Saved Content</h2>
		<div class="mb-4 text-xs text-gray-500">
			These are the saved markdown contents available for us to use and experiment on. If you want
			to view, simply pick one.
		</div>
		{#if titles.length === 0}
			<p class="text-gray-500">No saved content yet</p>
		{:else}
			<div class="flex flex-wrap gap-2">
				{#each titles as title}
					<button
						class="rounded-md border px-3 py-1 {selectedTitle === title
							? 'border-blue-400 bg-blue-100 hover:bg-blue-200'
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
		<div class="mb-6 rounded-md border p-4">
			<h2 class="mb-2 text-xl font-semibold">{selectedTitle}</h2>
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
		<h2 class="mb-2 text-xl font-semibold">New Content</h2>
		<div class="mb-4 text-xs text-gray-500">
			You can create new content here. The content will be saved and available to run experiments
			on.
		</div>
		<div class="mb-4">
			<label for="title" class="mb-1 block">Title:</label>
			<input id="title" type="text" bind:value={title} class="w-full rounded-md border p-2" />
		</div>

		<div class="mb-4">
			<label for="content" class="mb-1 block">Content:</label>
			<textarea id="content" bind:value={content} rows="10" class="bdorer w-full rounded-md p-2"
			></textarea>
		</div>

		<button
			class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
			on:click={handleSave}>Save</button
		>
	</div>

	<!-- Process Section -->
	<div class="mt-6 pt-6">
		<h2 class="mb-2 text-xl font-semibold">Processes</h2>
		<div class="mb-4 text-xs text-gray-500">
			These are the available processes to run on the available content. Processes are like
			experiments, they try to do something with the content, tranform it, extract sections, or
			whatever, it is just a genral kind of thing that takes in the content, do something with it,
			and show the result.
		</div>

		<!-- Process Selection -->
		<div class="mb-4">
			<label class="mb-1 block">Select Process:</label>
			<div class="flex flex-wrap gap-2">
				{#if processes.length === 0}
					<p class="text-gray-500">No processes available</p>
				{:else}
					{#each processes as process}
						<button
							class="rounded-md border px-3 py-1 {selectedProcess?.id === process.id
								? 'border-blue-400 bg-blue-100 hover:bg-blue-200'
								: 'hover:bg-gray-100'}"
							on:click={() => (selectedProcess = process)}
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
				<label class="mb-1 block">Select Content to Process (multiple selection):</label>
				<div class="flex flex-wrap gap-2">
					{#if titles.length === 0}
						<p class="text-gray-500">No content available</p>
					{:else}
						{#each titles as title}
							<button
								class="rounded-md border px-3 py-1 {selectedContentTitles.includes(title)
									? 'border-blue-400 bg-blue-100 hover:bg-blue-200'
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
					class="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
					on:click={runProcess}
				>
					Run {selectedProcess.name} on {selectedContentTitles.length} selected item{selectedContentTitles.length >
					1
						? 's'
						: ''}
				</button>
			{/if}
		{/if}
	</div>

	<!-- Results Section -->
	<div class="mt-6 pt-6">
		<h2 class="mb-2 text-xl font-semibold">Results</h2>
		<div class="mb-4 text-xs text-gray-500">
			These are the results of previous process runs. Select a process run to see the content items
			that were processed, then select a content item to view its result.
		</div>

		<!-- Process Runs List -->
		<div class="mb-4">
			<label class="mb-1 block">Process Runs:</label>
			<div class="flex flex-wrap gap-2">
				{#if processRuns.length === 0}
					<p class="text-gray-500">No process runs available</p>
				{:else}
					{#each processRuns as run}
						<button
							class="rounded-md border px-3 py-1 {selectedRun === run
								? 'border-blue-400 bg-blue-100 hover:bg-blue-200'
								: 'hover:bg-gray-100'}"
							on:click={() => selectRun(run)}
						>
							{run.displayName}
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Content Files List -->
		{#if selectedRun}
			<div class="mb-4">
				<label class="mb-1 block">Content Files in {selectedRun.displayName}:</label>
				<div class="flex flex-wrap gap-2">
					{#if runContentFiles.length === 0}
						<p class="text-gray-500">No content files available</p>
					{:else}
						{#each runContentFiles as contentFile}
							<button
								class="rounded-md border px-3 py-1 {selectedRunContent === contentFile
									? 'border-blue-400 bg-blue-100 hover:bg-blue-200'
									: 'hover:bg-gray-100'}"
								on:click={() => selectRunContent(contentFile)}
							>
								{contentFile.title}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- Result Content Display -->
		{#if selectedRunContent && resultContent}
			<div class="rounded-md border p-4">
				<h3 class="mb-2 text-lg font-semibold">{selectedRunContent.title}</h3>
				{#if isLoadingResult}
					<p>Loading...</p>
				{:else if resultProcess}
					<resultProcess.renderer input={resultContent.content} />
				{:else}
					<div class="prose">
						<p class="text-red-500">Process renderer not available. Displaying raw content:</p>
						<pre class="overflow-auto rounded bg-gray-100 p-2">{JSON.stringify(
								resultContent.content,
								null,
								2
							)}</pre>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
