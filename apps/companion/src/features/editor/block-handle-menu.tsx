'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Copy,
  Trash2,
  Palette,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface BlockHandleMenuProps {
  editorRef: React.RefObject<any>;
}

interface MenuPosition {
  top: number;
  left: number;
  blockPos: number;
}

export function BlockHandleMenu({ editorRef }: BlockHandleMenuProps) {
  const { t } = useI18n();
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for clicks on .drag-handle anywhere in document
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const handle = target.closest?.('.drag-handle') as HTMLElement | null;
      if (!handle) return;
      const editor = editorRef.current;
      if (!editor) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = handle.getBoundingClientRect();
      // Find the block under/right of the handle
      const coords = { left: rect.right + 10, top: rect.top + rect.height / 2 };
      const posInfo = editor.view.posAtCoords(coords);
      if (!posInfo) return;
      setMenu({
        top: rect.bottom + 4,
        left: rect.left,
        blockPos: posInfo.pos,
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [editorRef]);

  useEffect(() => {
    if (!menu) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menu]);

  if (!menu) return null;

  const editor = editorRef.current;
  if (!editor) return null;

  const runAt = (fn: () => void) => {
    try {
      const $pos = editor.state.doc.resolve(menu.blockPos);
      let depth = $pos.depth;
      while (depth > 0 && $pos.node(depth).isInline) depth--;
      const nodePos = depth > 0 ? $pos.before(depth) : 0;
      editor.chain().focus().setNodeSelection(nodePos).run();
      fn();
    } catch (err) {
      console.error('drag-handle action failed:', err);
    }
    setMenu(null);
  };

  const turnInto = (level: number | 'p' | 'bullet' | 'ordered' | 'todo' | 'quote' | 'code' | 'divider') => {
    runAt(() => {
      const chain = editor.chain().focus();
      if (level === 'p') chain.setNode('paragraph').run();
      else if (level === 'bullet') chain.toggleBulletList().run();
      else if (level === 'ordered') chain.toggleOrderedList().run();
      else if (level === 'todo') chain.toggleTaskList().run();
      else if (level === 'quote') chain.toggleBlockquote().run();
      else if (level === 'code') chain.toggleCodeBlock().run();
      else if (level === 'divider') chain.setHorizontalRule().run();
      else chain.setNode('heading', { level }).run();
    });
  };

  const duplicate = () => {
    runAt(() => {
      const { $from } = editor.state.selection;
      const node = $from.nodeAfter || $from.parent;
      const pos = menu.blockPos;
      editor.chain().focus().insertContentAt(pos + (node?.nodeSize || 0), node?.toJSON()).run();
    });
  };

  const del = () => {
    runAt(() => {
      editor.chain().focus().deleteSelection().run();
    });
  };

  const turnItems = [
    { label: t('blockMenu.text'), icon: <Type className="w-3.5 h-3.5" />, onClick: () => turnInto('p') },
    { label: t('blockMenu.heading1'), icon: <Heading1 className="w-3.5 h-3.5" />, onClick: () => turnInto(1) },
    { label: t('blockMenu.heading2'), icon: <Heading2 className="w-3.5 h-3.5" />, onClick: () => turnInto(2) },
    { label: t('blockMenu.heading3'), icon: <Heading3 className="w-3.5 h-3.5" />, onClick: () => turnInto(3) },
    { label: t('blockMenu.bulletList'), icon: <List className="w-3.5 h-3.5" />, onClick: () => turnInto('bullet') },
    { label: t('blockMenu.numberedList'), icon: <ListOrdered className="w-3.5 h-3.5" />, onClick: () => turnInto('ordered') },
    { label: t('blockMenu.todoList'), icon: <ListTodo className="w-3.5 h-3.5" />, onClick: () => turnInto('todo') },
    { label: t('blockMenu.quote'), icon: <Quote className="w-3.5 h-3.5" />, onClick: () => turnInto('quote') },
    { label: t('blockMenu.divider'), icon: <Minus className="w-3.5 h-3.5" />, onClick: () => turnInto('divider') },
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[180] w-56 bg-background border border-notion-border rounded-lg shadow-xl py-1 max-h-[360px] overflow-y-auto"
      style={{ top: menu.top, left: menu.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[10px] font-semibold text-notion-text-muted uppercase tracking-wider">
        {t('blockMenu.turnInto')}
      </div>
      {turnItems.map((it) => (
        <button
          key={it.label}
          onClick={it.onClick}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-notion-text hover:bg-notion-hover text-left cursor-pointer"
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
      <div className="h-px bg-notion-border my-1" />
      <button
        onClick={duplicate}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-notion-text hover:bg-notion-hover text-left cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>{t('blockMenu.duplicate')}</span>
      </button>
      <button
        onClick={del}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 text-left cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{t('blockMenu.delete')}</span>
      </button>
    </div>,
    document.body
  );
}
