'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ListingColumn, ListingPanel } from '@/components/listing/listing-panel';
import { useListingState } from '@/components/listing/use-listing-state';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';
import { CreateContentModal } from './create-content-modal';
import { ClusterContentTable } from './cluster-content-table';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';

interface ContentRow {
  id: string;
  path: string;
  title: string;
  slug: string;
  origin: string;
  area: string;
  topic_cluster: string | null;
  topicClusterTitle: string | null;
  topic_clusters?: string[];
  topicClusterTitles?: string[];
  keyword?: string | null;
  keyword_volume?: number | null;
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

export function ContentIndexPanel({ topicClusterId, embedded }: { topicClusterId?: string | null; embedded?: boolean }) {
  if (topicClusterId) {
    const body = <ClusterContentTable clusterSlug={topicClusterId} />;
    if (embedded) return <div className="w-full">{body}</div>;
    return <VirtualPageShell title="Conteúdos">{body}</VirtualPageShell>;
  }
  return <ContentIndexPanelDefault embedded={embedded} />;
}

function ContentIndexPanelDefault({ embedded }: { embedded?: boolean }) {
  const router = useRouter();
  const pagePath = usePagePath();
  const { t } = useI18n();
  const token = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const loadPage = useWorkspace((s) => s.loadPage);
  const defaultFilters = useMemo(() => ({ topicCluster: '' }), []);
  const { query, debouncedQuery, filters, page, setQuery, setFilter, setPage } = useListingState({
    filterKeys: ['topicCluster'],
    defaultFilters,
    resetKey: '',
  });
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [topicClusters, setTopicClusters] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const pageSize = 25;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageByPath = useMemo(() => new Map(pages.map((item) => [item.path, item])), [pages]);
  const columns = useMemo<ListingColumn<ContentRow>[]>(
    () => [
      {
        id: 'content',
        header: t('contentIndex.columnContent'),
        render: (row) => (
          <div className="flex min-w-0 items-center gap-2 text-notion-text">
            <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
            <span className="truncate">{row.title}</span>
          </div>
        ),
      },
      {
        id: 'keyword',
        header: 'Keyword',
        className: 'hidden w-48 md:table-cell',
        render: (row) => (
          <span className="line-clamp-2 break-words text-notion-text-muted">
            {row.keyword
              ? row.keyword_volume && row.keyword_volume > 0
                ? `${row.keyword} (${row.keyword_volume})`
                : row.keyword
              : '—'}
          </span>
        ),
      },
      {
        id: 'topicCluster',
        header: t('contentIndex.columnTopicCluster'),
        className: 'hidden w-48 lg:table-cell',
        render: (row) => <span className="line-clamp-2 break-words text-notion-text-muted">{clusterListLabel(row, t)}</span>,
      },
      {
        id: 'status',
        header: t('contentIndex.columnStatus'),
        className: 'w-28',
        render: (row) => <span className="text-xs text-notion-text-muted">{statusLabel(t, row.status)}</span>,
      },
    ],
    [t]
  );

  const openRow = (row: ContentRow) => {
    const pageForContent = pageByPath.get(row.path);
    if (!pageForContent) return;
    setActivePage(pageForContent.id);
    void loadPage(pageForContent.id);
    router.push(pagePath(pageForContent.slug));
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedQuery.trim()) params.set('query', debouncedQuery.trim());
    if (filters.topicCluster) params.set('topicCluster', filters.topicCluster);
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
        setTopicClusters(data.topicClusters || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, filters.topicCluster, page, token, refreshTick]);

  return (
    <>
      <ListingPanel
        title={t('project.contents')}
        loading={loading}
        embedded={embedded}
        loadingLabel={t('contentIndex.loading')}
        query={query}
        queryPlaceholder={t('contentIndex.searchPlaceholder')}
        filters={[
          {
            id: 'topicCluster',
            label: t('contentIndex.columnTopicCluster'),
            value: filters.topicCluster,
            allLabel: t('contentIndex.allTopicClusters'),
            options: topicClusters,
            onChange: (value) => {
              setFilter('topicCluster', value);
            },
            formatOption: (item) =>
              `${(item.title || item.id) === '__none__' ? t('contentIndex.noTopicCluster') : item.title || item.id} (${item.count})`,
          },
        ]}
        rows={rows}
        columns={columns}
        page={page}
        totalPages={totalPages}
        emptyText={t('contentIndex.emptyState')}
        onQueryChange={setQuery}
        onPageChange={setPage}
        onOpenRow={openRow}
        getRowKey={(row) => row.id}
        getRowLabel={(row) => t('contentIndex.openAria', { title: row.title })}
        toolbar={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-notion-text px-3 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Adicionar conteúdo
          </button>
        }
      />
      <CreateContentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => setRefreshTick((n) => n + 1)}
      />
    </>
  );
}

type Translator = (key: string, vars?: Record<string, string | number>) => string;

function statusLabel(t: Translator, value: string) {
  if (value === 'published') return t('contentIndex.statusPublished');
  if (value === 'draft') return t('contentIndex.statusDraft');
  return value || t('common.dateUnknown');
}

function clusterListLabel(row: ContentRow, t: Translator) {
  const titles = row.topicClusterTitles && row.topicClusterTitles.length > 0
    ? row.topicClusterTitles
    : row.topicClusterTitle
      ? [row.topicClusterTitle]
      : [];
  if (titles.length === 0) return t('contentIndex.noTopicCluster');
  return titles.join(', ');
}
