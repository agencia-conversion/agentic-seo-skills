'use client';

import type { ReactNode } from 'react';
import { useWorkspace } from '@/features/workspace/store';
import { cn } from '@/lib/utils';
import { BreadcrumbTrail } from './breadcrumb-trail';
import { WorkspaceHeader } from './workspace-header';

export function VirtualPageShell({ title, children }: { title: string; children: ReactNode }) {
  const activePageId = useWorkspace((s) => s.activePageId);
  const activePage = useWorkspace((s) => s.pages.find((p) => p.id === activePageId));
  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <WorkspaceHeader
        left={activePage ? <BreadcrumbTrail activePage={activePage} /> : <span className="font-medium text-notion-text">{title}</span>}
      />
      <div className={cn('flex-1 overflow-y-auto px-5 py-4 md:px-8')}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
}
