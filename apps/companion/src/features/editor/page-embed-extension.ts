import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Embedded page reference (Obsidian-style transclusion `![[target]]`).
 *
 * V1: renders as a card with the target page title and the first paragraph
 * of its body. Click navigates to the target. Real inline transclusion of
 * arbitrary block content is deferred — the card is enough for most uses
 * and avoids recursion/perf issues.
 *
 * DOM shape:
 *   <div data-page-embed data-page-id="..." data-anchor="..."></div>
 *
 * Hydration of the card body happens via the same workspace store the
 * inline page mention uses (see MentionChipHydrator pattern).
 */
export const PageEmbed = Node.create({
  name: 'pageEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-page-id'),
        renderHTML: (attrs) => (attrs.pageId ? { 'data-page-id': attrs.pageId } : {}),
      },
      anchor: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-anchor'),
        renderHTML: (attrs) => (attrs.anchor ? { 'data-anchor': attrs.anchor } : {}),
      },
      alias: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-alias'),
        renderHTML: (attrs) => (attrs.alias ? { 'data-alias': attrs.alias } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-page-embed]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const pageId = String(node.attrs.pageId || '');
    const anchor = String(node.attrs.anchor || '');
    const alias = String(node.attrs.alias || '');
    const label = alias || anchor || pageId.split('/').pop()?.replace(/\.md$/, '') || pageId;
    return [
      'div',
      mergeAttributes(
        {
          'data-page-embed': 'true',
          class:
            'page-embed my-4 rounded-md border border-notion-border bg-notion-sidebar/40 px-4 py-3 cursor-pointer hover:bg-notion-hover transition-colors',
        },
        HTMLAttributes
      ),
      [
        'div',
        { class: 'text-[10px] uppercase tracking-wider text-notion-text-muted mb-1' },
        anchor ? `Embed · ${anchor}` : 'Embed',
      ],
      [
        'div',
        { class: 'text-sm font-medium text-notion-text' },
        `![[${label}${anchor ? `#${anchor}` : ''}]]`,
      ],
    ];
  },

  renderText({ node }) {
    const pageId = String(node.attrs.pageId || '');
    const anchor = String(node.attrs.anchor || '');
    const alias = String(node.attrs.alias || '');
    const target = anchor ? `${pageId}#${anchor}` : pageId;
    return alias ? `![[${target}|${alias}]]` : `![[${target}]]`;
  },
});
