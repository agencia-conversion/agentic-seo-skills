'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, FileText, Menu, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { cn } from '@/lib/utils';

interface ReportRow {
  id: string;
  path: string;
  title: string;
  generatedAt: string | null;
  status: string;
  score: string | number | null;
  sourceArtifact: string;
  summary: string;
}

export function ReportModulePanel({ moduleId }: { moduleId?: string }) {
  const router = useRouter();
  const pagePath = usePagePath();
  const token = useWorkspace((s) => s.token);
  const modules = useWorkspace((s) => s.reportModules);
  const openReportPage = useWorkspace((s) => s.openReportPage);
  const sidebarCollapsed = useWorkspace((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspace((s) => s.toggleSidebar);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const activeModule = useMemo(() => modules.find((item) => item.id === moduleId) || null, [moduleId, modules]);

  useEffect(() => {
    if (!moduleId || !token) return;
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({ module: moduleId, page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set('query', query.trim());
    fetch(`/api/project/reports?${params}`, {
      headers: { 'x-companion-token': token },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return;
        setRows(data.reports || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [moduleId, page, query, token]);

  if (!moduleId) {
    return (
      <ReportShell title="Relatórios" sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar}>
        <div className="grid gap-2">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => router.push(pagePath(`virtual-reports-${module.id}`))}
              className="flex items-center justify-between gap-3 rounded-md border border-notion-border px-3 py-2 text-left hover:bg-notion-hover"
            >
              <span className="flex items-center gap-2 min-w-0">
                <BarChart3 className="h-4 w-4 text-notion-text-muted shrink-0" />
                <span className="truncate text-sm font-medium text-notion-text">{module.title}</span>
              </span>
              <span className="text-xs text-notion-text-muted">{module.count}</span>
            </button>
          ))}
        </div>
      </ReportShell>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ReportShell title={activeModule?.title || 'Relatórios'} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-notion-text-muted">
          {loading ? 'Carregando relatórios...' : `${total} relatório${total === 1 ? '' : 's'}`}
        </div>
        <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
          <Search className="h-4 w-4 text-notion-text-muted" />
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Buscar relatórios"
            className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-md border border-notion-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-notion-sidebar text-left text-xs uppercase text-notion-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Relatório</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Data</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Status</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Score</th>
              <th className="px-3 py-2 font-medium">Fonte</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-notion-text-muted">
                  Nenhum relatório encontrado.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              return (
                <tr key={row.id} className="border-t border-notion-border hover:bg-notion-hover">
                  <td className="max-w-[420px] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        const slug = openReportPage(row);
                        if (slug) router.push(pagePath(slug));
                      }}
                      className="flex items-center gap-2 text-left text-notion-text hover:underline disabled:no-underline disabled:text-notion-text-muted"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
                      <span className="truncate">{row.title}</span>
                    </button>
                    {row.summary && <div className="mt-0.5 line-clamp-1 text-xs text-notion-text-muted">{row.summary}</div>}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-notion-text-muted md:table-cell">{formatDate(row.generatedAt)}</td>
                  <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">{row.status || 'ready'}</td>
                  <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">{row.score ?? '-'}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-notion-text-muted">{row.sourceArtifact || row.path}</td>
                </tr>
              );
            })}
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
    </ReportShell>
  );
}

function ReportShell({
  title,
  sidebarCollapsed,
  toggleSidebar,
  children,
}: {
  title: string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-12 px-4 flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-md z-20">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-notion-hover rounded text-notion-text-muted hover:text-notion-text transition-colors shrink-0"
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="font-medium text-notion-text">{title}</span>
      </header>
      <div className={cn('flex-1 overflow-y-auto px-6 py-6 md:px-10')}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
