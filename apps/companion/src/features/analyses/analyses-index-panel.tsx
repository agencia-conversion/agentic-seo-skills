'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ListingColumn, ListingPanel } from '@/components/listing/listing-panel';
import { useListingState } from '@/components/listing/use-listing-state';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';

interface AnalysisRow {
  id: string;
  path: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  generatedAt: string | null;
  status: string;
  score: string | number | null;
  sourceArtifact: string;
  summary: string;
  contractOk: boolean;
  hash: string | null;
}

interface FilterOption {
  id: string;
  title?: string;
  count: number;
}

export function AnalysesIndexPanel({ moduleId }: { moduleId?: string | null }) {
  const router = useRouter();
  const pagePath = usePagePath();
  const token = useWorkspace((s) => s.token);
  const openReportPage = useWorkspace((s) => s.openReportPage);
  const defaultFilters = useMemo(() => ({ module: moduleId || '', status: '' }), [moduleId]);
  const { query, debouncedQuery, filters, page, setQuery, setFilter, setPage } = useListingState({
    filterKeys: ['module', 'status'],
    defaultFilters,
    resetKey: moduleId || '',
  });
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [total, setTotal] = useState(0);
  const [modules, setModules] = useState<FilterOption[]>([]);
  const [statuses, setStatuses] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), module: filters.module || 'all' });
    if (debouncedQuery.trim()) params.set('query', debouncedQuery.trim());
    if (filters.status) params.set('status', filters.status);
    setLoading(true);
    fetch(`/api/project/analyses?${params}`, {
      headers: { 'x-companion-token': token },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        setRows(data.reports || []);
        setTotal(data.total || 0);
        setModules(data.modules || []);
        setStatuses(data.statuses || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, filters.module, filters.status, page, token]);

  const openRow = (row: AnalysisRow) => {
    const slug = openReportPage(row);
    if (slug) router.push(pagePath(slug));
  };

  const columns = useMemo<ListingColumn<AnalysisRow>[]>(
    () => [
      {
        id: 'analysis',
        header: 'Análise',
        render: (row) => (
          <>
            <div className="flex min-w-0 items-center gap-2 text-notion-text">
              <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
              <span className="truncate">{row.title}</span>
              {!row.contractOk && (
                <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
                  contrato incompleto
                </span>
              )}
            </div>
            <div className="mt-0.5 line-clamp-1 text-xs text-notion-text-muted">{row.summary || row.path}</div>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-notion-text-muted md:hidden">
              <span>{row.moduleTitle}</span>
              <span>·</span>
              <span>{statusLabel(row.status)}</span>
              {row.score != null && (
                <>
                  <span>·</span>
                  <span>{row.score}</span>
                </>
              )}
            </div>
          </>
        ),
      },
      {
        id: 'type',
        header: 'Tipo',
        className: 'hidden w-44 md:table-cell',
        render: (row) => (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded border border-notion-border px-2 py-1 text-xs text-notion-text-muted">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{row.moduleTitle}</span>
          </span>
        ),
      },
      {
        id: 'date',
        header: 'Data',
        className: 'hidden w-32 lg:table-cell',
        render: (row) => <span className="whitespace-nowrap text-notion-text-muted">{formatDate(row.generatedAt)}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        className: 'hidden w-28 lg:table-cell',
        render: (row) => <span className="text-notion-text-muted">{statusLabel(row.status)}</span>,
      },
      {
        id: 'score',
        header: 'Score',
        className: 'w-24',
        render: (row) => <span className="text-notion-text-muted">{row.score ?? '-'}</span>,
      },
    ],
    []
  );

  return (
    <ListingPanel
      title="Análises"
      loading={loading}
      loadingLabel="Carregando análises..."
      countLabel={`${total} análise${total === 1 ? '' : 's'}`}
      query={query}
      queryPlaceholder="Buscar análises"
      filters={[
        {
          id: 'module',
          label: 'Módulo',
          value: filters.module,
          allLabel: 'Todos os módulos',
          options: modules,
          onChange: (value) => {
            setFilter('module', value);
          },
          formatOption: (item) => `${item.title || item.id} (${item.count})`,
        },
        {
          id: 'status',
          label: 'Status',
          value: filters.status,
          allLabel: 'Todos os status',
          options: statuses,
          onChange: (value) => {
            setFilter('status', value);
          },
          formatOption: (item) => `${statusLabel(item.id)} (${item.count})`,
        },
      ]}
      rows={rows}
      columns={columns}
      page={page}
      totalPages={totalPages}
      emptyText="Nenhuma análise encontrada."
      onQueryChange={setQuery}
      onPageChange={setPage}
      onOpenRow={openRow}
      getRowKey={(row) => row.id}
      getRowLabel={(row) => `Abrir análise ${row.title}`}
    />
  );
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function statusLabel(value: string) {
  if (value === 'ready') return 'Pronta';
  if (value === 'draft') return 'Rascunho';
  if (value === 'blocked') return 'Bloqueada';
  return value || '-';
}
