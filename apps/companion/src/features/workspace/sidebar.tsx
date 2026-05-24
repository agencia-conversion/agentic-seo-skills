'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useWorkspace } from './store';
import { SortablePageList } from './sortable-page-list';
import { SettingsModal } from './settings-modal';
import { WorkspaceSwitcher } from './workspace-switcher';
import { NoteblockBrand } from '@/components/noteblock-brand';
import { NewPageButton } from './new-page-button';
import { UserFooter } from './user-footer';
import { useI18n } from '@/components/i18n-provider';

export function Sidebar() {
  const { t } = useI18n();
  const pages = useWorkspace((s) => s.pages);
  const sections = useWorkspace((s) => s.sections);
  const activePageId = useWorkspace((s) => s.activePageId);
  const hasHydrated = useWorkspace((s) => s._hasHydrated);
  const sidebarCollapsed = useWorkspace((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspace((s) => s.toggleSidebar);
  const sidebarWidth = useWorkspace((s) => s.sidebarWidth);
  const setSidebarWidth = useWorkspace((s) => s.setSidebarWidth);
  const projectName = useWorkspace((s) => s.projectName);
  const projectRoot = useWorkspace((s) => s.projectRoot);

  const [isResizing, setIsResizing] = useState(false);
  const settingsOpen = useWorkspace((s) => s.settingsOpen);
  const settingsTab = useWorkspace((s) => s.settingsTab);
  const openSettings = useWorkspace((s) => s.openSettings);
  const closeSettings = useWorkspace((s) => s.closeSettings);
  const resizeStartRef = useRef<{ x: number; w: number } | null>(null);
  const mobileAutoCollapsedRef = useRef(false);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = { x: e.clientX, w: sidebarWidth };
    },
    [sidebarWidth]
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      setSidebarWidth(resizeStartRef.current.w + e.clientX - resizeStartRef.current.x);
    };
    const onUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setSidebarWidth]);

  useEffect(() => {
    const openHandler = () => openSettings();
    window.addEventListener('noteblock:open-settings', openHandler);
    const params = new URLSearchParams(window.location.search);
    if (params.get('openDataForSeo') === '1') {
      params.delete('openDataForSeo');
      const next = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (next ? `?${next}` : ''));
      openSettings('credentials');
    }
    return () => window.removeEventListener('noteblock:open-settings', openHandler);
  }, [openSettings]);

  useEffect(() => {
    if (mobileAutoCollapsedRef.current || sidebarCollapsed) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    mobileAutoCollapsedRef.current = true;
    toggleSidebar();
  }, [sidebarCollapsed, toggleSidebar]);

  const { favoritePages, pagesBySection, childrenByParent } = useMemo(() => {
    const live = pages.filter((p) => !p.trashed && !p.inline);
    const childMap: Record<string, typeof pages> = {};
    for (const page of live) {
      if (!page.parentId) continue;
      if (!childMap[page.parentId]) childMap[page.parentId] = [];
      childMap[page.parentId].push(page);
    }
    for (const childPages of Object.values(childMap)) {
      childPages.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const bySection: Record<string, typeof pages> = {};
    for (const section of sections) {
      bySection[section.id] = section.pageIds
        .map((id) => live.find((p) => p.id === id))
        .filter((p): p is typeof live[number] => Boolean(p))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) as typeof pages;
    }
    const favs = live.filter((p) => p.favorite);
    return { favoritePages: favs, pagesBySection: bySection, childrenByParent: childMap };
  }, [pages, sections]);

  if (!hasHydrated) {
    return (
      <aside
        style={{ width: sidebarWidth }}
        className="fixed inset-y-0 left-0 z-40 flex flex-col bg-notion-sidebar border-r border-notion-border h-full p-3 gap-1 select-none shadow-xl md:relative md:z-auto md:shadow-none shrink-0"
      >
        <div className="px-2 py-1.5 mb-1">
          <NoteblockBrand />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 rounded bg-notion-active/40 animate-pulse mx-1" />
        ))}
      </aside>
    );
  }

  if (sidebarCollapsed) return null;

  return (
    <aside
      style={{ width: sidebarWidth }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col bg-notion-sidebar border-r border-notion-border h-full select-none shadow-xl md:relative md:z-auto md:shadow-none shrink-0"
    >
      <div className="px-3 pt-3 pb-1 flex flex-col gap-1">
        <div className="flex items-start gap-2 px-2 py-1.5 mb-1">
          <div className="flex flex-col flex-1 min-w-0 gap-0.5">
            <NoteblockBrand />
            <WorkspaceSwitcher />
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-[1px]">
          <button
            className="flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-md hover:bg-notion-hover transition-colors text-notion-text/80 cursor-pointer"
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'p', metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
          >
            <Search className="w-4 h-4 text-notion-text-muted" />
            <span>{t('common.search')}</span>
            <span className="ml-auto text-[10px] text-notion-text-muted">⌘P</span>
          </button>
          <NewPageButton />
        </div>

      </div>

      <nav className="flex-1 overflow-y-auto pt-4 pb-10 scrollbar-hide">
        {favoritePages.length > 0 && (
          <div className="mb-4">
            <div className="px-3 mb-2">
              <span className="text-[11px] font-semibold text-notion-text-muted uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-current" />
                {t('common.favorites')}
              </span>
            </div>
            <div className="space-y-[1px] px-1">
              <SortablePageList
                pages={favoritePages}
                parentId="__favorites__"
                activePageId={activePageId}
                childrenByParent={childrenByParent}
                keyPrefix="fav-"
              />
            </div>
          </div>
        )}

        {sections.map((section) => {
          const sectionPages = pagesBySection[section.id] || [];
          const sectionTitle =
            section.id === 'conteudos' ? t('project.contents') : section.id === 'workbench' ? t('project.workbench') : section.title;
          return (
            <div key={section.id} className="mb-4">
              {section.id !== 'brain' && (
                <div className="px-3 mb-2 flex items-center justify-between group">
                  <span className="text-[11px] font-semibold text-notion-text-muted uppercase tracking-wider px-1">
                    {sectionTitle}
                  </span>
                </div>
              )}
              <div className="space-y-[1px] px-1">
                {sectionPages.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-notion-text-muted italic">{t('sidebar.noPages')}</p>
                ) : (
                  <SortablePageList
                    pages={sectionPages}
                    parentId={section.id}
                    activePageId={activePageId}
                    childrenByParent={childrenByParent}
                  />
                )}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-2 border-t border-notion-border">
        <UserFooter projectName={projectName} projectRoot={projectRoot} onSettings={() => openSettings()} />
      </div>

      <SettingsModal isOpen={settingsOpen} initialTab={settingsTab} onClose={closeSettings} />
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-notion-border transition-colors"
      />
    </aside>
  );
}
