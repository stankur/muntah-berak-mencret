import html2md from 'html-to-md';

export function convertDocumentFragmentToMarkdown(fragment: DocumentFragment): string {
	const container = document.createElement('div');
	container.appendChild(fragment.cloneNode(true));
	return html2md(container.innerHTML);
}
