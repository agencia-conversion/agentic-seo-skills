import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Live mini-Dataview block. Source is YAML inside a ```agentic-query```
 * fence; result is fetched from /api/project/query and rendered as table
 * or list. The Tiptap node stores the YAML source verbatim; a React
 * hydrator (AgenticQueryHydrator in the editor panel) wires up the live
 * fetch and result rendering.
 *
 * Roundtrip: stays as ```agentic-query``` Markdown via markdown.ts.
 */
export const AgenticQuery = Node.create({
  name: 'agenticQuery',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-source') || '',
        renderHTML: (attrs) => ({ 'data-source': String(attrs.source || '') }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-agentic-query]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const source = String(node.attrs.source || '');
    return [
      'div',
      mergeAttributes(
        {
          'data-agentic-query': 'true',
          class:
            'agentic-query-block my-4 rounded-md border border-notion-border bg-notion-sidebar/40 p-3 overflow-x-auto',
        },
        HTMLAttributes
      ),
      [
        'pre',
        { class: 'text-[11px] text-notion-text-muted font-mono whitespace-pre' },
        source,
      ],
    ];
  },
});
