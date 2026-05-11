'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { NOTION_COLORS, findColor } from '@/lib/notion-colors';
import { cn } from '@/lib/utils';

interface ColorSwatchProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorSwatch({ value, onChange }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = findColor(value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-5 h-5 rounded border border-notion-border hover:scale-110 transition-transform cursor-pointer"
        style={{ backgroundColor: current.bg }}
        title={current.label}
        aria-label={`Color: ${current.label}`}
      />
      {open && (
        <div className="absolute z-[120] top-full left-0 mt-1 w-44 bg-background border border-notion-border rounded-md shadow-xl py-1">
          <div className="px-3 py-1 text-[10px] font-semibold text-notion-text-muted uppercase tracking-wider">
            Color
          </div>
          {NOTION_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(c.bg);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer"
            >
              <span
                className="w-4 h-4 rounded border border-notion-border shrink-0"
                style={{ backgroundColor: c.bg }}
              />
              <span className="flex-1 text-left text-notion-text">{c.label}</span>
              {c.bg.toLowerCase() === value.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-notion-text-muted" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
