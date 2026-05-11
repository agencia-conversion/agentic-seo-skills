import { Heading } from '@tiptap/extension-heading';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const pluginKey = new PluginKey('collapsibleHeading');

export const CollapsibleHeading = Heading.extend({
  name: 'heading',
  addAttributes() {
    return {
      ...this.parent?.(),
      collapsed: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-collapsed') === 'true',
        renderHTML: (attrs: Record<string, any>) =>
          attrs.collapsed ? { 'data-collapsed': 'true' } : {},
        keepOnSplit: false,
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            const doc = state.doc;
            let hidingLevel: number | null = null;

            doc.forEach((node, offset) => {
              if (node.type.name === 'heading') {
                const level = node.attrs.level as number;
                if (hidingLevel !== null && level <= hidingLevel) {
                  hidingLevel = null;
                }

                decos.push(
                  Decoration.widget(
                    offset + 1,
                    () => {
                      const btn = document.createElement('button');
                      btn.className = 'heading-toggle';
                      btn.setAttribute('data-heading-toggle', 'true');
                      btn.setAttribute('data-heading-pos', String(offset));
                      btn.type = 'button';
                      btn.contentEditable = 'false';
                      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                      btn.setAttribute(
                        'aria-label',
                        node.attrs.collapsed ? 'Expand section' : 'Collapse section'
                      );
                      if (node.attrs.collapsed) btn.classList.add('is-collapsed');
                      return btn;
                    },
                    { side: -1, ignoreSelection: true, key: `toggle-${offset}-${node.attrs.collapsed}` }
                  )
                );

                if (node.attrs.collapsed) {
                  hidingLevel = level;
                }
              } else if (hidingLevel !== null) {
                decos.push(
                  Decoration.node(offset, offset + node.nodeSize, {
                    class: 'heading-collapsed-hidden',
                  })
                );
              }
            });
            return DecorationSet.create(doc, decos);
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target as HTMLElement;
              const btn = target.closest('[data-heading-toggle="true"]') as HTMLElement | null;
              if (!btn) return false;
              event.preventDefault();
              event.stopPropagation();
              const pos = parseInt(btn.getAttribute('data-heading-pos') || '-1', 10);
              if (pos < 0) return false;
              const node = view.state.doc.nodeAt(pos);
              if (!node || node.type.name !== 'heading') return false;
              const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                collapsed: !node.attrs.collapsed,
              });
              view.dispatch(tr);
              return true;
            },
          },
        },
      }),
    ];
  },
});
