'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { resolveMentionHydration } from './mention-hydration';

/**
 * Walks the editor DOM on every content update and fills in page mention
 * chips with the target page's current title + icon. This keeps mentions
 * "live" — edits to a linked page's title propagate without touching the
 * stored ProseMirror document.
 */
export function MentionChipHydrator({ editorRootId }: { editorRootId: string }) {
  const pages = useWorkspace((s) => s.pages);
  const router = useRouter();
  const pagePath = usePagePath();

  useEffect(() => {
    const root = document.getElementById(editorRootId);
    if (!root) return;
    let frame: number | null = null;

    const hydrate = () => {
      frame = null;
      const nodes = root.querySelectorAll<HTMLSpanElement>('span[data-page-mention]');
      nodes.forEach((el) => {
        if (!el.classList.contains('page-mention')) el.classList.add('page-mention');

        const id = el.getAttribute('data-page-id');
        const state = resolveMentionHydration(id, pages, el.getAttribute('data-alias'));
        if (el.textContent !== state.text) el.textContent = state.text;
        if (state.broken) {
          el.classList.add('page-mention--broken');
        } else {
          el.classList.remove('page-mention--broken');
        }
        if (el.title !== state.title) el.title = state.title;
        const nextHref = state.slug ? pagePath(state.slug) : '';
        if (el.dataset.href !== nextHref) el.dataset.href = nextHref;
      });
    };

    const scheduleHydrate = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(hydrate);
    };

    scheduleHydrate();
    const observer = new MutationObserver(scheduleHydrate);
    observer.observe(root, { childList: true, subtree: true });
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const chip = target?.closest?.('span[data-page-mention]') as HTMLSpanElement | null;
      const href = chip?.dataset.href;
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(href);
    };
    root.addEventListener('click', onClick);
    return () => {
      observer.disconnect();
      root.removeEventListener('click', onClick);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [pages, router, pagePath, editorRootId]);

  return null;
}
