'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Hash } from 'lucide-react';
import { Sidebar } from '@/features/workspace/sidebar';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

interface TagFileRef {
  path: string;
  title: string;
  source: 'frontmatter' | 'inline' | 'both';
}

interface TagSummary {
  tag: string;
  count: number;
  files: TagFileRef[];
}

interface TagsResponse {
  ok: boolean;
  total: number;
  tags: TagSummary[];
}

export default function TagsPage() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const initializeProject = useWorkspace((s) => s.initializeProject);
  const storeToken = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const buildPagePath = usePagePath();

  const [data, setData] = useState<TagsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (!token || storeToken === token) return;
    initializeProject(token).catch((err) => setError(err?.message || 'init failed'));
  }, [initializeProject, storeToken, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/project/tags?token=${encodeURIComponent(token)}`, {
      headers: { 'x-companion-token': token },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload: TagsResponse) => {
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

  const openFile = (path: string) => {
    const page = pages.find((p) => p.path === path);
    if (page) router.push(buildPagePath(page.slug));
  };

  const activeSummary = data?.tags.find((t) => t.tag === activeTag) || null;

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
            {t('tags.title') || 'Tags'}
          </h1>
          {data && (
            <span data-testid="tags-total" className="text-xs text-notion-text-muted">
              ({data.total})
            </span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-12 md:px-16 py-10 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          <aside data-testid="tags-list" className="space-y-1">
            {loading && !data && (
              <div data-testid="tags-loading" className="text-sm text-notion-text-muted">
                {t('common.loading') || 'Carregando…'}
              </div>
            )}
            {error && (
              <div data-testid="tags-error" className="text-sm text-red-500">
                {error}
              </div>
            )}
            {data && data.total === 0 && (
              <div data-testid="tags-empty" className="text-sm text-notion-text-muted">
                {t('tags.empty') || 'Nenhuma tag encontrada. Adicione `tags: [a, b]` no frontmatter ou `#tag` no body.'}
              </div>
            )}
            {data &&
              data.tags.map((summary) => (
                <button
                  key={summary.tag}
                  data-testid="tag-button"
                  data-tag={summary.tag}
                  onClick={() => setActiveTag(summary.tag)}
                  className={cn(
                    'w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    activeTag === summary.tag
                      ? 'bg-notion-active text-notion-text'
                      : 'hover:bg-notion-hover text-notion-text-muted hover:text-notion-text'
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="truncate font-mono">{summary.tag}</span>
                  </span>
                  <span className="text-[10px] tabular-nums">{summary.count}</span>
                </button>
              ))}
          </aside>
          <section data-testid="tags-detail">
            {!activeSummary && data && data.total > 0 && (
              <p className="text-sm text-notion-text-muted">
                {t('tags.selectHint') || 'Selecione uma tag à esquerda para ver os arquivos.'}
              </p>
            )}
            {activeSummary && (
              <div>
                <h2 className="text-lg font-medium text-notion-text mb-1 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-notion-text-muted" />
                  <span className="font-mono">{activeSummary.tag}</span>
                </h2>
                <p className="text-xs text-notion-text-muted mb-4">
                  {activeSummary.count} {activeSummary.count === 1 ? (t('tags.fileSingular') || 'arquivo') : (t('tags.filePlural') || 'arquivos')}
                </p>
                <ul className="space-y-1">
                  {activeSummary.files.map((file) => (
                    <li
                      key={file.path}
                      data-testid="tag-file"
                      data-path={file.path}
                      onClick={() => openFile(file.path)}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm hover:bg-notion-hover cursor-pointer"
                    >
                      <span className="truncate text-notion-text">{file.title}</span>
                      <span className="text-[10px] text-notion-text-muted font-mono whitespace-nowrap">
                        {file.source === 'both' ? 'fm + inline' : file.source === 'frontmatter' ? 'fm' : 'inline'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
