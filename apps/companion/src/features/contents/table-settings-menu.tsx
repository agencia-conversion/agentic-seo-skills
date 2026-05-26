'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableColumnDef {
  id: string;
  label: string;
  filterKind?: 'text' | 'select' | 'none';
  filterOptions?: Array<{ value: string; label: string }>;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableSettingsMenuProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  columns: TableColumnDef[];
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  filters: Record<string, string>;
  onFilterChange: (column: string, value: string) => void;
  hiddenColumns: Set<string>;
  onToggleColumn: (column: string) => void;
  onClose: () => void;
  onClear: () => void;
}

export function TableSettingsMenu({
  open,
  anchorRef,
  columns,
  sort,
  onSortChange,
  filters,
  onFilterChange,
  hiddenColumns,
  onToggleColumn,
  onClose,
  onClear,
}: TableSettingsMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const desiredWidth = 320;
      const estimatedHeight = 480;
      const viewportPadding = 8;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      let top = openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - viewportPadding - 120));
      const left = Math.max(8, Math.min(rect.right - desiredWidth, window.innerWidth - desiredWidth - 8));
      setPosition({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (!menuRef.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose, anchorRef]);

  const sortableColumns = useMemo(() => columns, [columns]);
  const filterableColumns = useMemo(
    () => columns.filter((c) => c.filterKind !== 'none'),
    [columns],
  );

  if (!open || !position || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-[200] w-80 rounded-md border border-notion-border bg-background shadow-xl text-sm text-notion-text"
      data-testid="table-settings-menu"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-notion-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-notion-text-muted">
          Configurar tabela
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-notion-text-muted hover:text-notion-text cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <section className="px-3 py-2 border-b border-notion-border space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">Ordenação</div>
          <div className="flex items-center gap-2">
            <select
              value={sort?.column || ''}
              onChange={(e) => {
                const col = e.target.value;
                if (!col) onSortChange(null);
                else onSortChange({ column: col, direction: sort?.direction || 'asc' });
              }}
              className="flex-1 rounded border border-notion-border bg-background px-2 py-1 text-xs"
              data-testid="table-sort-column"
            >
              <option value="">— sem ordenação —</option>
              {sortableColumns.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {sort && (
              <button
                type="button"
                onClick={() =>
                  onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
                }
                className="rounded border border-notion-border px-2 py-1 hover:bg-notion-hover cursor-pointer"
                title={sort.direction === 'asc' ? 'Asc' : 'Desc'}
                data-testid="table-sort-direction"
              >
                {sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </section>

        <section className="px-3 py-2 border-b border-notion-border space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">Filtros</div>
          {filterableColumns.length === 0 && (
            <div className="text-xs text-notion-text-muted">Sem filtros disponíveis.</div>
          )}
          {filterableColumns.map((c) => {
            const value = filters[c.id] || '';
            if (c.filterKind === 'select' && c.filterOptions) {
              return (
                <label key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-notion-text-muted truncate">{c.label}</span>
                  <select
                    value={value}
                    onChange={(e) => onFilterChange(c.id, e.target.value)}
                    className="flex-1 rounded border border-notion-border bg-background px-2 py-1 text-xs"
                    data-testid={`table-filter-${c.id}`}
                  >
                    <option value="">Todos</option>
                    {c.filterOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-notion-text-muted truncate">{c.label}</span>
                <input
                  value={value}
                  onChange={(e) => onFilterChange(c.id, e.target.value)}
                  placeholder="Filtrar…"
                  className="flex-1 rounded border border-notion-border bg-background px-2 py-1 text-xs"
                  data-testid={`table-filter-${c.id}`}
                />
              </label>
            );
          })}
        </section>

        <section className="px-3 py-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">Colunas visíveis</div>
          {columns.map((c) => {
            const hidden = hiddenColumns.has(c.id);
            return (
              <label
                key={c.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-notion-hover rounded px-1.5 py-1"
              >
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() => onToggleColumn(c.id)}
                  className="cursor-pointer"
                  data-testid={`table-column-${c.id}`}
                />
                <span className={cn('flex-1 truncate', hidden && 'text-notion-text-muted')}>{c.label}</span>
              </label>
            );
          })}
        </section>
      </div>

      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-notion-border">
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-notion-text-muted hover:text-notion-text cursor-pointer"
          data-testid="table-settings-clear"
        >
          Limpar tudo
        </button>
      </div>
    </div>,
    document.body,
  );
}
