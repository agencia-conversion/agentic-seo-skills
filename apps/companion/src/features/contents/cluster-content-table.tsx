'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { ArrowDown, ArrowUp, Plus, Search, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/toast';
import { Select } from '@/components/select';
import { EditableSelectCell } from '@/features/clusters/editable-select-cell';
import {
  ContentLink,
  EditableCell,
  PapelToggle,
  TambemEmChips,
  type ClusterRow,
} from '@/features/clusters/cluster-row-cells';
import { TableSettingsMenu, type TableColumnDef, type SortState } from './table-settings-menu';
import {
  getCompanionToken,
  patchContentMetadata,
  patchRow,
  postSatellite,
} from '@/features/clusters/cluster-row-api';
import { dataTableWidthClass } from '@/features/workspace/page-width';
import {
  intentLabel,
  editorialStatusLabel,
  INTENT_CANONICAL_OPTIONS,
  EDITORIAL_STATUS_CANONICAL_OPTIONS,
} from '@/lib/cluster-labels';
import { useWorkspace } from '@/features/workspace/store';
import { CreateContentModal } from './create-content-modal';

interface ClusterResponse {
  ok: boolean;
  cluster: {
    slug: string;
    nome: string;
    icon: string | null;
    area: string | null;
    status: string | null;
    tese: string | null;
    pilar_slug: string | null;
  };
  rows: ClusterRow[];
}

interface AllContentsItem {
  id: string;
  path: string;
  title: string;
  slug: string;
  origin: string;
  topic_cluster: string | null;
  topicClusterTitle: string | null;
  topic_clusters: string[];
  topicClusterTitles: string[];
  keyword: string | null;
  intent: string | null;
  keyword_volume: number | null;
  published_at: string;
  updated: string;
  status: string;
}

interface AllContentsResponse {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  topicClusters: Array<{ id: string; title: string; count: number }>;
  items: AllContentsItem[];
}

const PAGE_SIZE_ALL = 25;
const EMPTY_HIDDEN_COLUMNS_BY_TABLE: Record<string, string[]> = {};

function useClusterData(slug: string | null) {
  const [data, setData] = useState<ClusterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const token = getCompanionToken();
    if (!token) {
      setError('missing-token');
      return;
    }
    setLoading(true);
    fetch(`/api/project/cluster/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`, {
      headers: { 'x-companion-token': token },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http-${r.status}`))))
      .then((json: ClusterResponse) => {
        setData(json);
        setError(null);
      })
      .catch((err) => setError(String(err?.message || err)))
      .finally(() => setLoading(false));
  }, [slug, tick]);

  const refetch = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, refetch };
}

function useAllContentsData(
  enabled: boolean,
  query: string,
  topicCluster: string,
  page: number,
  sort: SortState | null,
) {
  const [data, setData] = useState<AllContentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const token = getCompanionToken();
    if (!token) {
      setError('missing-token');
      return;
    }
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE_ALL) });
    if (query.trim()) params.set('query', query.trim());
    if (topicCluster) params.set('topicCluster', topicCluster);
    if (sort?.column) {
      const mapped = sort.column === 'conteudo' ? 'title' : sort.column === 'clusters' ? 'clusters' : sort.column;
      params.set('sort', mapped);
      params.set('direction', sort.direction);
    }
    setLoading(true);
    fetch(`/api/project/contents?${params}`, {
      headers: { 'x-companion-token': token },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http-${r.status}`))))
      .then((json: AllContentsResponse) => {
        setData(json);
        setError(null);
      })
      .catch((err) => setError(String(err?.message || err)))
      .finally(() => setLoading(false));
  }, [enabled, query, topicCluster, page, sort, tick]);

  const refetch = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, refetch };
}

function normalizeContentToClusterRow(item: AllContentsItem): ClusterRow {
  const updated = item.updated || item.published_at || '—';
  return {
    slug: item.slug,
    papel: 'satelite',
    papel_label: '—',
    conteudo: {
      kind: 'published',
      title: item.title,
      href: item.path,
      origem: item.origin,
    },
    keyword: item.keyword || '',
    keyword_volume: item.keyword_volume,
    intent: item.intent || '',
    status: item.status === 'published' ? 'publicado' : 'planejado',
    editorial_status: 'published',
    acao: '—',
    updated,
    tambem_em: item.topic_clusters || [],
  };
}

function rowsToTsv(rows: ClusterRow[]): string {
  const header = ['Papel', 'Conteúdo', 'Keyword', 'Intenção', 'Status', 'Ação', 'Atualizado'];
  const body = rows.map((row) => {
    const conteudo = row.conteudo.kind === 'published' ? row.conteudo.title : row.conteudo.slug;
    return [row.papel_label, conteudo, row.keyword, row.intent, row.status, row.acao, row.updated]
      .map((v) => String(v).replace(/\t/g, ' ').replace(/\n/g, ' '))
      .join('\t');
  });
  return [header.join('\t'), ...body].join('\n');
}

function parseTsvForBatch(tsv: string): Array<{ title: string }> {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const firstCols = lines[0].split('\t').map((c) => c.trim().toLowerCase());
  const start = firstCols.includes('papel') || firstCols.includes('conteúdo') ? 1 : 0;
  const out: Array<{ title: string }> = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const title = (cols[1] ?? cols[0] ?? '').trim();
    if (title) out.push({ title });
  }
  return out;
}

function SortableHeader({
  column,
  label,
  sort,
  onToggle,
  width,
}: {
  column: string;
  label: string;
  sort: SortState | null;
  onToggle: (column: string) => void;
  width?: string;
}) {
  const active = sort?.column === column;
  return (
    <th className={cn('px-2.5 py-1.5 font-medium', width)}>
      <button
        type="button"
        onClick={() => onToggle(column)}
        className="group inline-flex items-center gap-1 text-left hover:text-notion-text cursor-pointer"
      >
        <span>{label}</span>
        {active ? (
          sort?.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3 opacity-0 transition-opacity group-hover:opacity-40" />
        )}
      </button>
    </th>
  );
}

function readCellValue(row: ClusterRow, column: string): string {
  switch (column) {
    case 'papel':
      return row.papel_label || row.papel;
    case 'clusters':
      return (row.tambem_em || []).join(', ');
    case 'conteudo':
      return row.conteudo.kind === 'published' ? row.conteudo.title : row.conteudo.slug;
    case 'keyword':
      return keywordDisplay(row);
    case 'intent':
      return row.intent;
    case 'editorial_status':
      return row.editorial_status;
    case 'status':
      return row.status;
    case 'updated':
      return row.updated;
    default:
      return '';
  }
}

function formatVolume(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '';
  return value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);
}

function keywordDisplay(row: ClusterRow): string {
  const keyword = row.keyword || '';
  const volume = formatVolume(row.keyword_volume);
  if (!keyword) return volume ? `(${volume})` : '';
  return volume ? `${keyword} (${volume})` : keyword;
}

export interface ClusterContentTableProps {
  clusterSlug?: string;
  bleedMargin?: boolean;
  followPageWidth?: boolean;
}

export function ClusterContentTable({ clusterSlug, bleedMargin = false, followPageWidth = true }: ClusterContentTableProps) {
  const isClusterScopedByProp = Boolean(clusterSlug);
  const [localClusterFilter, setLocalClusterFilter] = useState<string>('');
  const effectiveCluster = clusterSlug || localClusterFilter || null;
  const isClusterScoped = Boolean(effectiveCluster);

  const clusterData = useClusterData(isClusterScoped ? effectiveCluster : null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);
  const allContentsData = useAllContentsData(
    !isClusterScoped,
    query,
    localClusterFilter,
    page,
    sort,
  );

  const language = useWorkspace((s) => s.settings.language);
  const customIntents = useWorkspace((s) => s.settings.customIntents);
  const locale: 'pt-BR' | 'en' = language === 'en' ? 'en' : 'pt-BR';
  const intentOptions = useMemo(() => {
    const canonical = INTENT_CANONICAL_OPTIONS.map((opt) => ({
      value: opt.value,
      label: intentLabel(opt.value, locale),
    }));
    const customs = (customIntents || [])
      .filter((v) => !INTENT_CANONICAL_OPTIONS.some((o) => o.value === v))
      .map((v) => ({ value: v, label: intentLabel(v, locale) }));
    return [...canonical, ...customs];
  }, [customIntents, locale]);
  const editorialStatusOptions = useMemo(
    () =>
      EDITORIAL_STATUS_CANONICAL_OPTIONS.map((opt) => ({
        value: opt.value,
        label: editorialStatusLabel(opt.value, locale),
      })),
    [locale],
  );
  const [addingRow, setAddingRow] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [optimisticEdits, setOptimisticEdits] = useState<Record<string, Partial<ClusterRow>>>({});
  const applyOptimistic = useCallback(
    (slug: string, patch: Partial<ClusterRow>) => {
      setOptimisticEdits((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
    },
    [],
  );
  const clearOptimistic = useCallback((slug: string) => {
    setOptimisticEdits((prev) => {
      if (!prev[slug]) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, []);
  const cycleSort = useCallback((column: string) => {
    if (!isClusterScoped) setPage(1);
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }, [isClusterScoped]);
  const tableSettingsKey = isClusterScoped ? 'content-cluster' : 'content-all';
  const hiddenColumnsByTable = useWorkspace((s) => s.settings.hiddenColumnsByTable) || EMPTY_HIDDEN_COLUMNS_BY_TABLE;
  const hiddenColumnsFromSettings = hiddenColumnsByTable[tableSettingsKey] || [];
  const setWorkspaceSettings = useWorkspace((s) => s.setSettings);
  const hiddenColumns = useMemo(
    () => new Set<string>(hiddenColumnsFromSettings || []),
    [hiddenColumnsFromSettings],
  );
  const toggleColumn = useCallback(
    (col: string) => {
      const next = new Set(hiddenColumns);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      setWorkspaceSettings({
        hiddenColumnsByTable: {
          ...hiddenColumnsByTable,
          [tableSettingsKey]: Array.from(next),
        },
      });
    },
    [hiddenColumns, hiddenColumnsByTable, setWorkspaceSettings, tableSettingsKey],
  );

  const refetch = useCallback(() => {
    if (isClusterScoped) clusterData.refetch();
    else allContentsData.refetch();
  }, [isClusterScoped, clusterData, allContentsData]);

  const allRows = useMemo<ClusterRow[]>(() => {
    const base = isClusterScoped
      ? clusterData.data?.rows || []
      : (allContentsData.data?.items || []).map(normalizeContentToClusterRow);
    if (Object.keys(optimisticEdits).length === 0) return base;
    return base.map((row) => {
      const patch = optimisticEdits[row.slug];
      return patch ? { ...row, ...patch } : row;
    });
  }, [isClusterScoped, clusterData.data, allContentsData.data, optimisticEdits]);

  const rows = useMemo(() => {
    let working = allRows;
    if (isClusterScoped) {
      const q = query.trim().toLowerCase();
      if (q) {
        working = working.filter((r) => {
          const title = r.conteudo.kind === 'published' ? r.conteudo.title : r.conteudo.slug;
          return (
            title.toLowerCase().includes(q) ||
            r.keyword.toLowerCase().includes(q) ||
            r.intent.toLowerCase().includes(q)
          );
        });
      }
    }
    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v && v.length > 0);
    if (activeFilters.length > 0) {
      working = working.filter((r) =>
        activeFilters.every(([col, value]) => {
          const cell = readCellValue(r, col).toLowerCase();
          return cell.includes(value.toLowerCase());
        }),
      );
    }
    if (sort) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      working = [...working].sort((a, b) => {
        const av = readCellValue(a, sort.column);
        const bv = readCellValue(b, sort.column);
        return av.localeCompare(bv, undefined, { numeric: true }) * dir;
      });
    }
    return working;
  }, [allRows, query, isClusterScoped, columnFilters, sort]);

  const counts = useMemo(() => {
    if (isClusterScoped) {
      const published = allRows.filter((r) => r.status === 'publicado').length;
      const planned = allRows.filter((r) => r.status === 'planejado').length;
      return { published, planned, total: allRows.length };
    }
    return {
      published: allRows.filter((r) => r.status === 'publicado').length,
      planned: allRows.filter((r) => r.status === 'planejado').length,
      total: allContentsData.data?.total ?? allRows.length,
    };
  }, [allRows, isClusterScoped, allContentsData.data]);

  const data = isClusterScoped ? clusterData.data : allContentsData.data;
  const error = isClusterScoped ? clusterData.error : allContentsData.error;
  const loading = isClusterScoped ? clusterData.loading : allContentsData.loading;

  const totalPages = isClusterScoped
    ? 1
    : Math.max(1, Math.ceil((allContentsData.data?.total || 0) / PAGE_SIZE_ALL));

  const clusterFilterOptions = useMemo(() => {
    const items = allContentsData.data?.topicClusters || [];
    return [
      { value: '', label: locale === 'en' ? 'All clusters' : 'Todos os clusters' },
      ...items.map((c) => ({
        value: c.id,
        label: c.id === '__none__'
          ? (locale === 'en' ? 'No cluster' : 'Sem cluster')
          : `${c.title || c.id} (${c.count})`,
      })),
    ];
  }, [allContentsData.data, locale]);

  const allSelected = rows.length > 0 && rows.every((r) => selectedSlugs.has(r.slug));
  const someSelected = rows.some((r) => selectedSlugs.has(r.slug));
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);
  const toggleSelectAll = useCallback(() => {
    setSelectedSlugs((prev) => {
      if (rows.every((r) => prev.has(r.slug))) {
        const next = new Set(prev);
        for (const r of rows) next.delete(r.slug);
        return next;
      }
      const next = new Set(prev);
      for (const r of rows) next.add(r.slug);
      return next;
    });
  }, [rows]);

  const toggleSelect = useCallback(
    (rowSlug: string, multi: boolean) => {
      setSelectedSlugs((prev) => {
        const next = new Set(multi ? prev : []);
        if (next.has(rowSlug)) next.delete(rowSlug);
        else next.add(rowSlug);
        return next;
      });
    },
    [],
  );

  const commitNewRow = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      setAddingRow(false);
      return;
    }
    if (!effectiveCluster) {
      setAddingRow(false);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const result = await postSatellite(effectiveCluster, title);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.reason || 'erro');
      return;
    }
    setNewTitle('');
    setAddingRow(false);
    refetch();
  }, [newTitle, effectiveCluster, refetch]);

  const copySelected = useCallback(async () => {
    const selected = rows.filter((r) => selectedSlugs.has(r.slug));
    if (selected.length === 0) return;
    const tsv = rowsToTsv(selected);
    try {
      await navigator.clipboard.writeText(tsv);
      setPasteStatus(`copiado ${selected.length} linha${selected.length === 1 ? '' : 's'}`);
      setTimeout(() => setPasteStatus(null), 2000);
    } catch {
      setPasteStatus('falha ao copiar');
    }
  }, [rows, selectedSlugs]);

  const pasteRows = useCallback(async () => {
    if (!effectiveCluster) {
      setPasteStatus('Cole só com cluster selecionado');
      setTimeout(() => setPasteStatus(null), 2500);
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const batch = parseTsvForBatch(text);
      if (batch.length === 0) {
        setPasteStatus('clipboard vazio');
        return;
      }
      setPasteStatus(`colando ${batch.length}…`);
      let created = 0;
      for (const item of batch) {
        const res = await postSatellite(effectiveCluster, item.title);
        if (res.ok) created++;
      }
      setPasteStatus(`adicionado ${created}/${batch.length}`);
      setTimeout(() => setPasteStatus(null), 2500);
      refetch();
    } catch {
      setPasteStatus('falha ao colar');
    }
  }, [effectiveCluster, refetch]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(document.activeElement)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 'c' && selectedSlugs.size > 0) {
        event.preventDefault();
        void copySelected();
      } else if (key === 'v') {
        event.preventDefault();
        void pasteRows();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedSlugs, copySelected, pasteRows]);

  const onNewContent = useCallback(() => {
    if (effectiveCluster && isClusterScoped) setAddingRow(true);
    else setCreateOpen(true);
  }, [effectiveCluster, isClusterScoped]);

  const dataTableAttr = effectiveCluster || 'all';

  const columnDefs = useMemo<TableColumnDef[]>(() => {
    const roleCol: TableColumnDef = isClusterScoped
      ? { id: 'papel', label: 'Papel', filterKind: 'select', filterOptions: [
          { value: 'pilar', label: 'Pilar' },
          { value: 'satelite', label: 'Satélite' },
        ] }
      : { id: 'clusters', label: 'Cluster(s)', filterKind: 'text' };
    return [
      roleCol,
      { id: 'conteudo', label: 'Conteúdo', filterKind: 'text' },
      { id: 'keyword', label: 'Keyword', filterKind: 'text' },
      {
        id: 'intent',
        label: 'Intenção',
        filterKind: 'select',
        filterOptions: intentOptions,
      },
      {
        id: 'editorial_status',
        label: 'Status',
        filterKind: 'select',
        filterOptions: editorialStatusOptions,
      },
      { id: 'updated', label: 'Atualizado', filterKind: 'text' },
    ];
  }, [isClusterScoped, intentOptions, editorialStatusOptions]);

  const isColVisible = useCallback(
    (col: string) => !hiddenColumns.has(col),
    [hiddenColumns],
  );

  return (
    <div
      data-cluster-table={dataTableAttr || 'unknown'}
      className={cn('my-2 not-prose', dataTableWidthClass(followPageWidth), bleedMargin && '-mx-12 md:-mx-16')}
    >
      <div ref={wrapperRef} tabIndex={-1} className="overflow-hidden rounded-md bg-background">
        <header className="flex items-center justify-between gap-2 bg-background px-2.5 py-1.5">
          <label className="flex h-8 w-44 items-center gap-2 rounded-md border border-notion-border bg-background px-2 text-xs shrink-0">
            <Search className="h-3.5 w-3.5 text-notion-text-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isClusterScoped) setPage(1);
              }}
              placeholder="Buscar…"
              className="w-full bg-transparent outline-none placeholder:text-notion-text-muted text-xs"
            />
          </label>
          <div className="flex-1" />
          {!isClusterScopedByProp && (
            <div data-testid="cluster-filter-select" className="shrink-0">
              <Select
                value={localClusterFilter}
                onChange={(v) => {
                  setLocalClusterFilter(v);
                  setPage(1);
                  setSelectedSlugs(new Set());
                }}
                options={clusterFilterOptions}
                placeholder={locale === 'en' ? 'Filter by cluster' : 'Filtrar por cluster'}
                triggerClassName="h-9 min-w-[160px] border border-notion-border px-3"
              />
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-notion-text-muted">
            <span>
              {counts.published} publicado{counts.published === 1 ? '' : 's'}
              {counts.planned > 0 && ` · ${counts.planned} planejado${counts.planned === 1 ? '' : 's'}`}
              {selectedSlugs.size > 0 && ` · ${selectedSlugs.size} selecionada${selectedSlugs.size === 1 ? '' : 's'}`}
            </span>
            {pasteStatus && (
              <span className="text-emerald-700" data-testid="cluster-paste-status">
                {pasteStatus}
              </span>
            )}
            {selectedSlugs.size > 0 && (
              <button
                type="button"
                onClick={() => void copySelected()}
                className="rounded px-2 py-1 hover:bg-notion-hover hover:text-notion-text cursor-pointer"
                title="Copiar selecionadas (Cmd+C)"
                data-testid="cluster-copy-selected"
              >
                Copiar
              </button>
            )}
            <button
              ref={tableMenuButtonRef}
              type="button"
              onClick={() => setTableMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-notion-hover hover:text-notion-text cursor-pointer"
              title="Configurar tabela (ordenar, filtrar, colunas)"
              data-testid="cluster-table-settings"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onNewContent}
              className="inline-flex items-center gap-1 rounded-md bg-notion-text px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
              title="Adicionar novo conteúdo"
              data-testid="cluster-add-row"
            >
              <Plus className="h-3.5 w-3.5" /> Novo conteúdo
            </button>
          </div>
        </header>

        {error && <div className="px-4 py-3 text-xs text-red-600">Erro ao carregar: {error}</div>}
        {loading && !data && <div className="px-4 py-3 text-xs text-notion-text-muted">Carregando…</div>}
        {data && rows.length === 0 && (
          <div className="px-4 py-3 text-xs text-notion-text-muted">
            {isClusterScoped ? 'Nenhum conteúdo neste cluster ainda.' : 'Nenhum conteúdo encontrado.'}
          </div>
        )}

        {data && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-notion-border bg-notion-sidebar/30 text-left text-xs uppercase tracking-wider text-notion-text-muted">
                  <th className="px-2 py-1.5 w-8 font-medium">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                      aria-label="Selecionar todas as linhas"
                      data-testid="cluster-select-all"
                    />
                  </th>
                  {isClusterScoped && isColVisible('papel') && (
                    <SortableHeader column="papel" label="Papel" sort={sort} onToggle={cycleSort} width="w-[88px]" />
                  )}
                  {!isClusterScoped && isColVisible('clusters') && (
                    <SortableHeader column="clusters" label="Cluster(s)" sort={sort} onToggle={cycleSort} width="w-[180px]" />
                  )}
                  {isColVisible('conteudo') && (
                    <SortableHeader column="conteudo" label="Conteúdo" sort={sort} onToggle={cycleSort} />
                  )}
                  {isColVisible('keyword') && (
                    <SortableHeader column="keyword" label="Keyword (vol.)" sort={sort} onToggle={cycleSort} width="w-[180px]" />
                  )}
                  {isColVisible('intent') && (
                    <SortableHeader column="intent" label="Intenção" sort={sort} onToggle={cycleSort} width="w-[130px]" />
                  )}
                  {isColVisible('editorial_status') && (
                    <SortableHeader column="editorial_status" label="Status" sort={sort} onToggle={cycleSort} width="w-[110px]" />
                  )}
                  {isColVisible('updated') && (
                    <SortableHeader column="updated" label="Atualizado" sort={sort} onToggle={cycleSort} width="w-[110px]" />
                  )}
                </tr>
              </thead>
              <tbody>
                <LayoutGroup>
                {rows.map((row) => {
                  const kind: 'published' | 'planned' = row.status === 'publicado' ? 'published' : 'planned';
                  const isSelected = selectedSlugs.has(row.slug);
                  const singleClusterFallback = !isClusterScoped && row.tambem_em.length === 1 ? row.tambem_em[0] : null;
                  const editCluster: string | null = effectiveCluster || singleClusterFallback;
                  const canEditClusterFields = Boolean(editCluster);
                  const canEditContentMetadata = kind === 'published' || Boolean(editCluster);
                  return (
                    <motion.tr
                      key={`${row.slug}`}
                      layout={rows.length <= 50 ? 'position' : false}
                      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                      data-cluster-row={row.slug}
                      data-cluster-row-kind={kind}
                      className={cn(
                        'border-b border-notion-border last:border-0 transition-colors',
                        row.status === 'planejado' && 'bg-notion-sidebar/20',
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-notion-hover/50',
                      )}
                    >
                      <td className="px-2 py-1.5 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            toggleSelect(row.slug, (e.nativeEvent as MouseEvent | KeyboardEvent).metaKey || (e.nativeEvent as MouseEvent | KeyboardEvent).ctrlKey || true)
                          }
                          className="cursor-pointer"
                          aria-label={`Selecionar ${row.slug}`}
                        />
                      </td>
                      {isClusterScoped && effectiveCluster && isColVisible('papel') && (
                        <td className="px-2.5 py-1.5 align-top">
                          <PapelToggle
                            current={row.papel}
                            onCommit={async (next) => {
                              const res = await patchRow(effectiveCluster, row.slug, 'papel', next, kind);
                              if (res.ok && next === 'pilar') {
                                showToast('Promovido a pilar — movido para o topo', 'success');
                              }
                              refetch();
                            }}
                          />
                        </td>
                      )}
                      {!isClusterScoped && isColVisible('clusters') && (
                        <td className="px-2.5 py-1.5 align-top">
                          <TambemEmChips slugs={row.tambem_em} />
                        </td>
                      )}
                      {isColVisible('conteudo') && (
                        <td className="px-2.5 py-1.5 align-top max-w-[280px]">
                          <ContentLink row={row} />
                        </td>
                      )}
                      {isColVisible('keyword') && (
                        <td className="px-2.5 py-1.5 align-top">
                          {canEditContentMetadata ? (
                            <div className="flex items-center gap-1">
                              <div className="flex-1">
                                <EditableCell
                                  initial={row.keyword}
                                  placeholder="Keyword"
                                  onCommit={async (value) => {
                                    applyOptimistic(row.slug, { keyword: value });
                                    const res = kind === 'published'
                                      ? await patchContentMetadata(row.slug, 'keyword', value)
                                      : editCluster
                                        ? await patchRow(editCluster, row.slug, 'keyword', value, kind)
                                        : { ok: false, reason: 'missing-cluster' };
                                    if (!res.ok) {
                                      clearOptimistic(row.slug);
                                      showToast('Falha ao salvar keyword', 'error');
                                      return;
                                    }
                                  }}
                                />
                              </div>
                              {formatVolume(row.keyword_volume) && (
                                <span className="shrink-0 text-[10px] text-notion-text-muted">
                                  ({formatVolume(row.keyword_volume)})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-notion-text-muted">{keywordDisplay(row) || '—'}</span>
                          )}
                        </td>
                      )}
                      {isColVisible('intent') && (
                        <td className="px-2.5 py-1.5 align-top">
                          {canEditContentMetadata ? (
                            <EditableSelectCell
                              value={row.intent}
                              options={intentOptions}
                              placeholder={locale === 'en' ? 'Intent' : 'Intenção'}
                              onCommit={async (value) => {
                                applyOptimistic(row.slug, { intent: value });
                                const res = kind === 'published'
                                  ? await patchContentMetadata(row.slug, 'intent', value)
                                  : editCluster
                                    ? await patchRow(editCluster, row.slug, 'intent', value, kind)
                                    : { ok: false, reason: 'missing-cluster' };
                                if (!res.ok) {
                                  clearOptimistic(row.slug);
                                  showToast('Falha ao salvar intent', 'error');
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs text-notion-text-muted">{row.intent || '—'}</span>
                          )}
                        </td>
                      )}
                      {isColVisible('editorial_status') && (
                        <td className="px-2.5 py-1.5 align-top">
                          {canEditClusterFields && editCluster ? (
                            <EditableSelectCell
                              value={row.editorial_status as ClusterRow['editorial_status']}
                              options={editorialStatusOptions}
                              placeholder={locale === 'en' ? 'Status' : 'Status'}
                              onCommit={async (value) => {
                                applyOptimistic(row.slug, { editorial_status: value as ClusterRow['editorial_status'] });
                                const res = await patchRow(editCluster, row.slug, 'editorial_status', value, kind);
                                if (!res.ok) {
                                  clearOptimistic(row.slug);
                                  showToast('Falha ao salvar status', 'error');
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs text-notion-text-muted">
                              {row.status === 'publicado' ? 'Publicado' : 'Planejado'}
                            </span>
                          )}
                        </td>
                      )}
                      {isColVisible('updated') && (
                        <td className="px-2.5 py-1.5 align-top text-xs text-notion-text-muted">{row.updated}</td>
                      )}
                    </motion.tr>
                  );
                })}
                </LayoutGroup>
                {addingRow && (
                  <tr data-cluster-row-ghost className="border-b border-notion-border bg-notion-active/30">
                    <td className="px-2 py-1.5" />
                    <td className="px-2.5 py-1.5 align-top text-xs text-notion-text-muted">Satélite</td>
                    <td colSpan={4} className="px-2.5 py-1.5">
                      <input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void commitNewRow();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setNewTitle('');
                            setAddingRow(false);
                            setSubmitError(null);
                          }
                        }}
                        onBlur={() => {
                          if (!submitting) {
                            if (newTitle.trim()) void commitNewRow();
                            else setAddingRow(false);
                          }
                        }}
                        placeholder="Título do novo conteúdo…"
                        disabled={submitting}
                        className="w-full rounded border border-notion-border bg-background px-2 py-1 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 disabled:opacity-60"
                      />
                      {submitError && <div className="mt-1 text-xs text-red-600">Erro: {submitError}</div>}
                    </td>
                    <td className="px-2.5 py-1.5 align-top text-xs text-notion-text-muted">{submitting ? '…' : 'Enter ↵'}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!isClusterScoped && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-notion-border px-4 py-2 text-xs text-notion-text-muted">
                <span>
                  Página {page} de {totalPages} · {counts.total} conteúdo{counts.total === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded px-2 py-1 hover:bg-notion-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded px-2 py-1 hover:bg-notion-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <CreateContentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          refetch();
        }}
      />
      <TableSettingsMenu
        open={tableMenuOpen}
        anchorRef={tableMenuButtonRef}
        columns={columnDefs}
        sort={sort}
        onSortChange={setSort}
        filters={columnFilters}
        onFilterChange={(col, value) =>
          setColumnFilters((prev) => ({ ...prev, [col]: value }))
        }
        hiddenColumns={hiddenColumns}
        onToggleColumn={toggleColumn}
        onClose={() => setTableMenuOpen(false)}
        onClear={() => {
          setSort(null);
          setColumnFilters({});
          const next = { ...hiddenColumnsByTable };
          delete next[tableSettingsKey];
          setWorkspaceSettings({ hiddenColumnsByTable: next });
        }}
      />
    </div>
  );
}
