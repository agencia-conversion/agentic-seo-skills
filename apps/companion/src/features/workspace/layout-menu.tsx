'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Maximize2, MoreHorizontal, Table2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { useClickOutside } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';
import { getPageWidthOptions, resolveDataTableFollowPage } from './page-width';
import { PageWidth, useWorkspace } from './store';

export function WorkspaceLayoutMenu({
  pageId,
  hasDataTable,
}: {
  pageId?: string | null;
  hasDataTable?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false));

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        data-testid="workspace-layout-menu"
        onClick={() => setOpen((value) => !value)}
        className="p-1.5 rounded hover:bg-notion-hover text-notion-text-muted hover:text-notion-text transition-colors cursor-pointer"
        aria-label={t('editor.more')}
        title={t('editor.more')}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-60 bg-background border border-notion-border rounded-md shadow-lg z-50 py-1 overflow-visible"
          >
            <LayoutMenuSection pageId={pageId} hasDataTable={hasDataTable} onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LayoutMenuSection({
  pageId,
  hasDataTable,
  onClose,
}: {
  pageId?: string | null;
  hasDataTable?: boolean;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const defaultPageWidth = useWorkspace((s) => s.settings.defaultPageWidth);
  const dataTableFollowPageByPage = useWorkspace((s) => s.settings.dataTableFollowPageByPage || {});
  const setSettings = useWorkspace((s) => s.setSettings);
  const pageWidthOptions = getPageWidthOptions(t);
  const [showWidthSub, setShowWidthSub] = useState(false);
  const tablesFollowPage = resolveDataTableFollowPage(pageId, dataTableFollowPageByPage);

  const setGlobalWidth = (value: PageWidth) => {
    setSettings({ defaultPageWidth: value });
    setShowWidthSub(false);
    onClose?.();
  };

  const toggleTablesFollowPage = () => {
    if (!pageId) return;
    const next = { ...dataTableFollowPageByPage };
    if (tablesFollowPage) next[pageId] = false;
    else delete next[pageId];
    setSettings({ dataTableFollowPageByPage: next });
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          data-testid="layout-width-menu"
          onClick={() => setShowWidthSub((value) => !value)}
          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer text-notion-text"
        >
          <span className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4" />
            {t('pageWidth.pageWidth')}
          </span>
          <span className="text-[10px] text-notion-text-muted uppercase">{defaultPageWidth}</span>
        </button>
        {showWidthSub && (
          <div className="absolute right-full top-0 mr-1 w-64 bg-background border border-notion-border rounded-md shadow-lg py-1 z-[60]">
            {pageWidthOptions.map((opt) => (
              <WidthMenuItem
                key={opt.value}
                value={opt.value}
                active={defaultPageWidth === opt.value}
                label={opt.label}
                description={opt.description}
                onClick={() => setGlobalWidth(opt.value)}
              />
            ))}
          </div>
        )}
      </div>
      {hasDataTable && (
        <button
          type="button"
          data-testid="layout-table-follow-toggle"
          onClick={toggleTablesFollowPage}
          className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-notion-hover cursor-pointer text-notion-text"
        >
          <span className="w-4 h-4 mt-0.5 flex items-center justify-center">
            {tablesFollowPage && <Check className="w-3.5 h-3.5 text-notion-text" />}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm text-notion-text">
              <Table2 className="w-4 h-4" />
              {t('pageWidth.tablesFollowPage')}
            </span>
            <span className="block text-[11px] text-notion-text-muted">{t('pageWidth.tablesFollowPageDescription')}</span>
          </span>
        </button>
      )}
    </>
  );
}

function WidthMenuItem({
  value,
  active,
  label,
  description,
  onClick,
}: {
  value: PageWidth;
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`layout-width-option-${value}`}
      onClick={onClick}
      className={cn('w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-notion-hover cursor-pointer', active && 'bg-notion-active')}
    >
      <span className="w-4 h-4 mt-0.5 flex items-center justify-center">
        {active && <Check className="w-3.5 h-3.5 text-notion-text" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-notion-text">{label}</span>
        <span className="block text-[11px] text-notion-text-muted">{description}</span>
      </span>
    </button>
  );
}
