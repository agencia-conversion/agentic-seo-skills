import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export const SlashCommandPluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        pluginKey: SlashCommandPluginKey,
        allowSpaces: true,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          const item = props as any;
          if (typeof item?.command === 'function') item.command({ editor, range });
        },
        items: ({ query }) => {
          if (typeof window === 'undefined') return [];
          const provider = (window as any).__noteblockSlashItems;
          if (typeof provider !== 'function') return [];
          return provider(query);
        },
        render: () => {
          const emit = (type: string, detail: any) => {
            window.dispatchEvent(new CustomEvent(`noteblock:slash-${type}`, { detail }));
          };
          return {
            onStart: (props) => {
              (window as any).__noteblockSlashCommand = (item: any) => props.command(item);
              emit('start', {
                clientRect: props.clientRect?.(),
                items: props.items,
                query: props.query,
              });
            },
            onUpdate: (props) => {
              (window as any).__noteblockSlashCommand = (item: any) => props.command(item);
              emit('update', {
                clientRect: props.clientRect?.(),
                items: props.items,
                query: props.query,
              });
            },
            onKeyDown: (props) => {
              const handler = (window as any).__noteblockSlashKey;
              if (typeof handler === 'function') return handler(props.event) ?? false;
              if (props.event.key === 'Escape') {
                emit('exit', {});
                return true;
              }
              return false;
            },
            onExit: () => {
              delete (window as any).__noteblockSlashCommand;
              emit('exit', {});
            },
          };
        },
      }),
    ];
  },
});
