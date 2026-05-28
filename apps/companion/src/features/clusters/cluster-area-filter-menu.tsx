'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AreaOption {
  value: string;
  label: string;
}

interface ClusterAreaFilterMenuProps {
  options: AreaOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}

interface MenuStyle {
  top: number;
  left: number;
  width: number;
}

export function ClusterAreaFilterMenu({
  options,
  selected,
  onToggle,
  onClear,
}: ClusterAreaFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const desiredWidth = Math.max(rect.width, 220);
      const viewportPadding = 8;
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - viewportPadding - desiredWidth),
      );
      const top = Math.min(rect.bottom + 4, window.innerHeight - 240);
      setMenuStyle({ top, left, width: desiredWidth });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const count = selected.size;
  const triggerLabel = count > 0 ? `Áreas (${count})` : 'Áreas (todas)';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-notion-border bg-background px-2.5 text-xs text-notion-text cursor-pointer hover:bg-notion-hover',
          count > 0 && 'border-notion-text/30',
        )}
        data-testid="cluster-area-filter-trigger"
        title="Filtrar por área editorial"
      >
        <span>{triggerLabel}</span>
        <ChevronDown className="h-3 w-3 text-notion-text-muted" />
      </button>
      {open && menuStyle && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="fixed z-[320] rounded-md border border-notion-border bg-background shadow-xl text-sm text-notion-text"
            data-testid="cluster-area-filter-menu"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-notion-border">
              <span className="text-[10px] uppercase tracking-wider text-notion-text-muted">
                Filtrar por área
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-notion-text-muted hover:text-notion-text cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto py-1">
              {options.length === 0 ? (
                <div className="px-3 py-3 text-xs text-notion-text-muted">
                  Nenhuma área disponível.
                </div>
              ) : (
                options.map((opt) => {
                  const checked = selected.has(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-notion-hover"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(opt.value)}
                        className="cursor-pointer"
                        data-testid={`cluster-area-filter-option-${opt.value}`}
                      />
                      <span className="flex-1 truncate">{opt.label}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-notion-border">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-notion-text-muted hover:text-notion-text cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                disabled={count === 0}
                data-testid="cluster-area-filter-clear"
              >
                Limpar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
