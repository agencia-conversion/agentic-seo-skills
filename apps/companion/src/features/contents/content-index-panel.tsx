'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';

interface ContentRow {
  id: string;
  path: string;
  title: string;
  slug: string;
  origin: string;
  area: string;
  topic_cluster: string | null;
  topicClusterTitle: string | null;
  published_at: string;
  updated: string;
  status: string;
  excerpt: string;
}

interface FilterOption {
  id: string;
  title?: string;
  count: number;
}

export function ContentIndexPanel({ topicClusterId }: { topicClusterId?: string | null }) {
  const router = useRouter();
  const pagePath = usePagePath();
  const token = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const loadPage = useWorkspace((s) => s.loadPage);
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('');
  const [topicCluster, setTopicCluster] = useState(topicClusterId || '');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [origins, setOrigins] = useState<FilterOption[]>([]);
  const [topicClusters, setTopicClusters] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageByPath = useMemo(() => new Map(pages.map((item) => [item.path, item])), [pages]);

  const openRow = (row: ContentRow) => {
    const pageForContent = pageByPath.get(row.path);
    if (!pageForContent) return;
    setActivePage(pageForContent.id);
    void loadPage(pageForContent.id);
    router.push(pagePath(pageForContent.slug));
  };

  useEffect(() => {
    setPage(1);
    setTopicCluster(topicClusterId || '');
  }, [topicClusterId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set('query', query.trim());
    if (origin) params.set('origin', origin);
    if (topicCluster) params.set('topicCluster', topicCluster);
    setLoading(true);
    fetch(`/api/project/contents?${params}`, {
      headers: { 'x-companion-token': token },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) return;
        setRows(data.items || []);
        setTotal(data.total || 0);
        setOrigins(data.origins || []);
        setTopicClusters(data.topicClusters || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, page, query, token, topicCluster]);

  return (
    <VirtualPageShell title="Conteúdos">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-notion-text-muted">
            {loading ? 'Carregando conteúdos...' : `${total} conteúdo${total === 1 ? '' : 's'}`}
          </div>
          <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
            <Search className="h-4 w-4 text-notion-text-muted" />
            <input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Buscar conteúdos"
              className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={origin}
            onChange={(event) => {
              setPage(1);
              setOrigin(event.target.value);
            }}
            className="h-9 rounded-md border border-notion-border bg-background px-3 text-sm text-notion-text outline-none"
          >
            <option value="">Todas as origens</option>
            {origins.map((item) => (
              <option key={item.id} value={item.id}>
                {originLabel(item.id)} ({item.count})
              </option>
            ))}
          </select>
          <select
            value={topicCluster}
            onChange={(event) => {
              setPage(1);
              setTopicCluster(event.target.value);
            }}
            className="h-9 rounded-md border border-notion-border bg-background px-3 text-sm text-notion-text outline-none"
          >
            <option value="">Todos os Topic Clusters</option>
            {topicClusters.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.title || item.id) === '__none__' ? 'Sem cluster' : item.title || item.id} ({item.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-notion-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-notion-sidebar text-left text-xs uppercase text-notion-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Conteúdo</th>
              <th className="hidden w-32 px-3 py-2 font-medium md:table-cell">Origem</th>
              <th className="hidden w-48 px-3 py-2 font-medium lg:table-cell">Topic Cluster</th>
              <th className="hidden w-36 px-3 py-2 font-medium xl:table-cell">Área</th>
              <th className="w-28 px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-notion-text-muted">
                  Nenhum conteúdo encontrado.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir conteúdo ${row.title}`}
                onClick={() => openRow(row)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  openRow(row);
                }}
                className="cursor-pointer border-t border-notion-border transition-colors hover:bg-notion-hover focus-visible:bg-notion-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-text/10"
              >
                <td className="min-w-0 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2 text-notion-text">
                    <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
                    <span className="truncate">{row.title}</span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-notion-text-muted">{row.excerpt || row.path}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-notion-text-muted md:hidden">
                    <span>{originLabel(row.origin)}</span>
                    <span>·</span>
                    <span>{row.topicClusterTitle || 'Sem cluster'}</span>
                  </div>
                </td>
                <td className="hidden px-3 py-2 text-notion-text-muted md:table-cell">{originLabel(row.origin)}</td>
                <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">
                  <span className="line-clamp-2 break-words">{row.topicClusterTitle || 'Sem cluster'}</span>
                </td>
                <td className="hidden px-3 py-2 text-notion-text-muted xl:table-cell">
                  <span className="line-clamp-2 break-words">{row.area || '-'}</span>
                </td>
                <td className="px-3 py-2 text-xs text-notion-text-muted">{statusLabel(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-notion-text-muted">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
            className="rounded-md border border-notion-border p-1.5 disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-notion-border p-1.5 disabled:opacity-40"
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </VirtualPageShell>
  );
}

function originLabel(value: string) {
  if (value === 'blog') return 'Blog';
  if (value === 'linkedin') return 'LinkedIn';
  if (value === 'podcast') return 'Podcast';
  if (value === 'outros') return 'Outros';
  return value || '-';
}

function statusLabel(value: string) {
  if (value === 'published') return 'Publicado';
  if (value === 'draft') return 'Rascunho';
  return value || '-';
}
