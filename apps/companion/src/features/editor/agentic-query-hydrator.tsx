'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

const SENTINEL = 'data-agentic-query-hydrated';
const DEBOUNCE_MS = 250;

interface QueryItem {
  path: string;
  title: string;
  frontmatter: Record<string, any>;
  excerpt: string;
}

interface QueryResult {
  ok: boolean;
  items: QueryItem[];
  columns: string[];
  total: number;
  limited: boolean;
  errors?: string[];
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusCardHtml(kind: 'loading' | 'empty' | 'error', message: string, source?: string, retryLabel?: string) {
  const palette: Record<string, string> = {
    loading: 'text-notion-text-muted',
    empty: 'text-notion-text-muted',
    error: 'text-red-500 bg-red-500/5 border-red-500/30',
  };
  const retry =
    kind === 'error' && retryLabel
      ? `<button data-agentic-query-retry class="ml-2 text-[11px] underline cursor-pointer">${escapeHtml(retryLabel)}</button>`
      : '';
  const pre = source ? `<pre class="mt-2 text-[11px] font-mono whitespace-pre-wrap opacity-70">${escapeHtml(source)}</pre>` : '';
  return `
    <div class="rounded-md border ${kind === 'error' ? '' : 'border-notion-border'} ${palette[kind]} px-3 py-2 text-xs">
      ${escapeHtml(message)}${retry}
      ${pre}
    </div>
  `;
}

function tableHtml(
  result: QueryResult,
  ctx: { limitedOf: string; openLabel: string }
): string {
  const headers = result.columns
    .map((c) => `<th class="text-left text-[11px] font-semibold uppercase tracking-wider text-notion-text-muted px-3 py-2 border-b border-notion-border">${escapeHtml(c)}</th>`)
    .join('');
  const rows = result.items
    .map((item) => {
      const cells = result.columns
        .map((c) => {
          const value =
            c === 'title'
              ? item.title
              : item.frontmatter?.[c] ?? '';
          return `<td class="px-3 py-2 text-sm text-notion-text border-b border-notion-border/50">${escapeHtml(value)}</td>`;
        })
        .join('');
      return `<tr data-agentic-query-row data-path="${escapeHtml(item.path)}" class="hover:bg-notion-hover cursor-pointer">${cells}</tr>`;
    })
    .join('');
  const footer = result.limited
    ? `<div class="text-[10px] text-notion-text-muted px-3 py-1.5 border-t border-notion-border">${escapeHtml(
        ctx.limitedOf.replace('{shown}', String(result.items.length)).replace('{total}', String(result.total))
      )}</div>`
    : '';
  return `
    <div data-agentic-query-result class="overflow-x-auto rounded-md border border-notion-border bg-background">
      <table class="w-full border-collapse">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${footer}
    </div>
  `;
}

export function AgenticQueryHydrator({ editorRootId }: { editorRootId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pages = useWorkspace((s) => s.pages);
  const token = useWorkspace((s) => s.token);
  const pagePath = usePagePath();

  useEffect(() => {
    const root = document.getElementById(editorRootId);
    if (!root || !token) return;

    let debounceTimer: number | null = null;
    const inflight = new Map<HTMLElement, AbortController>();

    const renderBlock = async (el: HTMLElement, source: string) => {
      const previous = inflight.get(el);
      if (previous) previous.abort();
      const controller = new AbortController();
      inflight.set(el, controller);

      // Loading state
      el.innerHTML = statusCardHtml('loading', t('agenticQuery.running') || 'Running query…');

      try {
        const res = await fetch(`/api/project/query?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-companion-token': token,
          },
          body: JSON.stringify({ source }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: QueryResult = await res.json();

        if (controller.signal.aborted) return;

        if (!body.ok) {
          const message = body.errors?.[0] || t('agenticQuery.ymlError') || 'Invalid YAML in query.';
          el.innerHTML = statusCardHtml('error', message, source, t('agenticQuery.retry') || 'Retry');
          return;
        }
        if (!body.items?.length) {
          el.innerHTML = statusCardHtml('empty', t('agenticQuery.empty') || 'No results for this query.', source);
          return;
        }
        el.innerHTML = tableHtml(body, {
          limitedOf: t('agenticQuery.limitedOf') || '{shown} of {total}',
          openLabel: t('agenticQuery.openFile') || 'Open',
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        el.innerHTML = statusCardHtml(
          'error',
          (err as Error).message || t('agenticQuery.fetchError') || 'Could not run query.',
          source,
          t('agenticQuery.retry') || 'Retry'
        );
      } finally {
        inflight.delete(el);
      }
    };

    const sweep = () => {
      const blocks = root.querySelectorAll<HTMLElement>('div[data-agentic-query]');
      blocks.forEach((el) => {
        const source = el.getAttribute('data-source') || '';
        const lastSource = el.getAttribute(SENTINEL) || '';
        if (source === lastSource) return;
        el.setAttribute(SENTINEL, source);
        void renderBlock(el, source);
      });
    };

    const schedule = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        sweep();
      }, DEBOUNCE_MS);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-source'] });

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const retry = target.closest('[data-agentic-query-retry]');
      if (retry) {
        const block = retry.closest<HTMLElement>('div[data-agentic-query]');
        if (block) {
          block.removeAttribute(SENTINEL);
          schedule();
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const row = target.closest<HTMLElement>('tr[data-agentic-query-row]');
      const path = row?.getAttribute('data-path');
      if (!path) return;
      event.preventDefault();
      event.stopPropagation();
      const page = pages.find((p) => p.path === path);
      if (page) router.push(pagePath(page.slug));
    };
    root.addEventListener('click', onClick);

    return () => {
      observer.disconnect();
      root.removeEventListener('click', onClick);
      inflight.forEach((c) => c.abort());
      inflight.clear();
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    };
  }, [editorRootId, token, t, pages, router, pagePath]);

  return null;
}
