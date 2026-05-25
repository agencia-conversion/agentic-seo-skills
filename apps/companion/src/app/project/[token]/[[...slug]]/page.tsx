'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Brain, FilePlus2 } from 'lucide-react';
import { Sidebar } from '@/features/workspace/sidebar';
import { useWorkspace } from '@/features/workspace/store';
import { SearchModal } from '@/features/workspace/search-modal';
import { ToastContainer } from '@/components/toast';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { usePagePath } from '@/hooks/use-page-path';
import { projectSlugMatches } from '@/lib/project-slugs';
import { useI18n } from '@/components/i18n-provider';
import { AnalysesIndexPanel } from '@/features/analyses/analyses-index-panel';
import { ContentIndexPanel } from '@/features/contents/content-index-panel';
import { WorkbenchIndexPanel } from '@/features/workbench/workbench-index-panel';
import { SourceViewerModal } from '@/features/sources/source-viewer-modal';
import { LinkEditModal } from '@/features/editor/link-edit-modal';
import { ClusterDetailPanel } from '@/features/clusters/cluster-detail-panel';

const EditorPanel = dynamic(() => import('@/features/editor/editor-panel').then((mod) => mod.EditorPanel), {
  ssr: false,
  loading: () => <EditorPanelSkeleton />,
});

export default function ProjectPage() {
  const { t } = useI18n();
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
  const activePage = useMemo(() => pages.find((p) => p.id === activePageId) || null, [activePageId, pages]);

  useKeyboardShortcuts();

  useEffect(() => {
    if (!token || storeToken === token) return;
    initializeProject(token).catch((err) => setError(err?.message || t('project.loadFailed')));
  }, [initializeProject, storeToken, t, token]);

  const pageForSlug = useMemo(() => {
    if (!slug) return null;
    return pages.find((p) => projectSlugMatches(slug, p.slug)) || null;
  }, [pages, slug]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (pages.length === 0) {
      if (slug) router.replace(pagePath(''));
      return;
    }
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
    if (activePageId) loadPage(activePageId).catch((err) => setError(err?.message || t('project.pageLoadFailed')));
  }, [activePageId, loadPage, t]);

  if (error) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-8 text-notion-text">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">{t('project.errorTitle')}</h1>
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
        {pages.length === 0 ? (
          <EmptyWorkspace />
        ) : activePage?.kind === 'brainEmpty' ? (
          <BrainBootstrapPanel />
        ) : activePage?.kind === 'workbenchIndex' ? (
          <WorkbenchIndexPanel />
        ) : activePage?.kind === 'contentIndex' ? (
          <ContentIndexPanel topicClusterId={activePage.contentTopicClusterId} />
        ) : activePage?.kind === 'analysisIndex' ? (
          <AnalysesIndexPanel moduleId={activePage.reportModuleId} />
        ) : activePage?.kind === 'clusterDetail' && activePage.contentTopicClusterId ? (
          <ClusterDetailPanel clusterSlug={activePage.contentTopicClusterId} />
        ) : (
          <EditorPanel />
        )}
      </main>
      <SearchModal />
      <ToastContainer />
      <SourceViewerModal />
      <LinkEditModal />
    </div>
  );
}

function BrainBootstrapPanel() {
  const { t } = useI18n();
  const router = useRouter();
  const pagePath = usePagePath();
  const bootstrapBrain = useWorkspace((s) => s.bootstrapBrain);
  const [busy, setBusy] = useState(false);

  const createBrain = async () => {
    setBusy(true);
    try {
      const id = await bootstrapBrain();
      const created = useWorkspace.getState().pages.find((p) => p.id === id);
      if (created) router.push(pagePath(created.slug));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-notion-active text-notion-text">
          <Brain className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold text-notion-text">{t('brainBootstrap.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-notion-text-muted">{t('brainBootstrap.description')}</p>
        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={createBrain}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-notion-text px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            <Brain className="h-4 w-4" />
            {busy ? t('common.loading') : t('emptyWorkspace.createBrain')}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyWorkspace() {
  const { t } = useI18n();
  const router = useRouter();
  const pagePath = usePagePath();
  const canBootstrapBrain = useWorkspace((s) => s.canBootstrapBrain);
  const bootstrapBrain = useWorkspace((s) => s.bootstrapBrain);
  const createWorkbenchFile = useWorkspace((s) => s.createWorkbenchFile);
  const [busy, setBusy] = useState<'brain' | 'file' | null>(null);

  const createBrain = async () => {
    setBusy('brain');
    try {
      const id = await bootstrapBrain();
      const created = useWorkspace.getState().pages.find((p) => p.id === id);
      if (created) router.push(pagePath(created.slug));
    } finally {
      setBusy(null);
    }
  };

  const createFile = async () => {
    setBusy('file');
    try {
      const id = await createWorkbenchFile(t('emptyWorkspace.defaultFileTitle'));
      const created = useWorkspace.getState().pages.find((p) => p.id === id);
      if (created) router.push(pagePath(created.slug));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-notion-active text-notion-text">
          <FilePlus2 className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold text-notion-text">{t('emptyWorkspace.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-notion-text-muted">{t('emptyWorkspace.description')}</p>
        <div className="mt-6 flex flex-col sm:flex-row items-stretch justify-center gap-2">
          {canBootstrapBrain && (
            <button
              type="button"
              onClick={createBrain}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-notion-text px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              <Brain className="h-4 w-4" />
              {busy === 'brain' ? t('common.loading') : t('emptyWorkspace.createBrain')}
            </button>
          )}
          <button
            type="button"
            onClick={createFile}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-notion-border px-4 py-2 text-sm font-medium text-notion-text hover:bg-notion-hover disabled:opacity-50"
          >
            <FilePlus2 className="h-4 w-4" />
            {busy === 'file' ? t('common.loading') : t('emptyWorkspace.createFile')}
          </button>
        </div>
      </div>
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
