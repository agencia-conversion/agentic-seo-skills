'use client';

import { ChevronRight, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Page, useWorkspace } from './store';
import { usePagePath } from '@/hooks/use-page-path';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { displayPageTitle } from '@/lib/page-display';

function rootCrumbFor(page: Page, pages: Page[]) {
  if (page.sectionId === 'brain') return pages.find((item) => item.path === 'brain/index.md') || null;
  if (page.path.startsWith('conteudos/')) return pages.find((item) => item.id === 'virtual/contents') || null;
  if (page.path.startsWith('relatorios/')) return pages.find((item) => item.id === 'virtual/reports') || null;
  if (page.path.startsWith('workbench/')) return pages.find((item) => item.id === 'virtual/workbench') || null;
  return null;
}

function contextCrumbFor(page: Page, pages: Page[]) {
  if (page.path.startsWith('relatorios/')) {
    const moduleId = page.path.split('/')[1];
    return pages.find((item) => item.id === `virtual/reports/${moduleId}`) || null;
  }
  if (page.path.startsWith('conteudos/')) {
    const clusterId = page.frontmatter?.topic_cluster || page.frontmatter?.topicCluster || page.frontmatter?.cluster;
    return clusterId ? pages.find((item) => item.id === `virtual/contents/${clusterId}`) || null : null;
  }
  return null;
}

function parentChain(page: Page, pages: Page[]) {
  const chain: Page[] = [];
  const seen = new Set<string>();
  let current: Page | undefined = page;
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? pages.find((item) => item.id === current?.parentId) : undefined;
  }
  const root = rootCrumbFor(page, pages);
  if (root && !chain.some((item) => item.id === root.id)) chain.unshift(root);
  const context = contextCrumbFor(page, pages);
  if (root && context && !chain.some((item) => item.id === context.id)) {
    const rootIndex = chain.findIndex((item) => item.id === root.id);
    chain.splice(rootIndex + 1, 0, context);
  }
  return chain;
}

export function BreadcrumbTrail({ activePage }: { activePage: Page }) {
  const router = useRouter();
  const pagePath = usePagePath();
  const { t } = useI18n();
  const pages = useWorkspace((s) => s.pages);
  const crumbs = parentChain(activePage, pages);

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-sm text-notion-text-muted" aria-label={t('breadcrumb.label')}>
      {crumbs.map((crumb, index) => {
        const isCurrent = crumb.id === activePage.id;
        const title = displayPageTitle(crumb, t);
        return (
          <div key={crumb.id} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-notion-text-muted/70" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => router.push(pagePath(crumb.slug))}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={t(isCurrent ? 'breadcrumb.currentAria' : 'breadcrumb.openAria', { title })}
              className={cn(
                'flex min-w-0 items-center gap-1.5 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-text/10',
                isCurrent ? 'text-notion-text' : 'hover:bg-notion-hover hover:text-notion-text'
              )}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-notion-text-muted">
                {crumb.icon || <FileText className="h-[18px] w-[18px]" />}
              </span>
              <span className={cn('truncate font-medium', isCurrent ? 'max-w-[360px]' : 'max-w-[220px]')}>
                {title}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
