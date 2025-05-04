<script lang="ts">
	import Editor from '$lib/services/prosemirror/ProsemirrorEditor.svelte';
	import { createNodeFromHtml, htmlSchema } from '$lib/services/prosemirror/HTMLSchema';
	import { exampleSetup } from 'prosemirror-example-setup';
	import { EditorState } from 'prosemirror-state';
	import { DOMParser, DOMSerializer } from 'prosemirror-model';
	import { onMount } from 'svelte';
	import { convertDocumentFragmentToMarkdown } from '../turndown/htmlToMarkdown';

	let editorState: EditorState | null = $state(null);
	let dom: HTMLElement | DocumentFragment | null = $state(null);

	export function getMarkdown() {
		return convertDocumentFragmentToMarkdown(dom as DocumentFragment);
	}

	onMount(() => {
		editorState = EditorState.create({
			schema: htmlSchema,
			plugins: exampleSetup({ schema: htmlSchema, menuBar: false }),
			doc: DOMParser.fromSchema(htmlSchema).parse(
				createNodeFromHtml('<p>Paste your content here</p>')
			)
		});
	});

	async function handleStateChange(event: any) {
		editorState = event.detail.state;

		if (editorState)
			dom = DOMSerializer.fromSchema(editorState.schema).serializeFragment(editorState.doc.content);
	}
</script>

{#if editorState}
	<Editor state={editorState} on:statechange={handleStateChange} />
{/if}
