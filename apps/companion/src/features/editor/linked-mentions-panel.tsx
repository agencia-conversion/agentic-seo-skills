'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace, type Page } from '../workspace/store';
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

interface LinkedItemProps {
  testid: string;
  dataAttrs?: Record<string, string>;
  icon: React.ReactNode;
  label: string;
  anchor?: string | null;
  type: IncomingMention['type'];
  line: number;
  lineLabel: string;
  broken?: boolean;
  brokenLabel?: string;
  contextTitle?: string;
  onClick?: () => void;
  className?: string;
}

const labelByType: Record<IncomingMention['type'], string> = {
  wikilink: '[[ ]]',
  embed: '![[ ]]',
  markdown: '[ ]( )',
};

function LinkedItemRow({
  testid,
  dataAttrs,
  icon,
  label,
  anchor,
  type,
  line,
  lineLabel,
  broken,
  brokenLabel,
  contextTitle,
  onClick,
  className,
}: LinkedItemProps) {
  return (
    <li
      data-testid={testid}
      {...(dataAttrs || {})}
      title={contextTitle || undefined}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
        broken
          ? 'bg-red-500/5 text-red-500 cursor-not-allowed border border-red-500/20'
          : 'hover:bg-notion-hover text-notion-text cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <span className="shrink-0 flex items-center justify-center">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {anchor && <span className="text-[10px] text-notion-text-muted">#{anchor}</span>}
      <span className="text-[10px] text-notion-text-muted font-mono whitespace-nowrap">
        {labelByType[type]} · {lineLabel} {line}
      </span>
      {broken && brokenLabel && (
        <span data-testid="broken-flag" className="text-[10px] font-semibold uppercase tracking-wider">
          {brokenLabel}
        </span>
      )}
    </li>
  );
}

interface CollapsibleSectionProps {
  testid: string;
  headingIcon: React.ReactNode;
  heading: string;
  count: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  testid,
  headingIcon,
  heading,
  count,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      data-testid={testid}
      data-open={open ? 'true' : 'false'}
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
      className="[&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex items-center gap-2 cursor-pointer select-none mb-2 text-[11px] font-semibold uppercase tracking-wider text-notion-text-muted hover:text-notion-text transition-colors">
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {headingIcon}
        <span>
          {heading} ({count})
        </span>
      </summary>
      {children}
    </details>
  );
}

export function LinkedMentionsPanel({ pagePath }: { pagePath: string }) {
  const { t } = useI18n();
  const token = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages) as Page[];
  const router = useRouter();
  const buildPagePath = usePagePath();
  const [data, setData] = useState<BacklinksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [outgoingOpen, setOutgoingOpen] = useState(false);

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

  useEffect(() => {
    setIncomingOpen(false);
    setOutgoingOpen(false);
  }, [pagePath]);

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

  const lineLabel = t('linkedMentions.line') || 'linha';
  const brokenLabel = t('linkedMentions.broken') || 'quebrado';

  return (
    <div data-testid="linked-mentions-panel" className="border-t border-notion-border mt-12 pt-6 pb-12 space-y-6">
      {data.totalIncoming > 0 && (
        <CollapsibleSection
          testid="linked-mentions-incoming"
          headingIcon={<ArrowDownToLine className="w-3.5 h-3.5" />}
          heading={t('linkedMentions.incomingHeading') || 'Linked mentions'}
          count={data.totalIncoming}
          open={incomingOpen}
          onToggle={setIncomingOpen}
        >
          <ul className="space-y-1.5">
            {data.incoming.map((mention, idx) => {
              const sourcePage = pages.find((p) => p.path === mention.source);
              const title = sourcePage?.title || mention.source.split('/').pop()?.replace(/\.md$/, '') || mention.source;
              return (
                <LinkedItemRow
                  key={`${mention.source}-${mention.line}-${idx}`}
                  testid="incoming-mention"
                  dataAttrs={{ 'data-source': mention.source }}
                  icon={sourcePage?.icon || <Link2 className="w-3.5 h-3.5 text-notion-text-muted" />}
                  label={title}
                  anchor={mention.anchor}
                  type={mention.type}
                  line={mention.line}
                  lineLabel={lineLabel}
                  contextTitle={mention.context}
                  onClick={() => navigateToSource(mention.source)}
                />
              );
            })}
          </ul>
        </CollapsibleSection>
      )}
      {data.totalOutgoing > 0 && (
        <CollapsibleSection
          testid="linked-mentions-outgoing"
          headingIcon={<ArrowUpFromLine className="w-3.5 h-3.5" />}
          heading={t('linkedMentions.outgoingHeading') || 'Outgoing links'}
          count={data.totalOutgoing}
          open={outgoingOpen}
          onToggle={setOutgoingOpen}
        >
          <ul className="space-y-1.5">
            {data.outgoing.map((link, idx) => {
              const targetPage = link.resolved ? pages.find((p) => p.path === link.resolved!) : null;
              const label = link.alias || targetPage?.title || link.rawTarget;
              const icon = link.broken ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : link.type === 'markdown' ? (
                <ExternalLink className="w-3.5 h-3.5 text-notion-text-muted" />
              ) : (
                <Link2 className="w-3.5 h-3.5 text-notion-text-muted" />
              );
              return (
                <LinkedItemRow
                  key={`out-${link.rawTarget}-${link.line}-${idx}`}
                  testid="outgoing-link"
                  dataAttrs={{
                    'data-resolved': link.resolved || '',
                    'data-broken': link.broken ? 'true' : 'false',
                  }}
                  icon={icon}
                  label={label}
                  anchor={link.anchor}
                  type={link.type}
                  line={link.line}
                  lineLabel={lineLabel}
                  broken={link.broken}
                  brokenLabel={brokenLabel}
                  onClick={() => link.resolved && navigateToTarget(link.resolved)}
                />
              );
            })}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
