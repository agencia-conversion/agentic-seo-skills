'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/features/workspace/sidebar';
import { useWorkspace } from '@/features/workspace/store';
import { SearchModal } from '@/features/workspace/search-modal';
import { ToastContainer } from '@/components/toast';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { usePagePath } from '@/hooks/use-page-path';
import { projectSlugMatches } from '@/lib/project-slugs';

const EditorPanel = dynamic(() => import('@/features/editor/editor-panel').then((mod) => mod.EditorPanel), {
  ssr: false,
  loading: () => <EditorPanelSkeleton />,
});

export default function ProjectPage() {
  const params = useParams<{ token: string; slug?: string[] }>();
  const router = useRouter();
  const pathname = usePathname();
  const pagePath = usePagePath();
  const token = params.token;
  const slug = params.slug?.[0] || null;
  const [error, setError] = useState<string | null>(null);

  const initializeProject = useWorkspace((s) => s.initializeProject);
  const loadPage = useWorkspace((s) => s.loadPage);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const hasHydrated = useWorkspace((s) => s._hasHydrated);
  const activePageId = useWorkspace((s) => s.activePageId);
  const pages = useWorkspace((s) => s.pages);
  const storeToken = useWorkspace((s) => s.token);

  useKeyboardShortcuts();

  useEffect(() => {
    if (!token || storeToken === token) return;
    initializeProject(token).catch((err) => setError(err?.message || 'Falha ao carregar projeto'));
  }, [initializeProject, storeToken, token]);

  const pageForSlug = useMemo(() => {
    if (!slug) return null;
    return pages.find((p) => projectSlugMatches(slug, p.slug)) || null;
  }, [pages, slug]);

  useEffect(() => {
    if (!hasHydrated || pages.length === 0) return;
    if (slug && pageForSlug) {
      if (activePageId !== pageForSlug.id) setActivePage(pageForSlug.id);
      return;
    }
    const active = pages.find((p) => p.id === activePageId) || pages[0];
    if (active) {
      const nextPath = pagePath(active.slug);
      if (pathname !== nextPath) router.replace(nextPath);
    }
  }, [activePageId, hasHydrated, pageForSlug, pagePath, pages, pathname, router, setActivePage, slug]);

  useEffect(() => {
    if (activePageId) loadPage(activePageId).catch((err) => setError(err?.message || 'Falha ao carregar página'));
  }, [activePageId, loadPage]);

  if (error) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-8 text-notion-text">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Erro no companion</h1>
          <p className="text-sm text-notion-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasHydrated) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-notion-text/20 border-t-notion-text rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <EditorPanel />
      </main>
      <SearchModal />
      <ToastContainer />
    </div>
  );
}

function EditorPanelSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <header className="h-12 px-4 flex items-center justify-between">
        <div className="h-5 w-44 rounded bg-notion-active/60 animate-pulse" />
        <div className="h-5 w-24 rounded bg-notion-active/60 animate-pulse" />
      </header>
      <div className="flex-1 overflow-hidden px-12 md:px-16 pt-12">
        <div className="mx-auto max-w-3xl">
          <div className="h-14 w-3/5 rounded bg-notion-active/60 animate-pulse mb-8" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-notion-active/50 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-notion-active/50 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-notion-active/50 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
