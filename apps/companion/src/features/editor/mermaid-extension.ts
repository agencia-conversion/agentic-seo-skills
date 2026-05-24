import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Mermaid fenced block. Source stays in `source` attr; client-side
 * MermaidHydrator (see editor-panel.tsx mount) replaces the DOM with the
 * rendered SVG via dynamic import — keeps mermaid out of the main bundle.
 *
 * Roundtrips to `\`\`\`mermaid ... \`\`\`` in Markdown via markdown.ts.
 */
export const Mermaid = Node.create({
  name: 'mermaid',
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
    return [{ tag: 'div[data-mermaid]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const source = String(node.attrs.source || '');
    return [
      'div',
      mergeAttributes(
        {
          'data-mermaid': 'true',
          class:
            'mermaid-block my-4 rounded-md border border-notion-border bg-notion-sidebar/40 p-3 overflow-x-auto',
        },
        HTMLAttributes
      ),
      [
        'pre',
        { class: 'text-xs text-notion-text-muted font-mono whitespace-pre' },
        source,
      ],
    ];
  },
});
