'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, FileText, Plus } from 'lucide-react';
import { useWorkspace } from './store';
import { usePagePath } from '@/hooks/use-page-path';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

export function NewPageButton() {
  const { t } = useI18n();
  const router = useRouter();
  const createWorkbenchFile = useWorkspace((s) => s.createWorkbenchFile);
  const createContentPage = useWorkspace((s) => s.createContentPage);
  const pagePath = usePagePath();
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

  const create = async (title: string, kind: 'workbench' | 'content' = 'workbench') => {
    setOpen(false);
    const id = kind === 'content' ? await createContentPage(title) : await createWorkbenchFile(title);
    const created = useWorkspace.getState().pages.find((p) => p.id === id);
    if (created) router.push(pagePath(created.slug));
  };

  return (
    <div className="relative flex items-stretch group" ref={ref}>
      <button
        onClick={() => create(t('emptyWorkspace.defaultFileTitle'))}
        className="flex-1 flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-l-md hover:bg-notion-hover transition-colors text-notion-text/80 cursor-pointer"
      >
        <Plus className="w-4 h-4 text-notion-text-muted" />
        <span>{t('sidebar.newPage')}</span>
      </button>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'px-1 rounded-r-md hover:bg-notion-hover text-notion-text-muted cursor-pointer',
          open && 'bg-notion-hover'
        )}
        aria-label={t('common.moreOptions')}
        title={t('common.moreOptions')}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-notion-border rounded-md shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] text-notion-text-muted uppercase tracking-wider">
            {t('project.localProject')}
          </div>
          <button
            onClick={() => create(t('project.defaultContentTitle'), 'content')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer text-left text-notion-text"
          >
            <FileText className="w-4 h-4 text-notion-text-muted" />
            <span className="flex-1 truncate">{t('project.contentInOutros')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
