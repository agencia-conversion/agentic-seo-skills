'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Copy, FileText, MoreHorizontal, Star, StarOff } from 'lucide-react';
import { Page, useWorkspace } from './store';
import { cn } from '@/lib/utils';
import { usePagePath } from '@/hooks/use-page-path';
import { SortablePageList } from './sortable-page-list';

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
  const isExpanded = useWorkspace((s) => s.expandedPageIds.includes(page.id));
  const toggleExpand = useWorkspace((s) => s.toggleExpandPage);
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const displayTitle = page.path === 'brain/index.md' ? 'Brain' : page.title || 'Untitled';

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(pagePath(page.slug));
  };

  const handleCopyLink = () => {
    setMenuOpen(false);
    navigator.clipboard?.writeText(`${window.location.origin}${pagePath(page.slug)}`).catch(() => {});
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
            aria-label={isExpanded ? 'Collapse item' : 'Expand item'}
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
        {page.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Alterações não salvas" />}
        <div ref={menuRef} className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="p-1 hover:bg-notion-active rounded transition-colors"
            aria-label="Page actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-notion-text-muted" />
          </button>
          {menuOpen && (
            <div className="absolute z-[80] top-full right-0 mt-1 min-w-[200px] bg-background border border-notion-border rounded-md shadow-xl py-1">
              <MenuBtn
                icon={page.favorite ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                label={page.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onClick={() => {
                  setMenuOpen(false);
                  toggleFavorite(page.id);
                }}
              />
              <MenuBtn icon={<Copy className="w-3.5 h-3.5" />} label="Copy local link" onClick={handleCopyLink} />
              <div className="px-3 py-1.5 text-[10px] text-notion-text-muted truncate">{page.path}</div>
            </div>
          )}
        </div>
      </div>
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

function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover text-left cursor-pointer text-notion-text"
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
