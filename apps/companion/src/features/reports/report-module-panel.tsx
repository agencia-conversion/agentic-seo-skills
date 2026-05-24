'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

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
  const { t, formatDate: fmtDate } = useI18n();
  const formatReportDate = (value: string | null) => {
    if (!value) return t('common.dateUnknown');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return fmtDate(parsed);
  };
  const token = useWorkspace((s) => s.token);
  const modules = useWorkspace((s) => s.reportModules);
  const openReportPage = useWorkspace((s) => s.openReportPage);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const activeModule = useMemo(() => modules.find((item) => item.id === moduleId) || null, [moduleId, modules]);

  const openRow = (row: ReportRow) => {
    const slug = openReportPage(row);
    if (slug) router.push(pagePath(slug));
  };

  useEffect(() => {
    if (!moduleId || !token) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ module: moduleId, page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set('query', query.trim());
    fetch(`/api/project/reports?${params}`, {
      headers: { 'x-companion-token': token },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) return;
        setRows(data.reports || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId, page, query, token]);

  if (!moduleId) {
    return (
      <VirtualPageShell title={t('project.reports')}>
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
      </VirtualPageShell>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <VirtualPageShell title={activeModule?.title || t('project.reports')}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="text-sm text-notion-text-muted">
          {loading
            ? t('reportModule.loading')
            : t(total === 1 ? 'reportModule.countOne' : 'reportModule.countOther', { count: total })}
        </div>
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
          <Search className="h-4 w-4 text-notion-text-muted" />
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder={t('reportModule.searchPlaceholder')}
            className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-md border border-notion-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-notion-sidebar text-left text-xs uppercase text-notion-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">{t('reportModule.columnReport')}</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">{t('reportModule.columnDate')}</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">{t('reportModule.columnStatus')}</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">{t('reportModule.columnScore')}</th>
              <th className="px-3 py-2 font-medium">{t('reportModule.columnSource')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-notion-text-muted">
                  {t('reportModule.emptyState')}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t('reportModule.openAria', { title: row.title })}
                  onClick={() => openRow(row)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    openRow(row);
                  }}
                  className="cursor-pointer border-t border-notion-border transition-colors hover:bg-notion-hover focus-visible:bg-notion-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-text/10"
                >
                  <td className="max-w-[420px] px-3 py-2">
                    <div className="flex items-center gap-2 text-left text-notion-text">
                      <FileText className="h-4 w-4 shrink-0 text-notion-text-muted" />
                      <span className="truncate">{row.title}</span>
                    </div>
                    {row.summary && <div className="mt-0.5 line-clamp-1 text-xs text-notion-text-muted">{row.summary}</div>}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-notion-text-muted md:table-cell">{formatReportDate(row.generatedAt)}</td>
                  <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">{row.status || t('reportModule.defaultStatus')}</td>
                  <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">{row.score ?? t('common.dateUnknown')}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-notion-text-muted">{row.sourceArtifact || row.path}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-notion-text-muted">
        <span>{t('common.pagination', { current: page, total: totalPages })}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
            className="rounded-md border border-notion-border p-1.5 disabled:opacity-40"
            aria-label={t('common.previousPage')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-notion-border p-1.5 disabled:opacity-40"
            aria-label={t('common.nextPage')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </VirtualPageShell>
  );
}
