'use client';

import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useWorkspace } from '@/features/workspace/store';
import { cn } from '@/lib/utils';
import { BreadcrumbTrail } from './breadcrumb-trail';

export function VirtualPageShell({ title, children }: { title: string; children: ReactNode }) {
  const sidebarCollapsed = useWorkspace((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspace((s) => s.toggleSidebar);
  const activePageId = useWorkspace((s) => s.activePageId);
  const activePage = useWorkspace((s) => s.pages.find((p) => p.id === activePageId));
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
        {activePage ? <BreadcrumbTrail activePage={activePage} /> : <span className="font-medium text-notion-text">{title}</span>}
      </header>
      <div className={cn('flex-1 overflow-y-auto px-6 py-6 md:px-10')}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
}
