'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

interface IncomingMention {
  source: string;
  line: number;
  context: string;
  type: 'wikilink' | 'embed' | 'markdown';
  alias: string | null;
  anchor: string | null;
}

interface OutgoingMention {
  rawTarget: string;
  resolved: string | null;
  line: number;
  type: 'wikilink' | 'embed' | 'markdown';
  alias: string | null;
  anchor: string | null;
  broken: boolean;
}

interface BacklinksResponse {
  ok: boolean;
  path: string;
  incoming: IncomingMention[];
  outgoing: OutgoingMention[];
  totalIncoming: number;
  totalOutgoing: number;
}

const labelByType: Record<IncomingMention['type'], string> = {
  wikilink: '[[ ]]',
  embed: '![[ ]]',
  markdown: '[ ]( )',
};

export function LinkedMentionsPanel({ pagePath }: { pagePath: string }) {
  const { t } = useI18n();
  const token = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const router = useRouter();
  const buildPagePath = usePagePath();
  const [data, setData] = useState<BacklinksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pagePath || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/project/backlinks?path=${encodeURIComponent(pagePath)}&token=${encodeURIComponent(token)}`, {
      headers: { 'x-companion-token': token },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload: BacklinksResponse) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pagePath, token]);

  const navigateToSource = (sourcePath: string) => {
    const page = pages.find((p) => p.path === sourcePath);
    if (!page) return;
    router.push(buildPagePath(page.slug));
  };

  const navigateToTarget = (targetPath: string) => {
    const page = pages.find((p) => p.path === targetPath);
    if (!page) return;
    router.push(buildPagePath(page.slug));
  };

  if (!pagePath) return null;
  if (loading && !data) {
    return (
      <div data-testid="linked-mentions-loading" className="border-t border-notion-border mt-12 pt-6 pb-12 text-sm text-notion-text-muted">
        {t('linkedMentions.loading') || 'Carregando links…'}
      </div>
    );
  }
  if (error) {
    return (
      <div data-testid="linked-mentions-error" className="border-t border-notion-border mt-12 pt-6 pb-12 text-sm text-red-500">
        {t('linkedMentions.error') || 'Erro ao carregar links'}: {error}
      </div>
    );
  }
  if (!data) return null;

  const hasContent = data.totalIncoming > 0 || data.totalOutgoing > 0;
  if (!hasContent) {
    return (
      <div data-testid="linked-mentions-empty" className="border-t border-notion-border mt-12 pt-6 pb-12 text-xs text-notion-text-muted">
        {t('linkedMentions.emptyPanel') || 'Sem links nesta página.'}
      </div>
    );
  }

  return (
    <div data-testid="linked-mentions-panel" className="border-t border-notion-border mt-12 pt-6 pb-12 space-y-6">
      {data.totalIncoming > 0 && (
        <section data-testid="linked-mentions-incoming">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-notion-text-muted mb-2">
            <ArrowDownToLine className="w-3.5 h-3.5" />
            {t('linkedMentions.incomingHeading') || 'Linked mentions'} ({data.totalIncoming})
          </h2>
          <ul className="space-y-2">
            {data.incoming.map((mention, idx) => {
              const sourcePage = pages.find((p) => p.path === mention.source);
              const title = sourcePage?.title || mention.source.split('/').pop()?.replace(/\.md$/, '') || mention.source;
              return (
                <li
                  key={`${mention.source}-${mention.line}-${idx}`}
                  data-testid="incoming-mention"
                  data-source={mention.source}
                  className="group rounded-md border border-notion-border bg-notion-sidebar/40 hover:bg-notion-hover px-3 py-2 cursor-pointer transition-colors"
                  onClick={() => navigateToSource(mention.source)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-notion-text truncate flex items-center gap-2">
                      {sourcePage?.icon || <Link2 className="w-3.5 h-3.5 text-notion-text-muted" />}
                      <span className="truncate">{title}</span>
                    </span>
                    <span className="text-[10px] text-notion-text-muted font-mono whitespace-nowrap">
                      {labelByType[mention.type]} · {t('linkedMentions.line') || 'linha'} {mention.line}
                    </span>
                  </div>
                  {mention.context && (
                    <p className="mt-1 text-xs text-notion-text-muted line-clamp-2 leading-relaxed">{mention.context}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {data.totalOutgoing > 0 && (
        <section data-testid="linked-mentions-outgoing">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-notion-text-muted mb-2">
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            {t('linkedMentions.outgoingHeading') || 'Outgoing links'} ({data.totalOutgoing})
          </h2>
          <ul className="space-y-1.5">
            {data.outgoing.map((link, idx) => {
              const targetPage = link.resolved ? pages.find((p) => p.path === link.resolved!) : null;
              const label = link.alias || targetPage?.title || link.rawTarget;
              return (
                <li
                  key={`out-${link.rawTarget}-${link.line}-${idx}`}
                  data-testid="outgoing-link"
                  data-resolved={link.resolved || ''}
                  data-broken={link.broken ? 'true' : 'false'}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                    link.broken
                      ? 'bg-red-500/5 text-red-500 cursor-not-allowed border border-red-500/20'
                      : 'hover:bg-notion-hover text-notion-text cursor-pointer'
                  )}
                  onClick={() => link.resolved && navigateToTarget(link.resolved)}
                >
                  {link.broken ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : link.type === 'markdown' ? (
                    <ExternalLink className="w-3.5 h-3.5 text-notion-text-muted" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5 text-notion-text-muted" />
                  )}
                  <span className="truncate flex-1">{label}</span>
                  {link.anchor && <span className="text-[10px] text-notion-text-muted">#{link.anchor}</span>}
                  <span className="text-[10px] text-notion-text-muted font-mono whitespace-nowrap">
                    {labelByType[link.type]} · {t('linkedMentions.line') || 'linha'} {link.line}
                  </span>
                  {link.broken && (
                    <span data-testid="broken-flag" className="text-[10px] font-semibold uppercase tracking-wider">
                      {t('linkedMentions.broken') || 'quebrado'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
