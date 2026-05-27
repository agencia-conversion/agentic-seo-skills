'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, Sliders } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { ConfirmModal } from '@/components/confirm-modal';
import { cn } from '@/lib/utils';
import { getCompanionToken } from './cluster-row-api';
import { EditableSelectCell } from './editable-select-cell';
import { ClusterRowActionsMenu } from './cluster-row-actions-menu';
import { ClusterAreaFilterMenu } from './cluster-area-filter-menu';
import { TableSettingsMenu, type SortState, type TableColumnDef } from '@/features/contents/table-settings-menu';
import { dataTableWidthClass } from '@/features/workspace/page-width';
import { useWorkspace } from '@/features/workspace/store';
import { CreateClusterModal } from './create-cluster-modal';
import { formatRowError } from '@/lib/row-error-messages';
import { syncBus } from '@/lib/sync-bus';

interface ClusterSummary {
  slug: string;
  name: string;
  icon: string | null;
  area: string | null;
  area_name: string | null;
  thesis: string | null;
  status: string;
  pillar_slug: string | null;
  pillar_title: string | null;
  pillar_path: string | null;
  published: number;
  planned: number;
  updated: string | null;
}

interface ContentOption {
  slug: string;
  title: string;
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
    <th className={`px-2.5 py-1.5 font-medium${width ? ` ${width}` : ''}`}>
      <button
        type="button"
        onClick={() => onToggle(column)}
        className="group inline-flex items-center gap-1 text-left hover:text-notion-text cursor-pointer"
      >
        <span>{label}</span>
        {active ? (
          sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-40" />
        )}
      </button>
    </th>
  );
}

function RenameClusterInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const commit = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) {
      onCancel();
      return;
    }
    void onCommit(trimmed);
  };

  const cancel = () => {
    closedRef.current = true;
    onCancel();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
      }}
      className="min-w-0 flex-1 rounded border border-notion-border bg-background px-2 py-1 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
    />
  );
}

function readValue(row: ClusterSummary, column: string): string {
  switch (column) {
    case 'cluster':
      return row.name;
    case 'pillar':
      return row.pillar_title || row.pillar_slug || '';
    case 'published':
      return String(row.published || 0);
    case 'status':
      return row.status || '';
    case 'updated':
      return row.updated || '';
    default:
      return '';
  }
}

const EMPTY_HIDDEN_COLUMNS_BY_TABLE: Record<string, string[]> = {};
const EMPTY_AREA_FILTERS_BY_TABLE: Record<string, string[]> = {};

export function ActiveClustersTable({ followPageWidth = true }: { followPageWidth?: boolean }) {
  const router = useRouter();
  const token = useWorkspace((s) => s.token);
  const refreshProjectTree = useWorkspace((s) => s.refreshProjectTree);
  const settings = useWorkspace((s) => s.settings);
  const setSettings = useWorkspace((s) => s.setSettings);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [contents, setContents] = useState<ContentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState | null>({ column: 'cluster', direction: 'asc' });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClusterSlug, setEditingClusterSlug] = useState<string | null>(null);
  const [archivingCluster, setArchivingCluster] = useState<{ slug: string; name: string } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const tableKey = 'active-clusters';
  const hiddenByTable = settings.hiddenColumnsByTable || EMPTY_HIDDEN_COLUMNS_BY_TABLE;
  const hiddenColumns = useMemo(() => new Set(hiddenByTable[tableKey] || []), [hiddenByTable]);
  const areaFiltersByTable = settings.clusterAreaFiltersByTable || EMPTY_AREA_FILTERS_BY_TABLE;
  const selectedAreas = useMemo(
    () => new Set(areaFiltersByTable[tableKey] || []),
    [areaFiltersByTable],
  );
  const locale: 'pt-BR' | 'en' = settings.language === 'en' ? 'en' : 'pt-BR';

  const hasLoadedOnce = useRef(false);
  const fetchClusters = useCallback(async (opts?: { silent?: boolean }) => {
    const companionToken = getCompanionToken();
    if (!companionToken) return;
    const silent = opts?.silent ?? hasLoadedOnce.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/project/clusters?token=${encodeURIComponent(companionToken)}`, {
        headers: { 'x-companion-token': companionToken },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.reason || 'cluster-load-failed');
      setClusters(json.clusters || []);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchContents = useCallback(async () => {
    const companionToken = getCompanionToken();
    if (!companionToken) return;
    const res = await fetch(`/api/project/contents?page=1&pageSize=100&sort=title&direction=asc`, {
      headers: { 'x-companion-token': companionToken },
    });
    const json = await res.json().catch(() => null);
    if (json?.ok && Array.isArray(json.items)) {
      setContents(json.items.map((item: any) => ({ slug: item.slug, title: item.title || item.slug })));
    }
  }, []);

  useEffect(() => {
    void fetchClusters();
    void fetchContents();
  }, [fetchClusters, fetchContents]);

  // Refetch when any view (drawer, contents list, cluster table) reports
  // a cluster mutation. Cluster status, name, or pillar may have changed.
  useEffect(() => {
    return syncBus.on((event) => {
      if (event.type === 'clusters:changed' || event.type === 'cluster:changed') {
        void fetchClusters();
      } else if (event.type === 'content:changed') {
        void fetchClusters();
        void fetchContents();
      }
    });
  }, [fetchClusters, fetchContents]);

  const activeClusters = useMemo(
    () => clusters.filter((row) => row.status === 'active'),
    [clusters],
  );

  const areaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of activeClusters) {
      if (row.area) map.set(row.area, row.area_name || row.area);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [activeClusters]);

  const activeRows = useMemo(() => {
    let rows = activeClusters;
    if (selectedAreas.size > 0) {
      rows = rows.filter((row) => row.area && selectedAreas.has(row.area));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        [row.name, row.slug, row.pillar_title, row.pillar_slug, row.status].some((value) =>
          String(value || '').toLowerCase().includes(q),
        ),
      );
    }
    const activeFilters = Object.entries(filters).filter(([, value]) => value);
    if (activeFilters.length) {
      rows = rows.filter((row) =>
        activeFilters.every(([column, value]) => readValue(row, column).toLowerCase().includes(value.toLowerCase())),
      );
    }
    if (sort) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) =>
        readValue(a, sort.column).localeCompare(readValue(b, sort.column), 'pt-BR', { numeric: true }) * dir,
      );
    }
    return rows;
  }, [activeClusters, filters, query, selectedAreas, sort]);

  const totalActive = activeClusters.length;
  const filteringActive = selectedAreas.size > 0;
  const countLabel = filteringActive
    ? `${activeRows.length} de ${totalActive} ativo${totalActive === 1 ? '' : 's'}`
    : `${activeRows.length} ativo${activeRows.length === 1 ? '' : 's'}`;

  const updateSelectedAreas = useCallback(
    (next: Set<string>) => {
      const nextByTable = { ...areaFiltersByTable };
      if (next.size === 0) {
        delete nextByTable[tableKey];
      } else {
        nextByTable[tableKey] = Array.from(next);
      }
      setSettings({ clusterAreaFiltersByTable: nextByTable });
    },
    [areaFiltersByTable, setSettings, tableKey],
  );

  const toggleAreaFilter = useCallback(
    (value: string) => {
      const next = new Set(selectedAreas);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      updateSelectedAreas(next);
    },
    [selectedAreas, updateSelectedAreas],
  );

  const clearAreaFilter = useCallback(() => {
    updateSelectedAreas(new Set());
  }, [updateSelectedAreas]);

  const columnDefs: TableColumnDef[] = [
    { id: 'cluster', label: 'Cluster', filterKind: 'text' },
    { id: 'pillar', label: 'Pilar', filterKind: 'text' },
    { id: 'published', label: 'Publicados', filterKind: 'text' },
    { id: 'status', label: 'Status', filterKind: 'select', filterOptions: [
      { value: 'active', label: 'active' },
      { value: 'drafting', label: 'drafting' },
      { value: 'proposed', label: 'proposed' },
    ] },
    { id: 'updated', label: 'Atualizado', filterKind: 'text' },
  ];

  const isVisible = (column: string) => !hiddenColumns.has(column);
  const toggleColumn = (column: string) => {
    const next = new Set(hiddenColumns);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    setSettings({
      hiddenColumnsByTable: {
        ...hiddenByTable,
        [tableKey]: Array.from(next),
      },
    });
  };

  const cycleSort = (column: string) => {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  };

  const patchCluster = async (slug: string, payload: Record<string, unknown>) => {
    const companionToken = getCompanionToken();
    if (!companionToken) return { ok: false, reason: 'missing-token' };
    const res = await fetch(`/api/project/cluster/${encodeURIComponent(slug)}?token=${encodeURIComponent(companionToken)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-companion-token': companionToken },
      body: JSON.stringify({ ...payload, syncWait: true }),
    });
    const json = await res.json().catch(() => ({ ok: false, reason: `http-${res.status}` }));
    if (json.ok) {
      syncBus.emit({ type: 'clusters:changed' });
      syncBus.emit({ type: 'cluster:changed', slug });
      await fetchClusters();
      await refreshProjectTree();
    }
    return json;
  };

  const copySelected = async () => {
    const picked = activeRows.filter((row) => selected.has(row.slug));
    if (!picked.length) return;
    const lines = [
      ['Cluster', 'Pilar', 'Publicados', 'Planejados', 'Status', 'Atualizado'].join('\t'),
      ...picked.map((row) =>
        [row.name, row.pillar_title || row.pillar_slug || '', row.published, row.planned, row.status, row.updated || ''].join('\t'),
      ),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast(`${picked.length} cluster${picked.length === 1 ? '' : 's'} copiado${picked.length === 1 ? '' : 's'}`, 'success');
  };

  return (
    <div data-active-clusters-table className={cn('my-2 not-prose', dataTableWidthClass(followPageWidth))}>
      <div className="overflow-hidden rounded-md bg-background">
        <header className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <label className="flex h-8 w-48 shrink-0 items-center gap-2 rounded-md border border-notion-border bg-background px-2 text-xs">
              <Search className="h-3.5 w-3.5 text-notion-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar clusters…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-notion-text-muted"
              />
            </label>
            <ClusterAreaFilterMenu
              options={areaOptions}
              selected={selectedAreas}
              onToggle={toggleAreaFilter}
              onClear={clearAreaFilter}
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-xs text-notion-text-muted">
            <span data-testid="cluster-area-filter-count">{countLabel}</span>
            {selected.size > 0 && (
              <button type="button" onClick={() => void copySelected()} className="rounded px-2 py-1 hover:bg-notion-hover cursor-pointer">
                Copiar
              </button>
            )}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-notion-hover cursor-pointer"
              title="Configurar tabela"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-notion-text px-3 py-1.5 font-medium text-background hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Novo cluster
            </button>
          </div>
        </header>
        {error && <div className="px-4 py-3 text-xs text-red-600">Erro ao carregar: {error}</div>}
        {loading && clusters.length === 0 && <div className="px-4 py-3 text-xs text-notion-text-muted">Carregando…</div>}
        {!loading && activeRows.length === 0 && <div className="px-4 py-3 text-xs text-notion-text-muted">Nenhum cluster ativo.</div>}
        {activeRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-notion-border bg-notion-sidebar/30 text-left text-xs uppercase tracking-wider text-notion-text-muted">
                  <th className="w-8 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={activeRows.length > 0 && activeRows.every((row) => selected.has(row.slug))}
                      onChange={() => {
                        setSelected((prev) => {
                          if (activeRows.every((row) => prev.has(row.slug))) return new Set();
                          return new Set(activeRows.map((row) => row.slug));
                        });
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  {isVisible('cluster') && <SortableHeader column="cluster" label="Cluster" sort={sort} onToggle={cycleSort} />}
                  {isVisible('pillar') && <SortableHeader column="pillar" label="Pilar" sort={sort} onToggle={cycleSort} />}
                  {isVisible('published') && <SortableHeader column="published" label="Publicados" sort={sort} onToggle={cycleSort} width="w-[90px]" />}
                  {isVisible('status') && <SortableHeader column="status" label="Status" sort={sort} onToggle={cycleSort} />}
                  {isVisible('updated') && <SortableHeader column="updated" label="Atualizado" sort={sort} onToggle={cycleSort} />}
                  <th className="w-10 px-1 py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.slug} className="border-b border-notion-border last:border-0 hover:bg-notion-hover/50">
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(row.slug)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.slug)) next.delete(row.slug);
                            else next.add(row.slug);
                            return next;
                          })
                        }
                        className="cursor-pointer"
                      />
                    </td>
                    {isVisible('cluster') && (
                      <td className="px-2.5 py-1.5 align-top min-w-[320px]">
                        <div className="flex items-center gap-1.5">
                          {editingClusterSlug === row.slug ? (
                            <RenameClusterInput
                              initial={row.name}
                              onCancel={() => setEditingClusterSlug(null)}
                              onCommit={async (value) => {
                                const previous = row.name;
                                setClusters((prev) => prev.map((c) => (c.slug === row.slug ? { ...c, name: value } : c)));
                                setEditingClusterSlug(null);
                                const result = await patchCluster(row.slug, { name: value });
                                if (!result.ok) {
                                  setClusters((prev) => prev.map((c) => (c.slug === row.slug ? { ...c, name: previous } : c)));
                                  showToast(formatRowError('cluster', result.reason, locale), 'error');
                                }
                              }}
                            />
                          ) : (
                            <a
                              href={token ? `/project/${encodeURIComponent(token)}/brain-topic-clusters-${row.slug}` : `#brain-topic-clusters-${row.slug}`}
                              onClick={(event) => {
                                if (!token || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                                event.preventDefault();
                                router.push(`/project/${encodeURIComponent(token)}/brain-topic-clusters-${row.slug}`);
                              }}
                              className="min-w-0 truncate text-sm font-medium text-notion-text underline-offset-2 hover:underline"
                            >
                              {row.name}
                            </a>
                          )}
                        </div>
                      </td>
                    )}
                    {isVisible('pillar') && (
                      <td className="px-2.5 py-1.5 align-top">
                        <div className="max-w-[260px] overflow-hidden">
                          {row.pillar_path && token ? (
                            <a
                              href={`/project/${encodeURIComponent(token)}/${row.pillar_path.replace(/\.md$/, '').replace(/\//g, '-')}`}
                              onClick={(event) => {
                                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                                event.preventDefault();
                                router.push(`/project/${encodeURIComponent(token)}/${row.pillar_path!.replace(/\.md$/, '').replace(/\//g, '-')}`);
                              }}
                              className="block truncate text-sm text-notion-text underline-offset-2 hover:underline"
                              title={row.pillar_title || row.pillar_slug || ''}
                            >
                              {row.pillar_title || row.pillar_slug}
                            </a>
                          ) : (
                            <span
                              className="block truncate text-xs text-notion-text-muted"
                              title={row.pillar_slug || '—'}
                            >
                              {row.pillar_slug || '—'}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {isVisible('published') && (
                      <td
                        className="px-2.5 py-1.5 align-top text-xs text-notion-text-muted tabular-nums w-[90px]"
                        title={`${row.published} publicado(s) / ${row.published + row.planned} total (publicados + planejados)`}
                      >
                        {row.published}/{row.published + row.planned}
                      </td>
                    )}
                    {isVisible('status') && (
                      <td className="px-2.5 py-1.5 align-top min-w-[120px]">
                        <EditableSelectCell
                          value={row.status}
                          options={[
                            { value: 'active', label: 'active' },
                            { value: 'drafting', label: 'drafting' },
                            { value: 'proposed', label: 'proposed' },
                          ]}
                          onCommit={async (value) => {
                            const previous = row.status;
                            setClusters((prev) => prev.map((c) => (c.slug === row.slug ? { ...c, status: value } : c)));
                            const result = await patchCluster(row.slug, { status: value });
                            if (!result.ok) {
                              setClusters((prev) => prev.map((c) => (c.slug === row.slug ? { ...c, status: previous } : c)));
                              showToast(formatRowError('status', result.reason, locale), 'error');
                            }
                          }}
                        />
                      </td>
                    )}
                    {isVisible('updated') && <td className="px-2.5 py-1.5 align-top text-xs text-notion-text-muted">{row.updated || '—'}</td>}
                    <td className="w-10 px-1 py-1.5 align-top text-right">
                      <ClusterRowActionsMenu
                        slug={row.slug}
                        name={row.name}
                        status={row.status}
                        onOpen={() => {
                          if (!token) return;
                          router.push(`/project/${encodeURIComponent(token)}/brain-topic-clusters-${row.slug}`);
                        }}
                        onRename={() => setEditingClusterSlug(row.slug)}
                        onStatusChange={async (next) => {
                          const previous = row.status;
                          setClusters((prev) => prev.map((c) => (c.slug === row.slug ? { ...c, status: next } : c)));
                          const result = await patchCluster(row.slug, { status: next });
                          if (!result.ok) {
                            setClusters((prev) => prev.map((c) => (c.slug === row.slug ? { ...c, status: previous } : c)));
                            showToast(formatRowError('status', result.reason, locale), 'error');
                          } else {
                            showToast(`Status atualizado: ${next}`, 'success');
                          }
                        }}
                        onArchive={() => setArchivingCluster({ slug: row.slug, name: row.name })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreateClusterModal
        open={createOpen}
        contents={contents}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await fetchClusters();
          await fetchContents();
          await refreshProjectTree();
        }}
      />
      <TableSettingsMenu
        open={menuOpen}
        anchorRef={menuButtonRef}
        columns={columnDefs}
        sort={sort}
        onSortChange={setSort}
        filters={filters}
        onFilterChange={(column, value) => setFilters((prev) => ({ ...prev, [column]: value }))}
        hiddenColumns={hiddenColumns}
        onToggleColumn={toggleColumn}
        onClose={() => setMenuOpen(false)}
        onClear={() => {
          setSort(null);
          setFilters({});
          const next = { ...hiddenByTable };
          delete next[tableKey];
          setSettings({ hiddenColumnsByTable: next });
        }}
      />
      <ConfirmModal
        isOpen={!!archivingCluster}
        title="Arquivar cluster"
        description={`Tem certeza que deseja arquivar "${archivingCluster?.name || ''}"? O cluster sairá da lista de ativos.`}
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={async () => {
          const target = archivingCluster;
          if (!target) return;
          setArchivingCluster(null);
          const result = await patchCluster(target.slug, { status: 'archived' });
          showToast(
            result.ok ? 'Cluster arquivado' : 'Falha ao arquivar cluster',
            result.ok ? 'success' : 'error',
          );
        }}
        onClose={() => setArchivingCluster(null)}
      />
    </div>
  );
}
