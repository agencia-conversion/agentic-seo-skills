'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ListingColumn, ListingPanel } from '@/components/listing/listing-panel';
import { useListingState } from '@/components/listing/use-listing-state';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

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
  const { t } = useI18n();
  const token = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const loadPage = useWorkspace((s) => s.loadPage);
  const defaultFilters = useMemo(() => ({ origin: '', topicCluster: topicClusterId || '' }), [topicClusterId]);
  const { query, debouncedQuery, filters, page, setQuery, setFilter, setPage } = useListingState({
    filterKeys: ['origin', 'topicCluster'],
    defaultFilters,
    resetKey: topicClusterId || '',
  });
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [origins, setOrigins] = useState<FilterOption[]>([]);
  const [topicClusters, setTopicClusters] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageByPath = useMemo(() => new Map(pages.map((item) => [item.path, item])), [pages]);
  const columns = useMemo<ListingColumn<ContentRow>[]>(
    () => [
      {
        id: 'content',
        header: t('contentIndex.columnContent'),
        render: (row) => (
          <>
            <div className="flex min-w-0 items-center gap-2 text-notion-text">
              <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
              <span className="truncate">{row.title}</span>
            </div>
            <div className="mt-0.5 line-clamp-1 text-xs text-notion-text-muted">{row.excerpt || row.path}</div>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-notion-text-muted md:hidden">
              <span>{originLabel(t, row.origin)}</span>
              <span>·</span>
              <span>{row.topicClusterTitle || t('contentIndex.noTopicCluster')}</span>
            </div>
          </>
        ),
      },
      {
        id: 'origin',
        header: t('contentIndex.columnOrigin'),
        className: 'hidden w-32 md:table-cell',
        render: (row) => <span className="text-notion-text-muted">{originLabel(t, row.origin)}</span>,
      },
      {
        id: 'topicCluster',
        header: t('contentIndex.columnTopicCluster'),
        className: 'hidden w-48 lg:table-cell',
        render: (row) => <span className="line-clamp-2 break-words text-notion-text-muted">{row.topicClusterTitle || t('contentIndex.noTopicCluster')}</span>,
      },
      {
        id: 'area',
        header: t('contentIndex.columnArea'),
        className: 'hidden w-36 xl:table-cell',
        render: (row) => <span className="line-clamp-2 break-words text-notion-text-muted">{row.area || t('common.dateUnknown')}</span>,
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
    if (filters.origin) params.set('origin', filters.origin);
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
  }, [debouncedQuery, filters.origin, filters.topicCluster, page, token]);

  return (
    <ListingPanel
      title={t('project.contents')}
      loading={loading}
      loadingLabel={t('contentIndex.loading')}
      countLabel={t(total === 1 ? 'contentIndex.countOne' : 'contentIndex.countOther', { count: total })}
      query={query}
      queryPlaceholder={t('contentIndex.searchPlaceholder')}
      filters={[
        {
          id: 'origin',
          label: t('contentIndex.columnOrigin'),
          value: filters.origin,
          allLabel: t('contentIndex.allOrigins'),
          options: origins,
          onChange: (value) => {
            setFilter('origin', value);
          },
          formatOption: (item) => `${originLabel(t, item.id)} (${item.count})`,
        },
        {
          id: 'topicCluster',
          label: t('contentIndex.columnTopicCluster'),
          value: filters.topicCluster,
          allLabel: t('contentIndex.allTopicClusters'),
          options: topicClusters,
          onChange: (value) => {
            setFilter('topicCluster', value);
          },
          formatOption: (item) => `${(item.title || item.id) === '__none__' ? t('contentIndex.noTopicCluster') : item.title || item.id} (${item.count})`,
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
    />
  );
}

type Translator = (key: string, vars?: Record<string, string | number>) => string;

function originLabel(t: Translator, value: string) {
  if (value === 'blog') return t('contentIndex.origin.blog');
  if (value === 'linkedin') return t('contentIndex.origin.linkedin');
  if (value === 'podcast') return t('contentIndex.origin.podcast');
  if (value === 'outros') return t('contentIndex.origin.outros');
  return value || t('common.dateUnknown');
}

function statusLabel(t: Translator, value: string) {
  if (value === 'published') return t('contentIndex.statusPublished');
  if (value === 'draft') return t('contentIndex.statusDraft');
  return value || t('common.dateUnknown');
}
