import { Node, mergeAttributes } from '@tiptap/core';

export const RawMarkdown = Node.create({
  name: 'rawMarkdown',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'pre[data-raw-markdown]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes, {
        'data-raw-markdown': 'true',
        class:
          'rounded-md border border-dashed border-notion-border bg-notion-sidebar/60 p-3 text-xs text-notion-text-muted whitespace-pre-wrap',
      }),
      ['code', {}, node.attrs.text || ''],
    ];
  },

  renderText({ node }) {
    return node.attrs.text || '';
  },
});
