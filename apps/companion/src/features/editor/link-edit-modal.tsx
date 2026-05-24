'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, FileText, Link2, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { useWorkspace, type Page } from '@/features/workspace/store';
import { displayPageTitle } from '@/lib/page-display';

export interface LinkEditSubmit {
  text: string;
  href: string;
  pageId?: string | null;
}

const URL_PATTERN = /^(?:https?:\/\/|mailto:|\/|\.\/|\.\.\/|sources\/)/i;

function looksLikeUrl(value: string) {
  return URL_PATTERN.test(value.trim());
}

function rankPage(page: Page, query: string) {
  const q = query.toLowerCase();
  const title = (page.title || '').toLowerCase();
  const path = (page.path || '').toLowerCase();
  if (title === q || path === q) return 0;
  if (title.startsWith(q)) return 1;
  if (title.includes(q)) return 2;
  if (path.includes(q)) return 3;
  return 99;
}

export function LinkEditModal() {
  const { t } = useI18n();
  const editor = useWorkspace((s) => s.linkEditor);
  const close = useWorkspace((s) => s.closeLinkEditor);
  const pages = useWorkspace((s) => s.pages);
  const [text, setText] = useState(editor.initial.text);
  const [target, setTarget] = useState(editor.initial.href);
  const [activeIndex, setActiveIndex] = useState(0);
  const targetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor.open) return;
    setText(editor.initial.text);
    setTarget(editor.initial.href);
    setActiveIndex(0);
    const focus = window.setTimeout(() => targetRef.current?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focus);
    };
  }, [editor.open, editor.initial.text, editor.initial.href, close]);

  const isUrl = looksLikeUrl(target);
  const liveSuggestions = useMemo(() => {
    const trimmed = target.trim();
    if (!trimmed || isUrl) return [] as Page[];
    return pages
      .filter((page) => !page.trashed && page.kind !== 'brainEmpty')
      .map((page) => ({ page, score: rankPage(page, trimmed) }))
      .filter((entry) => entry.score < 99)
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map((entry) => entry.page);
  }, [pages, target, isUrl]);

  if (!editor.open) return null;

  const submitPage = (page: Page) => {
    editor.onSubmit?.({
      text: text.trim() || page.title || displayPageTitle(page, t),
      href: '',
      pageId: page.id,
    });
    close();
  };

  const submitUrl = () => {
    const href = target.trim();
    if (!href) return;
    editor.onSubmit?.({ text: text.trim() || href, href, pageId: null });
    close();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isUrl) submitUrl();
    else if (liveSuggestions[activeIndex]) submitPage(liveSuggestions[activeIndex]);
    else if (target.trim()) submitUrl();
  };

  const handleRemove = () => {
    editor.onSubmit?.({ text: text.trim() || editor.initial.text, href: '', pageId: null });
    close();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-modal="link-edit"
      className="fixed inset-0 z-[290] flex items-start justify-center bg-black/30 backdrop-blur-sm p-4 pt-[18vh]"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between border-b border-notion-border px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-notion-text">
            <Link2 className="h-4 w-4 text-notion-text-muted" />
            <strong>{t('linkEditor.title')}</strong>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
            aria-label={t('linkEditor.cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-4 py-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-notion-text-muted">{t('linkEditor.text')}</span>
            <input
              name="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-notion-text-muted">{t('linkEditor.targetLabel')}</span>
            <input
              ref={targetRef}
              name="url"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (isUrl || liveSuggestions.length === 0) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(index + 1, liveSuggestions.length - 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(0, index - 1));
                }
              }}
              placeholder={t('linkEditor.targetPlaceholder')}
              className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
            />
            <span className="text-[10px] text-notion-text-muted">
              {isUrl ? t('linkEditor.modeExternal') : t('linkEditor.modeSearch')}
            </span>
          </label>

          {!isUrl && liveSuggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label={t('linkEditor.suggestionsLabel')}
              className="max-h-48 overflow-y-auto rounded-md border border-notion-border bg-background"
            >
              {liveSuggestions.map((page, index) => (
                <li key={page.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => submitPage(page)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${index === activeIndex ? 'bg-notion-hover text-notion-text' : 'text-notion-text/80 hover:bg-notion-hover'}`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center text-notion-text-muted">
                      {page.icon || <FileText className="h-3.5 w-3.5" />}
                    </span>
                    <span className="flex-1 truncate">{displayPageTitle(page, t)}</span>
                    <span className="truncate text-[10px] text-notion-text-muted">{page.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isUrl && (
            <p className="flex items-center gap-1 text-[10px] text-notion-text-muted">
              <ExternalLink className="h-3 w-3" />
              {t('linkEditor.willOpenInNewTab')}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-notion-border px-4 py-3">
          {editor.initial.href ? (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-md px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
            >
              {t('linkEditor.remove')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md px-3 py-1.5 text-sm text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
            >
              {t('linkEditor.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-md bg-notion-text px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
            >
              {t('linkEditor.save')}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
