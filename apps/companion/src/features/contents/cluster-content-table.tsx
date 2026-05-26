'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterContentModal } from '@/features/clusters/cluster-content-modal';
import {
  ContentLink,
  EditableCell,
  PapelToggle,
  type ClusterRow,
} from '@/features/clusters/cluster-row-cells';
import {
  getCompanionToken,
  patchRow,
  postSatellite,
} from '@/features/clusters/cluster-row-api';

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

function useClusterData(slug: string) {
  const [data, setData] = useState<ClusterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!slug) return;
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

export interface ClusterContentTableProps {
  clusterSlug: string;
  bleedMargin?: boolean;
}

export function ClusterContentTable({ clusterSlug, bleedMargin = false }: ClusterContentTableProps) {
  const slug = clusterSlug;
  const { data, error, loading, refetch } = useClusterData(slug);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const allRows = data?.rows || [];
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => {
      const title = r.conteudo.kind === 'published' ? r.conteudo.title : r.conteudo.slug;
      return (
        title.toLowerCase().includes(q) ||
        r.keyword.toLowerCase().includes(q) ||
        r.intent.toLowerCase().includes(q)
      );
    });
  }, [allRows, query]);
  const counts = useMemo(() => {
    const published = allRows.filter((r) => r.status === 'publicado').length;
    const planned = allRows.filter((r) => r.status === 'planejado').length;
    return { published, planned, total: allRows.length };
  }, [allRows]);

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

  const openContent = useCallback((contentSlug: string) => {
    setOpenSlug(contentSlug);
  }, []);
  const closeModal = useCallback(() => {
    setOpenSlug(null);
    refetch();
  }, [refetch]);

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
    setSubmitting(true);
    setSubmitError(null);
    const result = await postSatellite(slug, title);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.reason || 'erro');
      return;
    }
    setNewTitle('');
    setAddingRow(false);
    refetch();
  }, [newTitle, slug, refetch]);

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
        const res = await postSatellite(slug, item.title);
        if (res.ok) created++;
      }
      setPasteStatus(`adicionado ${created}/${batch.length}`);
      setTimeout(() => setPasteStatus(null), 2500);
      refetch();
    } catch {
      setPasteStatus('falha ao colar');
    }
  }, [slug, refetch]);

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

  return (
    <div
      data-cluster-table={slug || 'unknown'}
      className={cn('my-6 not-prose', bleedMargin && '-mx-12 md:-mx-16')}
    >
      <div ref={wrapperRef} tabIndex={-1} className="overflow-hidden rounded-md border border-notion-border bg-background">
        <header className="flex items-center justify-between gap-3 bg-background px-4 py-3">
          <label className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-md border border-notion-border bg-background px-3 text-sm">
            <Search className="h-5 w-5 text-notion-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conteúdos…"
              className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
            />
          </label>
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
              type="button"
              onClick={refetch}
              className="rounded px-2 py-1 hover:bg-notion-hover hover:text-notion-text cursor-pointer"
              title="Recarregar"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={() => setAddingRow(true)}
              className="inline-flex items-center gap-1 rounded-md bg-notion-text px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 cursor-pointer"
              title="Adicionar novo conteúdo planejado"
              data-testid="cluster-add-row"
            >
              <Plus className="h-3.5 w-3.5" /> Novo conteúdo
            </button>
          </div>
        </header>

        {error && <div className="px-4 py-3 text-xs text-red-600">Erro ao carregar: {error}</div>}
        {loading && !data && <div className="px-4 py-3 text-xs text-notion-text-muted">Carregando…</div>}
        {data && rows.length === 0 && (
          <div className="px-4 py-3 text-xs text-notion-text-muted">Nenhum conteúdo neste cluster ainda.</div>
        )}

        {data && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-notion-border bg-notion-sidebar/30 text-left text-xs uppercase tracking-wider text-notion-text-muted">
                  <th className="px-2 py-2 w-8 font-medium">
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
                  <th className="px-3 py-2 w-[88px] font-medium">Papel</th>
                  <th className="px-3 py-2 font-medium">Conteúdo</th>
                  <th className="px-3 py-2 w-[180px] font-medium">Keyword (vol.)</th>
                  <th className="px-3 py-2 w-[130px] font-medium">Intenção</th>
                  <th className="px-3 py-2 w-[110px] font-medium">Status</th>
                  <th className="px-3 py-2 w-[110px] font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const kind: 'published' | 'planned' = row.status === 'publicado' ? 'published' : 'planned';
                  const isSelected = selectedSlugs.has(row.slug);
                  return (
                    <tr
                      key={`${row.papel}:${row.slug}:${row.status}`}
                      data-cluster-row={row.slug}
                      data-cluster-row-kind={kind}
                      className={cn(
                        'border-b border-notion-border last:border-0 transition-colors',
                        row.status === 'planejado' && 'bg-notion-sidebar/20',
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-notion-hover/50',
                      )}
                    >
                      <td className="px-2 py-2 align-top">
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
                      <td className="px-3 py-2 align-top">
                        <PapelToggle
                          current={row.papel}
                          onCommit={async (next) => {
                            await patchRow(slug, row.slug, 'papel', next, kind);
                            refetch();
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 align-top max-w-[280px]">
                        <ContentLink row={row} onOpenContent={openContent} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <EditableCell
                          initial={row.keyword}
                          placeholder="Keyword"
                          onCommit={async (value) => {
                            await patchRow(slug, row.slug, 'keyword', value, kind);
                            refetch();
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <EditableCell
                          initial={row.intent}
                          placeholder="Intenção"
                          onCommit={async (value) => {
                            await patchRow(slug, row.slug, 'intent', value, kind);
                            refetch();
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={cn(
                            'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                            row.status === 'publicado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          {row.status === 'publicado' ? 'Publicado' : 'Planejado'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-notion-text-muted">{row.updated}</td>
                    </tr>
                  );
                })}
                {addingRow && (
                  <tr data-cluster-row-ghost className="border-b border-notion-border bg-notion-active/30">
                    <td className="px-2 py-2" />
                    <td className="px-3 py-2 align-top text-xs text-notion-text-muted">Satélite</td>
                    <td colSpan={4} className="px-3 py-2">
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
                    <td className="px-3 py-2 align-top text-xs text-notion-text-muted">{submitting ? '…' : 'Enter ↵'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ClusterContentModal contentSlug={openSlug} onClose={closeModal} />
    </div>
  );
}
