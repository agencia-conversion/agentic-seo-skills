'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from './use-page-path';
import { useI18n } from '@/components/i18n-provider';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts() {
  const { t } = useI18n();
  const router = useRouter();
  const pagePath = usePagePath();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd+N — new page at root
      if (e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        void useWorkspace.getState().createWorkbenchFile(t('emptyWorkspace.defaultFileTitle')).then((id) => {
          const created = useWorkspace.getState().pages.find((p) => p.id === id);
          if (created) router.push(pagePath(created.slug));
        });
        return;
      }

      // Cmd+\\ — toggle sidebar
      if (e.key === '\\') {
        e.preventDefault();
        useWorkspace.getState().toggleSidebar();
        return;
      }

      // Cmd+Shift+F — toggle favorite active page
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const active = useWorkspace.getState().activePageId;
        if (active) useWorkspace.getState().toggleFavorite(active);
        return;
      }

      // Cmd+, — settings (broadcast custom event; SettingsModal already handled via sidebar state)
      if (e.key === ',') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('noteblock:open-settings'));
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [router, pagePath, t]);
}
