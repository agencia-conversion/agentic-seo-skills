import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

/**
 * Page mention node. Stores just the pageId; title and icon are resolved at
 * render time from the workspace store so mentions stay live.
 *
 * Rendered in the DOM as:
 *   <span data-page-mention data-page-id="..." class="page-mention"></span>
 *
 * A React effect (see EditorPanel) upgrades these into interactive chips.
 */
export const PageMentionPluginKey = new PluginKey('pageMention');

export const PageMention = Node.create({
  name: 'pageMention',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-page-id'),
        renderHTML: (attrs) => (attrs.pageId ? { 'data-page-id': attrs.pageId } : {}),
      },
      alias: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-alias'),
        renderHTML: (attrs) => (attrs.alias ? { 'data-alias': attrs.alias } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-page-mention]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Atom nodes must not have a content hole; include a placeholder text
    // so serialized HTML still has readable fallback when the hydrator is
    // absent (e.g., public share view or SSR).
    return [
      'span',
      mergeAttributes(
        { 'data-page-mention': 'true', class: 'page-mention' },
        HTMLAttributes
      ),
      `@${(node.attrs.pageId as string | null) || 'page'}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.pageId || ''}`;
  },

  addProseMirrorPlugins() {
    const pluginKey = PageMentionPluginKey;
    return [
      Suggestion({
        editor: this.editor,
        char: '@',
        pluginKey,
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: 'pageMention', attrs: { pageId: (props as any).pageId } },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
        items: ({ query }) => {
          if (typeof window === 'undefined') return [];
          const provider = (window as any).__noteblockMentionSearch;
          if (typeof provider !== 'function') return [];
          return provider(query);
        },
        render: () => {
          const emit = (type: string, detail: any) => {
            window.dispatchEvent(new CustomEvent(`noteblock:mention-${type}`, { detail }));
          };
          return {
            onStart: (props) => {
              (window as any).__noteblockMentionApply = (pageId: string) =>
                props.command({ pageId } as any);
              emit('start', {
                clientRect: props.clientRect?.(),
                items: props.items,
                query: props.query,
              });
            },
            onUpdate: (props) => {
              (window as any).__noteblockMentionApply = (pageId: string) =>
                props.command({ pageId } as any);
              emit('update', {
                clientRect: props.clientRect?.(),
                items: props.items,
                query: props.query,
              });
            },
            onKeyDown: (props) => {
              const keyHandler = (window as any).__noteblockMentionKey;
              if (typeof keyHandler === 'function') {
                return keyHandler(props.event) ?? false;
              }
              if (props.event.key === 'Escape') {
                emit('exit', {});
                return true;
              }
              return false;
            },
            onExit: () => {
              delete (window as any).__noteblockMentionApply;
              emit('exit', {});
            },
          };
        },
      }),
    ];
  },
});
