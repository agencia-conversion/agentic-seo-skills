'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';

interface WorkbenchRow {
  id: string;
  path: string;
  title: string;
  folder: string;
  updated: string;
  frontmatter: number;
  excerpt: string;
}

export function WorkbenchIndexPanel() {
  const router = useRouter();
  const pagePath = usePagePath();
  const token = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const setActivePage = useWorkspace((s) => s.setActivePage);
  const loadPage = useWorkspace((s) => s.loadPage);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<WorkbenchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageByPath = useMemo(() => new Map(pages.map((item) => [item.path, item])), [pages]);

  const openRow = (row: WorkbenchRow) => {
    const pageForFile = pageByPath.get(row.path);
    if (!pageForFile) return;
    setActivePage(pageForFile.id);
    void loadPage(pageForFile.id);
    router.push(pagePath(pageForFile.slug));
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set('q', query.trim());
    setLoading(true);
    fetch(`/api/project/workbench?${params}`, { headers: { 'x-companion-token': token } })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        setRows(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query, token]);

  return (
    <VirtualPageShell title="Workbench">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-notion-text-muted">
          {loading ? 'Carregando arquivos...' : `${total} arquivo${total === 1 ? '' : 's'}`}
        </div>
        <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
          <Search className="h-4 w-4 text-notion-text-muted" />
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Buscar no Workbench"
            className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-md border border-notion-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-notion-sidebar text-left text-xs uppercase text-notion-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Arquivo</th>
              <th className="hidden w-44 px-3 py-2 font-medium md:table-cell">Pasta</th>
              <th className="hidden w-40 px-3 py-2 font-medium lg:table-cell">Atualizado</th>
              <th className="hidden w-28 px-3 py-2 font-medium xl:table-cell">Frontmatter</th>
              <th className="w-48 px-3 py-2 font-medium">Caminho</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-notion-text-muted">
                  Nenhum arquivo encontrado.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir arquivo ${row.title}`}
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
                  <div className="mt-1 text-[11px] text-notion-text-muted md:hidden">{row.folder}</div>
                </td>
                <td className="hidden px-3 py-2 text-notion-text-muted md:table-cell">
                  <span className="line-clamp-2 break-words">{row.folder}</span>
                </td>
                <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">{formatDate(row.updated)}</td>
                <td className="hidden px-3 py-2 text-notion-text-muted xl:table-cell">{row.frontmatter}</td>
                <td className="px-3 py-2 text-xs text-notion-text-muted">
                  <span className="line-clamp-2 break-words">{row.path}</span>
                </td>
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

function formatDate(value: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
