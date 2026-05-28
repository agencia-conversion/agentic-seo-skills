import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Auto-block: code fence `agentic-<type>` whose YAML body declares params
 * (`area`, `cluster`, etc.) plus generated fields (`materialized`,
 * `materialized_at`, `materialized_fingerprint`). The materialized field
 * is a Markdown table that the LLM reads directly; the React nodeview
 * renders it nicely + explicit CTAs (Configurar, ⋯, + Mover).
 *
 * Roundtrip: stays as ```agentic-<type>``` Markdown via markdown.ts.
 */
export const AutoBlock = Node.create({
  name: 'autoBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      kind: {
        default: 'agentic-clusters-by-area',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-kind') || 'agentic-clusters-by-area',
        renderHTML: (attrs) => ({ 'data-kind': String(attrs.kind || '') }),
      },
      body: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-body') || '',
        renderHTML: (attrs) => ({ 'data-body': String(attrs.body || '') }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-auto-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = String(node.attrs.kind || '');
    const body = String(node.attrs.body || '');
    return [
      'div',
      mergeAttributes(
        {
          'data-auto-block': 'true',
          'data-kind': kind,
          'data-body': body,
          class:
            'auto-block-host my-4 rounded-md border border-notion-border bg-notion-sidebar/30',
        },
        HTMLAttributes
      ),
      [
        'pre',
        { class: 'text-[11px] text-notion-text-muted font-mono whitespace-pre p-3' },
        body,
      ],
    ];
  },
});
