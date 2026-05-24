'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Folder, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

export function UserFooter({
  projectName,
  projectRoot,
  onSettings,
}: {
  projectName: string;
  projectRoot: string;
  onSettings: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-notion-hover text-left transition-colors group cursor-pointer',
          open && 'bg-notion-hover'
        )}
      >
        <div className="w-7 h-7 rounded-full bg-notion-text/10 text-notion-text flex items-center justify-center shrink-0">
          <Folder className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm text-notion-text truncate leading-tight">{projectName}</span>
          <span className="block text-[10px] text-notion-text-muted truncate leading-tight">{t('project.localFiles')}</span>
        </div>
        <ChevronUp className={cn('w-3.5 h-3.5 text-notion-text-muted transition-transform shrink-0', !open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border border-notion-border rounded-md shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-notion-border">
            <div className="text-sm font-medium text-notion-text truncate">{projectName}</div>
            <div className="text-[11px] text-notion-text-muted truncate">{projectRoot}</div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer transition-colors text-notion-text"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{t('project.preferences')}</span>
            <span className="text-[10px] text-notion-text-muted/60 font-mono">⌘,</span>
          </button>
        </div>
      )}
    </div>
  );
}
