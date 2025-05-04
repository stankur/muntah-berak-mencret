<script lang="ts">
	import { EditorView } from 'prosemirror-view';
	import { EditorState } from 'prosemirror-state';
	import { onDestroy, onMount } from 'svelte';
	import { DOMParser, DOMSerializer } from 'prosemirror-model';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let state: EditorState;
	let editorContainer: Element;
	let view: EditorView;

	onMount(() => {
		view = new EditorView(editorContainer, {
			state,
			dispatchTransaction(transaction) {
				const newState = view.state.apply(transaction);
				view.updateState(newState);
				console.log(DOMSerializer.fromSchema(state.schema).serializeFragment(newState.doc.content));
				dispatch('statechange', { state: newState });
			},
			domParser: DOMParser.fromSchema(state.schema)
		});
	});

	onDestroy(() => {
		if (view) {
			view.destroy();
		}
	});
</script>

<div bind:this={editorContainer} class="prose w-[50vw] rounded-md border border-gray-500 p-2"></div>
