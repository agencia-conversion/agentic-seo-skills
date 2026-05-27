'use client';

import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';

const EditorPanel = dynamic(
  () => import('@/features/editor/editor-panel').then((m) => m.EditorPanel),
  { ssr: false },
);

interface ClusterContentModalProps {
  contentSlug: string | null;
  onClose: () => void;
}

function resolvePageId(contentSlug: string, pages: ReturnType<typeof useWorkspace.getState>['pages']) {
  const candidates = [
    `contents/blog/${contentSlug}.md`,
    `contents/linkedin/${contentSlug}.md`,
    `contents/podcast/${contentSlug}.md`,
    `contents/other/${contentSlug}.md`,
  ];
  for (const path of candidates) {
    const found = pages.find((p) => p.path === path);
    if (found) return found.id;
  }
  return null;
}

export function ClusterContentModal({ contentSlug, onClose }: ClusterContentModalProps) {
  const pages = useWorkspace((s) => s.pages);
  const loadPage = useWorkspace((s) => s.loadPage);
  const token = useWorkspace((s) => s.token);
  const router = useRouter();

  const pageId = useMemo(
    () => (contentSlug ? resolvePageId(contentSlug, pages) : null),
    [contentSlug, pages],
  );

  useEffect(() => {
    if (!contentSlug) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contentSlug, onClose]);

  useEffect(() => {
    if (!pageId) return;
    const page = pages.find((p) => p.id === pageId);
    if (page && !page.loaded) void loadPage(pageId);
  }, [pageId, pages, loadPage]);

  const openFullPage = () => {
    if (!pageId || !token) return;
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    onClose();
    router.push(`/project/${token}/${page.slug}`);
  };

  const open = !!contentSlug;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-stretch justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative mx-[10vw] my-[5vh] flex flex-col flex-1 max-w-5xl rounded-lg border border-notion-border bg-background shadow-2xl overflow-hidden"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-2 border-b border-notion-border px-4 py-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-notion-text-muted truncate">
                <span className="font-medium text-notion-text">Conteúdo</span>
                {contentSlug && <span className="font-mono">{contentSlug}</span>}
                {!pageId && contentSlug && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Conteúdo planejado</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={openFullPage}
                  disabled={!pageId}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-notion-text-muted hover:bg-notion-hover hover:text-notion-text disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  title="Abrir página inteira"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir página
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-1.5 text-notion-text-muted hover:bg-notion-hover hover:text-notion-text cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-auto">
              {pageId ? (
                <EditorPanel pageId={pageId} isModal />
              ) : contentSlug ? (
                <div className="p-8 text-sm text-notion-text-muted">
                  Este conteúdo ainda está planejado — não há arquivo em <code>contents/</code> para abrir.
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
