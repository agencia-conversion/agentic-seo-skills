'use client';

import type { ReactNode, Ref } from 'react';
import { Menu } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';
import { useWorkspace } from './store';

interface WorkspaceHeaderProps {
  left: ReactNode;
  right?: ReactNode;
  bordered?: boolean;
  dataTestId?: string;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
  rightRef?: Ref<HTMLDivElement>;
}

export function WorkspaceHeader({
  left,
  right,
  bordered = false,
  dataTestId,
  className,
  leftClassName,
  rightClassName,
  rightRef,
}: WorkspaceHeaderProps) {
  const { t } = useI18n();
  const sidebarCollapsed = useWorkspace((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspace((s) => s.toggleSidebar);

  return (
    <header
      data-testid={dataTestId}
      className={cn(
        'h-12 px-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 select-none shrink-0',
        bordered && 'border-b border-notion-border',
        className
      )}
    >
      <div className={cn('flex items-center gap-2 overflow-hidden mr-4 text-sm text-notion-text-muted', leftClassName)}>
        <button
          type="button"
          data-testid="workspace-sidebar-toggle"
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-notion-hover rounded text-notion-text-muted hover:text-notion-text transition-colors shrink-0"
          aria-label={sidebarCollapsed ? t('editor.expandSidebar') : t('sidebar.collapse')}
          title={sidebarCollapsed ? t('editor.expandSidebar') : t('sidebar.collapse')}
        >
          <Menu className="w-4 h-4" />
        </button>
        {left}
      </div>
      {right && (
        <div ref={rightRef} className={cn('flex items-center gap-1 text-notion-text-muted relative', rightClassName)}>
          {right}
        </div>
      )}
    </header>
  );
}
