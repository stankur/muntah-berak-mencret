import { schema } from 'prosemirror-markdown';
import { Schema } from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { tableNodes } from 'prosemirror-tables';

export const htmlSchema = new Schema({
	nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block').append(
		tableNodes({
			tableGroup: 'block',
			cellContent: 'block+',
			cellAttributes: {
				background: {
					default: null,
					getFromDOM(dom) {
						return dom.style.backgroundColor || null;
					},
					setDOMAttr(value, attrs) {
						if (value) attrs.style = (attrs.style || '') + `background-color: ${value};`;
					}
				}
			}
		})
	),
	marks: schema.spec.marks
});

export const createNodeFromHtml = (html: string) => {
	const node = document.createElement('div');
	node.innerHTML = html;
	return node;
};
