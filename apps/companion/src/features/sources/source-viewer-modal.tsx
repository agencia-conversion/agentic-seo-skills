'use client';

import { useEffect, useMemo } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { useWorkspace } from '@/features/workspace/store';

export function SourceViewerModal() {
  const { t } = useI18n();
  const path = useWorkspace((s) => s.sourceViewerPath);
  const close = useWorkspace((s) => s.closeSourceViewer);
  const token = useWorkspace((s) => s.token);

  const src = useMemo(() => {
    if (!path || !token) return '';
    return `/api/project/source?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
  }, [path, token]);

  useEffect(() => {
    if (!path) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [path, close]);

  if (!path) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-modal="source-viewer"
      className="fixed inset-0 z-[280] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="w-full max-w-5xl h-[80vh] bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between border-b border-notion-border px-4 py-2 gap-3">
          <div className="flex items-center gap-2 min-w-0 text-sm text-notion-text">
            <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
            <strong className="truncate font-medium">{t('sourceViewer.title', { path })}</strong>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-notion-border px-2.5 py-1 text-xs text-notion-text hover:bg-notion-hover"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('sourceViewer.openInNewTab')}
            </a>
            <button
              type="button"
              onClick={close}
              className="rounded p-1 text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
              aria-label={t('sourceViewer.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        <iframe
          src={src}
          title={path}
          sandbox="allow-same-origin"
          className="flex-1 w-full bg-white"
        />
      </div>
    </div>
  );
}
