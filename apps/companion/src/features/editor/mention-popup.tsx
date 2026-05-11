'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Database, Search } from 'lucide-react';
import { useWorkspace, Page } from '@/features/workspace/store';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 8;

interface MentionItem {
  pageId: string;
  title: string;
  icon?: string | null;
  type: 'doc' | 'database';
  parentTitle?: string;
}

interface PopupState {
  open: boolean;
  x: number;
  y: number;
  items: MentionItem[];
  query: string;
  index: number;
}

const initial: PopupState = { open: false, x: 0, y: 0, items: [], query: '', index: 0 };

export function MentionPopup({
  onSelect,
}: {
  onSelect: (pageId: string) => void;
}) {
  const pages = useWorkspace((s) => s.pages);
  const activePageId = useWorkspace((s) => s.activePageId);

  // Pre-compute the live, mentionable universe ONCE per pages change.
  // For workspaces with thousands of entries this keeps each @query from
  // re-walking everything: we only scan the prebuilt array.
  const index = useMemo(() => buildIndex(pages), [pages]);

  const [state, setState] = useState<PopupState>(initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    (window as any).__noteblockMentionSearch = (query: string) =>
      search(index, query, activePageId).slice(0, MAX_RESULTS);
    return () => {
      delete (window as any).__noteblockMentionSearch;
    };
  }, [index, activePageId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const st = stateRef.current;
      if (!st.open) return false as any;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setState((s) => ({ ...s, index: (s.index + 1) % Math.max(s.items.length, 1) }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setState((s) => ({
          ...s,
          index: (s.index - 1 + Math.max(s.items.length, 1)) % Math.max(s.items.length, 1),
        }));
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const picked = st.items[st.index];
        if (picked) {
          e.preventDefault();
          const apply = (window as any).__noteblockMentionApply;
          if (typeof apply === 'function') apply(picked.pageId);
          else onSelect(picked.pageId);
          setState(initial);
        }
        return true;
      }
      if (e.key === 'Escape') {
        setState(initial);
        return true;
      }
      return false;
    };
    (window as any).__noteblockMentionKey = handleKey;
    return () => {
      delete (window as any).__noteblockMentionKey;
    };
  }, [onSelect]);

  useEffect(() => {
    const update = (e: any) => {
      const { clientRect, query } = e.detail || {};
      const items = search(index, query || '', activePageId).slice(0, MAX_RESULTS);
      setState((prev) => ({
        open: true,
        x: clientRect?.left ?? prev.x,
        y: (clientRect?.bottom ?? prev.y) + 4,
        items,
        query: query || '',
        index: 0,
      }));
    };
    const exit = () => setState(initial);
    window.addEventListener('noteblock:mention-start', update);
    window.addEventListener('noteblock:mention-update', update);
    window.addEventListener('noteblock:mention-exit', exit);
    return () => {
      window.removeEventListener('noteblock:mention-start', update);
      window.removeEventListener('noteblock:mention-update', update);
      window.removeEventListener('noteblock:mention-exit', exit);
    };
  }, [index, activePageId]);

  if (!state.open) return null;

  return (
    <div
      style={{ left: state.x, top: state.y }}
      className="fixed z-[300] w-80 bg-background border border-notion-border rounded-md shadow-lg overflow-hidden"
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-notion-border">
        <Search className="w-3.5 h-3.5 text-notion-text-muted shrink-0" />
        <span className="text-[11px] text-notion-text-muted flex-1 truncate">
          {state.query ? (
            <>
              Searching <span className="text-notion-text font-medium">"{state.query}"</span>
            </>
          ) : (
            'Type to search pages…'
          )}
        </span>
      </div>
      <div className="py-1 max-h-72 overflow-y-auto">
        {state.items.length === 0 ? (
          <div className="px-3 py-3 text-xs text-notion-text-muted italic">
            {state.query ? 'No matches.' : 'No other pages to link to.'}
          </div>
        ) : (
          state.items.map((item, idx) => (
            <button
              key={item.pageId}
              onClick={() => {
                const apply = (window as any).__noteblockMentionApply;
                if (typeof apply === 'function') apply(item.pageId);
                else onSelect(item.pageId);
                setState(initial);
              }}
              onMouseEnter={() => setState((s) => ({ ...s, index: idx }))}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left cursor-pointer',
                idx === state.index ? 'bg-notion-hover' : 'hover:bg-notion-hover'
              )}
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base">
                {item.icon ||
                  (item.type === 'database' ? (
                    <Database className="w-3.5 h-3.5 text-notion-text-muted" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-notion-text-muted" />
                  ))}
              </span>
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-sm text-notion-text truncate leading-tight">
                  {item.title || 'Untitled'}
                </span>
                {item.parentTitle && (
                  <span className="text-[10px] text-notion-text-muted truncate">
                    {item.parentTitle}
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

interface IndexEntry {
  pageId: string;
  title: string;
  titleLower: string;
  icon: string | null;
  type: 'doc' | 'database';
  parentTitle?: string;
}

/**
 * Precomputes the mentionable subset:
 * - skip trashed pages
 * - skip rows inside databases (which aren't addressable pages)
 * - skip inline databases
 *
 * Performance: builds a Set of db ids in O(N) then filters in O(N), so total
 * work per rebuild is O(N). Downstream queries are O(N) worst case but bail
 * early when the caller wants a small top-K.
 */
function buildIndex(pages: Page[]): IndexEntry[] {
  const dbIds = new Set<string>();
  for (const p of pages) if (p.type === 'database') dbIds.add(p.id);

  const byId = new Map<string, Page>();
  for (const p of pages) byId.set(p.id, p);

  const out: IndexEntry[] = [];
  for (const p of pages) {
    if (p.trashed) continue;
    if (p.inline) continue;
    if (p.parentId && dbIds.has(p.parentId)) continue;
    const parent = p.parentId ? byId.get(p.parentId) : undefined;
    out.push({
      pageId: p.id,
      title: p.title,
      titleLower: (p.title || '').toLowerCase(),
      icon: p.icon,
      type: p.type,
      parentTitle: parent?.title,
    });
  }
  return out;
}

/**
 * Ranks candidates with a simple scoring pass:
 *   - prefix match: +3
 *   - token prefix match: +2
 *   - substring match: +1
 *   - anything else (when no query): neutral
 * Current page is excluded so a page can't mention itself.
 * Early-exits scan once we've collected MAX_RESULTS * 3 candidates.
 */
function search(
  index: IndexEntry[],
  query: string,
  excludeId: string | null
): MentionItem[] {
  const q = query.trim().toLowerCase();
  const collected: { e: IndexEntry; score: number }[] = [];
  for (const e of index) {
    if (e.pageId === excludeId) continue;
    let score = 0;
    if (!q) {
      score = 1;
    } else if (e.titleLower.startsWith(q)) {
      score = 3;
    } else {
      const tokens = e.titleLower.split(/\s+/);
      if (tokens.some((t) => t.startsWith(q))) score = 2;
      else if (e.titleLower.includes(q)) score = 1;
    }
    if (score === 0) continue;
    collected.push({ e, score });
    if (collected.length >= MAX_RESULTS * 4) break;
  }
  collected.sort((a, b) => b.score - a.score);
  return collected.map(({ e }) => ({
    pageId: e.pageId,
    title: e.title,
    icon: e.icon,
    type: e.type,
    parentTitle: e.parentTitle,
  }));
}
