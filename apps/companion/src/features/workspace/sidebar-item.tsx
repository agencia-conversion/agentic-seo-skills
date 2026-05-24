'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Copy, FileText, MoreHorizontal, Star, StarOff, Trash2 } from 'lucide-react';
import { REPORT_DIR_NAME } from '../../../../../shared/report-modules';
import { Page, useWorkspace } from './store';
import { cn } from '@/lib/utils';
import { usePagePath } from '@/hooks/use-page-path';
import { SortablePageList } from './sortable-page-list';
import { ConfirmModal } from '@/components/confirm-modal';
import { showToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { displayPageTitle } from '@/lib/page-display';

interface SidebarItemProps {
  page: Page;
  isActive: boolean;
  level: number;
  childPages: Page[];
  childrenByParent: Record<string, Page[]>;
  activePageId: string | null;
}

function SidebarItemImpl({
  page,
  isActive,
  level,
  childPages,
  childrenByParent,
  activePageId,
}: SidebarItemProps) {
  const { t } = useI18n();
  const isExpanded = useWorkspace((s) => s.expandedPageIds.includes(page.id));
  const toggleExpand = useWorkspace((s) => s.toggleExpandPage);
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite);
  const deleteFile = useWorkspace((s) => s.deleteFile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pagePath = usePagePath();
  const hasExpandable = childPages.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const sortedChildren = useMemo(
    () => [...childPages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [childPages]
  );
  const canDelete = page.kind === 'file' && !page.readOnly && page.path !== 'brain/log.md' && !page.path.startsWith(`${REPORT_DIR_NAME}/`);
  const displayTitle = displayPageTitle(page, t);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(pagePath(page.slug));
  };

  const handleCopyLink = () => {
    setMenuOpen(false);
    navigator.clipboard?.writeText(`${window.location.origin}${pagePath(page.slug)}`).catch(() => {});
  };

  const handleDelete = async () => {
    if (page.dirty) {
      showToast(t('deleteFile.unsavedError'), 'error');
      setConfirmDeleteOpen(false);
      return;
    }
    setDeleting(true);
    const ok = await deleteFile(page.id);
    setDeleting(false);
    setConfirmDeleteOpen(false);
    showToast(ok ? t('deleteFile.movedToTrash') : t('deleteFile.failed'), ok ? 'success' : 'error');
  };

  return (
    <div>
      <div
        onClick={handleOpen}
        className={cn(
          'group flex items-center gap-1.5 px-2 py-1 text-sm rounded-md cursor-pointer transition-colors relative',
          isActive ? 'bg-notion-active text-notion-text' : 'text-notion-text/80 hover:bg-notion-hover'
        )}
        style={{ marginLeft: level * 12 }}
      >
        {hasExpandable ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(page.id);
            }}
            className="relative w-4 h-4 flex items-center justify-center shrink-0 rounded transition-colors hover:bg-notion-active"
            aria-label={isExpanded ? t('sidebar.collapseItem') : t('sidebar.expandItem')}
          >
            <span className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
              {page.icon ? <span className="text-[0.95rem] leading-none">{page.icon}</span> : <FileText className="w-3.5 h-3.5 text-notion-text-muted" />}
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-notion-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-notion-text-muted" />}
            </span>
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {page.icon ? <span className="text-[0.95rem] leading-none">{page.icon}</span> : <FileText className="w-3.5 h-3.5 text-notion-text-muted" />}
          </span>
        )}
        <span className="flex-1 truncate">{displayTitle}</span>
        {page.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title={t('deleteFile.unsavedChanges')} />}
        <div ref={menuRef} className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="p-1 hover:bg-notion-active rounded transition-colors"
            aria-label={t('sidebar.pageActions')}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-notion-text-muted" />
          </button>
          {menuOpen && (
            <div className="absolute z-[80] top-full right-0 mt-1 min-w-[200px] bg-background border border-notion-border rounded-md shadow-xl py-1">
              <MenuBtn
                icon={page.favorite ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                label={page.favorite ? t('sidebar.removeFavorite') : t('sidebar.addFavorite')}
                onClick={() => {
                  setMenuOpen(false);
                  toggleFavorite(page.id);
                }}
              />
              <MenuBtn icon={<Copy className="w-3.5 h-3.5" />} label={t('sidebar.copyLocalLink')} onClick={handleCopyLink} />
              {canDelete && (
                <>
                  <div className="h-px bg-notion-border my-1" />
                  <MenuBtn
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label={t('common.delete')}
                    destructive
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDeleteOpen(true);
                    }}
                  />
                </>
              )}
              <div className="px-3 py-1.5 text-[10px] text-notion-text-muted truncate">{page.path}</div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('deleteFile.title')}
        description={t('deleteFile.description', { title: displayTitle })}
        confirmLabel={deleting ? t('common.loading') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
      />
      {isExpanded && childPages.length > 0 && (
        <SortablePageList
          pages={sortedChildren}
          parentId={page.id}
          activePageId={activePageId}
          childrenByParent={childrenByParent}
          level={level + 1}
        />
      )}
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover text-left cursor-pointer',
        destructive ? 'text-red-500' : 'text-notion-text'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export const SidebarItem = memo(SidebarItemImpl, (prev, next) => {
  return (
    prev.page === next.page &&
    prev.isActive === next.isActive &&
    prev.level === next.level &&
    prev.childPages === next.childPages &&
    prev.childrenByParent === next.childrenByParent &&
    prev.activePageId === next.activePageId
  );
});
