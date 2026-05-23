'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SuggestionItem } from './editor-commands';

interface SlashState {
  open: boolean;
  items: SuggestionItem[];
  selected: number;
  rect: DOMRect | null;
}

export function SlashCommandMenu() {
  const [state, setState] = useState<SlashState>({ open: false, items: [], selected: 0, rect: null });

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      setState({
        open: true,
        items: detail.items || [],
        selected: 0,
        rect: detail.clientRect || null,
      });
    };
    const exit = () => setState((current) => ({ ...current, open: false }));

    window.addEventListener('noteblock:slash-start', update);
    window.addEventListener('noteblock:slash-update', update);
    window.addEventListener('noteblock:slash-exit', exit);
    return () => {
      window.removeEventListener('noteblock:slash-start', update);
      window.removeEventListener('noteblock:slash-update', update);
      window.removeEventListener('noteblock:slash-exit', exit);
      delete (window as any).__noteblockSlashKey;
    };
  }, []);

  useEffect(() => {
    (window as any).__noteblockSlashKey = (event: KeyboardEvent) => {
      if (!state.open) return false;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setState((current) => ({ ...current, selected: Math.min(current.items.length - 1, current.selected + 1) }));
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setState((current) => ({ ...current, selected: Math.max(0, current.selected - 1) }));
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = state.items[state.selected];
        if (item) (window as any).__noteblockSlashCommand?.(item);
        return true;
      }
      if (event.key === 'Escape') {
        setState((current) => ({ ...current, open: false }));
        return false;
      }
      return false;
    };
  }, [state]);

  const style = useMemo(() => {
    const rect = state.rect;
    if (typeof window === 'undefined') return { left: 24, top: 80 };
    return {
      left: Math.min(rect?.left || 24, Math.max(24, window.innerWidth - 320)),
      top: Math.min((rect?.bottom || 80) + 8, Math.max(24, window.innerHeight - 360)),
    };
  }, [state.rect]);

  if (!state.open || !state.items.length) return null;

  return (
    <div
      className="fixed z-50 max-h-[330px] w-72 overflow-y-auto rounded-md border border-notion-border bg-background px-1 py-2 shadow-md"
      style={style}
    >
      {state.items.map((item, index) => (
        <button
          type="button"
          key={item.title}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (window as any).__noteblockSlashCommand?.(item)}
          className={`flex w-full items-center space-x-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-notion-hover ${
            index === state.selected ? 'bg-notion-hover' : ''
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-notion-border bg-background">
            {item.icon}
          </span>
          <span>
            <span className="block font-medium text-notion-text">{item.title}</span>
            <span className="block text-xs text-notion-text-muted">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
