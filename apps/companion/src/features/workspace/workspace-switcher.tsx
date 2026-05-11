'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, Settings as SettingsIcon } from 'lucide-react';
import { useWorkspace } from './store';

export function WorkspaceSwitcher() {
  const projectName = useWorkspace((s) => s.projectName);
  const projectRoot = useWorkspace((s) => s.projectRoot);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-notion-hover text-[11px] text-notion-text-muted w-full text-left"
        title={projectRoot}
      >
        <span className="truncate flex-1 whitespace-nowrap">{projectName || 'Projeto local'}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-background border border-notion-border rounded-md shadow-lg z-50 p-1">
          <div className="px-2 py-1 text-[10px] text-notion-text-muted uppercase tracking-wider">
            Projeto local
          </div>
          <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-notion-active/40 text-sm text-left">
            <div className="w-6 h-6 rounded bg-notion-text/10 text-notion-text flex items-center justify-center shrink-0">
              <Folder className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-notion-text">{projectName}</div>
              <div className="truncate text-[10px] text-notion-text-muted">{projectRoot}</div>
            </div>
            <Check className="w-3.5 h-3.5 shrink-0 text-notion-text-muted" />
          </div>
          <div className="border-t border-notion-border mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent('noteblock:open-settings'));
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-notion-hover text-sm text-notion-text-muted hover:text-notion-text cursor-pointer"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Preferências locais</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
