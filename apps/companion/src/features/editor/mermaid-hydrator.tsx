'use client';

import { useEffect } from 'react';
import { useI18n } from '@/components/i18n-provider';

const SENTINEL = 'data-mermaid-hydrated';
let mermaidPromise: Promise<any> | null = null;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = (mod as any).default || mod;
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      mermaid.initialize({
        startOnLoad: false,
        theme: prefersDark ? 'dark' : 'default',
        securityLevel: 'strict',
        themeVariables: prefersDark
          ? { background: 'transparent' }
          : { background: 'transparent' },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

function loadingHtml(message: string) {
  return `
    <div class="rounded-md border border-notion-border bg-notion-sidebar/40 p-3 text-xs text-notion-text-muted">
      ${escapeHtml(message)}
    </div>
  `;
}

function errorHtml(message: string, source: string, fallbackLabel: string) {
  return `
    <div class="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
      <div class="font-semibold mb-1">${escapeHtml(message)}</div>
      <div class="text-[11px] mb-1 opacity-80">${escapeHtml(fallbackLabel)}</div>
      <pre class="text-[11px] font-mono whitespace-pre-wrap opacity-90 text-notion-text">${escapeHtml(source)}</pre>
    </div>
  `;
}

function diagramHtml(svg: string) {
  return `
    <div data-mermaid-result class="rounded-md border border-notion-border bg-background p-3 overflow-x-auto flex justify-center">
      ${svg}
    </div>
  `;
}

export function MermaidHydrator({ editorRootId }: { editorRootId: string }) {
  const { t } = useI18n();

  useEffect(() => {
    const root = document.getElementById(editorRootId);
    if (!root) return;
    let counter = 0;

    const renderBlock = async (el: HTMLElement, source: string) => {
      el.innerHTML = loadingHtml(t('mermaid.rendering') || 'Rendering diagram…');
      try {
        const mermaid = await loadMermaid();
        const id = `mermaid-${Date.now()}-${counter++}`;
        const { svg } = await mermaid.render(id, source.trim());
        el.innerHTML = diagramHtml(svg);
      } catch (err) {
        el.innerHTML = errorHtml(
          (err as Error)?.message || t('mermaid.error') || 'Could not render diagram.',
          source,
          t('mermaid.sourceFallback') || 'Source below:'
        );
      }
    };

    const sweep = () => {
      const blocks = root.querySelectorAll<HTMLElement>('div[data-mermaid]');
      blocks.forEach((el) => {
        const source = el.getAttribute('data-source') || '';
        const lastSource = el.getAttribute(SENTINEL) || '';
        if (source === lastSource) return;
        el.setAttribute(SENTINEL, source);
        void renderBlock(el, source);
      });
    };

    sweep();
    const observer = new MutationObserver(sweep);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-source'],
    });

    return () => {
      observer.disconnect();
    };
  }, [editorRootId, t]);

  return null;
}
