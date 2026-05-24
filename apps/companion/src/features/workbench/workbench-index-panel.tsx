'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

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
  const { t, formatDate: fmtDate } = useI18n();
  const formatUpdated = (value: string) => {
    if (!value) return t('common.dateUnknown');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return fmtDate(parsed);
  };
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
    <VirtualPageShell title={t('project.workbench')}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="text-sm text-notion-text-muted">
          {loading
            ? t('workbenchIndex.loading')
            : t(total === 1 ? 'workbenchIndex.countOne' : 'workbenchIndex.countOther', { count: total })}
        </div>
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
          <Search className="h-4 w-4 text-notion-text-muted" />
          <input
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder={t('workbenchIndex.searchPlaceholder')}
            className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-md border border-notion-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-notion-sidebar text-left text-xs uppercase text-notion-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">{t('workbenchIndex.columnFile')}</th>
              <th className="hidden w-44 px-3 py-2 font-medium md:table-cell">{t('workbenchIndex.columnFolder')}</th>
              <th className="hidden w-40 px-3 py-2 font-medium lg:table-cell">{t('workbenchIndex.columnUpdated')}</th>
              <th className="hidden w-28 px-3 py-2 font-medium xl:table-cell">{t('workbenchIndex.columnFrontmatter')}</th>
              <th className="w-48 px-3 py-2 font-medium">{t('workbenchIndex.columnPath')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-notion-text-muted">
                  {t('workbenchIndex.emptyState')}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                role="button"
                tabIndex={0}
                aria-label={t('workbenchIndex.openAria', { title: row.title })}
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
                <td className="hidden px-3 py-2 text-notion-text-muted lg:table-cell">{formatUpdated(row.updated)}</td>
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

