'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Sidebar } from '@/features/workspace/sidebar';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

interface BrokenEntry {
  source: string;
  rawTarget: string;
  line: number;
  type: 'wikilink' | 'embed' | 'markdown';
}

interface BrokenResponse {
  ok: boolean;
  total: number;
  grouped: { source: string; entries: BrokenEntry[] }[];
  flat: BrokenEntry[];
}

export default function BrokenLinksPage() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const initializeProject = useWorkspace((s) => s.initializeProject);
  const storeToken = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const buildPagePath = usePagePath();

  const [data, setData] = useState<BrokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || storeToken === token) return;
    initializeProject(token).catch((err) => setError(err?.message || 'init failed'));
  }, [initializeProject, storeToken, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/project/broken-links?token=${encodeURIComponent(token)}`, {
      headers: { 'x-companion-token': token },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload: BrokenResponse) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openSource = (sourcePath: string) => {
    const page = pages.find((p) => p.path === sourcePath);
    if (page) router.push(buildPagePath(page.slug));
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-12 px-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md z-20 select-none">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded hover:bg-notion-hover text-notion-text-muted hover:text-notion-text transition-colors"
            aria-label={t('common.back') || 'Voltar'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-medium text-notion-text">
            {t('brokenLinks.title') || 'Links quebrados'}
          </h1>
          {data && (
            <span data-testid="broken-total" className="text-xs text-notion-text-muted">
              ({data.total})
            </span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-12 md:px-16 py-10 max-w-3xl mx-auto w-full">
          {loading && !data && (
            <div data-testid="broken-loading" className="text-sm text-notion-text-muted">
              {t('common.loading') || 'Carregando…'}
            </div>
          )}
          {error && (
            <div data-testid="broken-error" className="rounded-md bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {data && data.total === 0 && (
            <div data-testid="broken-empty" className="rounded-md border border-notion-border bg-notion-sidebar/40 px-6 py-12 text-center">
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm text-notion-text">{t('brokenLinks.empty') || 'Nenhum link quebrado.'}</p>
              <p className="text-xs text-notion-text-muted mt-1">
                {t('brokenLinks.emptyHint') || 'Todos os wikilinks e markdown links resolvem corretamente.'}
              </p>
            </div>
          )}
          {data && data.total > 0 && (
            <ul data-testid="broken-list" className="space-y-4">
              {data.grouped.map(({ source, entries }) => {
                const sourcePage = pages.find((p) => p.path === source);
                return (
                  <li key={source} data-testid="broken-source-group" data-source={source}>
                    <button
                      onClick={() => openSource(source)}
                      className="text-sm font-medium text-notion-text hover:underline flex items-center gap-2 mb-2"
                    >
                      {sourcePage?.icon || <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      <span>{sourcePage?.title || source}</span>
                      <span className="text-[10px] text-notion-text-muted font-mono">{source}</span>
                    </button>
                    <ul className="space-y-1 ml-6">
                      {entries.map((entry, idx) => (
                        <li
                          key={`${entry.line}-${entry.rawTarget}-${idx}`}
                          data-testid="broken-entry"
                          data-target={entry.rawTarget}
                          className="flex items-center gap-2 text-xs text-notion-text-muted py-1"
                        >
                          <span className="font-mono text-red-500">
                            {entry.type === 'embed' ? '![[' : entry.type === 'wikilink' ? '[[' : '[]('}
                            {entry.rawTarget}
                            {entry.type === 'embed' || entry.type === 'wikilink' ? ']]' : ')'}
                          </span>
                          <span className="text-[10px]">
                            · {t('brokenLinks.line') || 'linha'} {entry.line}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
