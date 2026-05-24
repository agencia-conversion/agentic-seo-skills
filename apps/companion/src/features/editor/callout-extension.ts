import { Node, mergeAttributes } from '@tiptap/core';

const CALLOUT_STYLE_BY_TYPE: Record<string, { icon: string; classes: string }> = {
  note: { icon: 'ℹ️', classes: 'border-blue-400/40 bg-blue-500/5' },
  info: { icon: 'ℹ️', classes: 'border-blue-400/40 bg-blue-500/5' },
  tip: { icon: '💡', classes: 'border-green-400/40 bg-green-500/5' },
  warning: { icon: '⚠️', classes: 'border-amber-400/40 bg-amber-500/5' },
  warn: { icon: '⚠️', classes: 'border-amber-400/40 bg-amber-500/5' },
  danger: { icon: '🛑', classes: 'border-red-400/40 bg-red-500/5' },
  error: { icon: '🛑', classes: 'border-red-400/40 bg-red-500/5' },
  quote: { icon: '“”', classes: 'border-notion-border bg-notion-sidebar/40' },
  success: { icon: '✅', classes: 'border-green-400/40 bg-green-500/5' },
  question: { icon: '❓', classes: 'border-purple-400/40 bg-purple-500/5' },
};

function styleFor(type: string) {
  return CALLOUT_STYLE_BY_TYPE[type.toLowerCase()] || CALLOUT_STYLE_BY_TYPE.note;
}

/**
 * Obsidian-compatible callout block. Renders `> [!type] Title` Markdown as
 * a coloured wrapper with the type icon and optional title. The body is a
 * normal paragraph stream and remains editable.
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      calloutType: {
        default: 'note',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-callout-type') || 'note',
        renderHTML: (attrs) => ({ 'data-callout-type': String(attrs.calloutType || 'note') }),
      },
      title: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-callout-title'),
        renderHTML: (attrs) => (attrs.title ? { 'data-callout-title': String(attrs.title) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const calloutType = String(node.attrs.calloutType || 'note');
    const title = String(node.attrs.title || '').trim();
    const style = styleFor(calloutType);
    return [
      'div',
      mergeAttributes(
        {
          'data-callout': 'true',
          class: `callout my-3 rounded-md border-l-4 ${style.classes} px-4 py-3`,
        },
        HTMLAttributes
      ),
      [
        'div',
        { class: 'flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider text-notion-text-muted' },
        ['span', {}, style.icon],
        ['span', {}, title || calloutType],
      ],
      ['div', { class: 'callout-body text-sm text-notion-text leading-relaxed', 'data-callout-body': 'true' }, 0],
    ];
  },
});
