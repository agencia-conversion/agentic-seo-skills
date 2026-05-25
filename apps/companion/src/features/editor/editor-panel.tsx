'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  EditorContent,
  JSONContent,
  useEditor,
  type Editor,
} from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Bold,
  Check,
  Code,
  FileText,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  Maximize2,
  MoreHorizontal,
  Save,
  Settings,
  Smile,
  Star,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { REPORT_DIR_NAME } from '../../../../../shared/report-modules';
import { useWorkspace } from '../workspace/store';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/use-click-outside';
import { getExtensions } from './editor-extensions';
import type { ReportScoreResult } from './report-block-data';
import { buildSuggestionItems, SuggestionItem } from './editor-commands';
import { SlashCommandMenu } from './slash-command-menu';
import { ReportTableMenu } from './report-table-menu';
import { showToast } from '@/components/toast';
import { CoverPicker } from './cover-picker';
import { TitleEditor } from './title-editor';
import { BlockPlusButton } from './block-plus-button';
import { BlockHandleMenu } from './block-handle-menu';
import { getPageWidthOptions, resolvePageWidth, widthToClass } from '../workspace/page-width';
import { usePagePath } from '@/hooks/use-page-path';
import { MentionPopup } from './mention-popup';
import { MentionChipHydrator } from './mention-chip-hydrator';
import { AgenticQueryHydrator } from './agentic-query-hydrator';
import { MermaidHydrator } from './mermaid-hydrator';
import { FrontmatterDrawer } from './frontmatter-drawer';
import { LinkedMentionsPanel } from './linked-mentions-panel';
import { useI18n } from '@/components/i18n-provider';
import { ConfirmModal } from '@/components/confirm-modal';
import { BreadcrumbTrail } from '../workspace/breadcrumb-trail';
import { WorkspaceHeader } from '../workspace/workspace-header';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="w-[352px] h-[435px] flex items-center justify-center text-sm text-notion-text-muted">
      Carregando...
    </div>
  ),
});

const INITIAL_DOC = {
  type: 'doc',
  content: [],
};

interface EditorPanelProps {
  pageId?: string;
  isModal?: boolean;
  slotAfterEditor?: ReactNode;
}

type InternalLinkContext =
  | { mode: 'editor'; from: number; to: number; alias?: string }
  | { mode: 'source'; from: number; to: number; alias?: string };

function applyLinkSubmit(editor: any, selectedText: string, submit: { text: string; href: string; pageId?: string | null }) {
  const chain = editor.chain().focus();
  if (submit.pageId) {
    chain
      .insertContent([
        {
          type: 'pageMention',
          attrs: {
            pageId: submit.pageId,
            alias: submit.text && submit.text !== selectedText ? submit.text : null,
          },
        },
        { type: 'text', text: ' ' },
      ])
      .run();
    return;
  }
  if (!submit.href) {
    chain.unsetLink().run();
    return;
  }
  if (submit.text && submit.text !== selectedText) {
    chain
      .insertContent({
        type: 'text',
        text: submit.text,
        marks: [{ type: 'link', attrs: { href: submit.href } }],
      })
      .run();
  } else {
    chain.setLink({ href: submit.href }).run();
  }
}

export function resolveRelativeProjectPath(fromPath: string, rel: string): string {
  if (/^https?:\/\//i.test(rel) || rel.startsWith('/')) return rel;
  const baseSegments = fromPath.split('/').slice(0, -1);
  for (const segment of rel.split('/')) {
    if (segment === '..') baseSegments.pop();
    else if (segment !== '' && segment !== '.') baseSegments.push(segment);
  }
  return baseSegments.join('/');
}

export function matchSourcePath(href: string): string | null {
  if (!href) return null;
  const candidates: string[] = [];
  if (/^sources\//.test(href)) candidates.push(href);
  if (/^\.{1,2}\/sources\//.test(href)) candidates.push(href.replace(/^\.{1,2}\//, ''));
  if (/^\/project\/sources\//.test(href)) candidates.push(href.replace(/^\/project\//, ''));
  if (typeof window !== 'undefined' && href.startsWith(window.location.origin)) {
    const rel = href.slice(window.location.origin.length);
    if (rel.startsWith('/project/sources/')) candidates.push(rel.replace(/^\/project\//, ''));
  }
  for (const candidate of candidates) {
    const cleaned = candidate.split(/[?#]/)[0];
    if (cleaned.startsWith('sources/') && !cleaned.includes('..')) return cleaned;
  }
  return null;
}

function pageLinkLabel(path: string) {
  return path.split('/').pop()?.replace(/\.md$/, '') || path;
}

function relativeMarkdownPath(fromPath: string, toPath: string) {
  const fromParts = fromPath.split('/').slice(0, -1);
  const toParts = toPath.split('/');
  let common = 0;
  while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) common++;
  return [...Array(fromParts.length - common).fill('..'), ...toParts.slice(common)].join('/') || pageLinkLabel(toPath);
}

function normalizeHeadingAnchor(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function currentHashAnchor() {
  if (typeof window === 'undefined' || !window.location.hash) return '';
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function EditorPanel({ pageId, isModal, slotAfterEditor }: EditorPanelProps) {
  const { t, locale } = useI18n();
  const activePageId = useWorkspace((s) => s.activePageId);
  const effectivePageId = pageId || activePageId;
  const pages = useWorkspace((s) => s.pages);
  const activePage = useWorkspace((s) => s.pages.find((p) => p.id === effectivePageId));
  const updatePage = useWorkspace((s) => s.updatePage);
  const savePage = useWorkspace((s) => s.savePage);
  const deleteFile = useWorkspace((s) => s.deleteFile);
  const setSourceMode = useWorkspace((s) => s.setSourceMode);
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite);
  const effectiveWidth = useWorkspace((s) =>
    resolvePageWidth(effectivePageId || null, s.pages, s.settings.defaultPageWidth)
  );
  const pagePath = usePagePath();
  const isReadOnly = activePage?.readOnly ?? true;

  const [mounted, setMounted] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWidthSub, setShowWidthSub] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showFrontmatterDrawer, setShowFrontmatterDrawer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingPasteHtml, setPendingPasteHtml] = useState<{ html?: string; text?: string } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastPlusTimeRef = useRef(0);
  const editorInstanceRef = useRef<any>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const linkContextRef = useRef<InternalLinkContext | null>(null);
  const router = useRouter();

  useClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
  useClickOutside(menuRef, () => {
    setShowMenu(false);
    setShowWidthSub(false);
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !activePage?.loaded || activePage.sourceMode) return;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    const scrollToHash = () => {
      const anchor = normalizeHeadingAnchor(currentHashAnchor());
      if (!anchor) return;
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          const root = document.getElementById(`noteblock-editor-${activePage.id}`);
          const headings = Array.from(root?.querySelectorAll<HTMLHeadingElement>('h1,h2,h3') || []);
          const heading = headings.find((el) => normalizeHeadingAnchor(el.textContent || '') === anchor);
          heading?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
      });
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      window.removeEventListener('hashchange', scrollToHash);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [activePage?.id, activePage?.loaded, activePage?.sourceMode, mounted]);

  useEffect(() => {
    if (!pendingPasteHtml) return;
    const editor = editorInstanceRef.current;
    if (!editor) return;
    try {
      if (pendingPasteHtml.html) {
        editor.commands.insertContent(pendingPasteHtml.html, {
          parseOptions: { preserveWhitespace: 'full' },
        });
      } else if (pendingPasteHtml.text) {
        for (const block of pendingPasteHtml.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
          editor.commands.insertContent({ type: 'paragraph', content: [{ type: 'text', text: block }] });
        }
      }
    } finally {
      setPendingPasteHtml(null);
    }
  }, [pendingPasteHtml]);

  const handleSave = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!activePage || isReadOnly) return;
    const ok = await savePage(activePage.id, { notes: silent ? 'autosave no companion Noteon local' : 'salvo no companion Noteon local', silent });
    if (ok) {
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (!silent) showToast(t('editorToasts.fileSaved'), 'success');
    } else if (!silent) {
      showToast(useWorkspace.getState().pages.find((p) => p.id === activePage.id)?.saveError || t('editorToasts.saveFailed'), 'error');
    }
  }, [activePage, isReadOnly, savePage]);

  const handleDelete = useCallback(async () => {
    if (!activePage || activePage.path === 'brain/log.md') return;
    if (activePage.dirty) {
      showToast(t('deleteFile.unsavedError'), 'error');
      setShowDeleteConfirm(false);
      return;
    }
    setDeleting(true);
    const ok = await deleteFile(activePage.id);
    setDeleting(false);
    setShowDeleteConfirm(false);
    showToast(ok ? t('deleteFile.movedToTrash') : t('deleteFile.failed'), ok ? 'success' : 'error');
  }, [activePage, deleteFile, t]);

  useEffect(() => {
    if (!activePage || isReadOnly || !activePage.loaded || !activePage.dirty || activePage.saving || activePage.saveError) return;
    const timer = window.setTimeout(() => {
      void handleSave({ silent: true });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [
    activePage?.id,
    activePage?.dirty,
    activePage?.saving,
    activePage?.saveError,
    activePage?.updatedAt,
    activePage?.loaded,
    handleSave,
    isReadOnly,
  ]);

  const handleReportScoreRecalculated = useCallback((result: ReportScoreResult) => {
    if (!activePage?.path.startsWith(`${REPORT_DIR_NAME}/`)) return;
    updatePage(activePage.id, {
      frontmatter: {
        ...(activePage.frontmatter || {}),
        score: result.score,
      },
    });
    showToast(t('editorToasts.scoreRecalculated', { score: result.score }), 'success');
  }, [activePage?.frontmatter, activePage?.id, activePage?.path, updatePage]);

  if (!mounted) return <div className="flex-1 bg-background" />;
  if (!activePage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-notion-text-muted">{t('editor.loadingWorkspace')}</p>
      </div>
    );
  }

  const pageWidthOptions = getPageWidthOptions(t);
  const validContent: JSONContent =
    activePage.content && typeof activePage.content === 'object' && 'type' in activePage.content
      ? (activePage.content as JSONContent)
      : (INITIAL_DOC as JSONContent);
  const suggestionItems: SuggestionItem[] = buildSuggestionItems(t);

  const statusLabel = activePage.saving
    ? t('editor.saving')
    : activePage.saveError
      ? activePage.saveError
      : activePage.dirty
        ? t('editor.unsaved')
        : lastSavedAt
          ? t('editor.savedAt', { time: lastSavedAt })
          : t('editor.saved');

  const openInternalLinkPicker = (clientRect: Pick<DOMRect, 'left' | 'bottom'> | { left: number; bottom: number }, query = '') => {
    window.dispatchEvent(new CustomEvent('noteblock:internal-link-open', { detail: { clientRect, query } }));
  };

  const markdownLinkForPage = (targetPageId: string, alias?: string) => {
    const target = pages.find((p) => p.id === targetPageId);
    if (!target) return '';
    const label = pageLinkLabel(target.path);
    const aliasClean = alias?.trim();
    if (activePage.path.startsWith('brain/') && target.path.startsWith('brain/')) {
      return aliasClean ? `[[${label}|${aliasClean}]]` : `[[${label}]]`;
    }
    return `[${aliasClean || target.title || label}](${relativeMarkdownPath(activePage.path, target.path)})`;
  };

  const insertInternalLink = (mentionPageId: string) => {
    if (isReadOnly) {
      showToast(t('editorToasts.pageReadOnly'), 'error');
      return;
    }
    const context = linkContextRef.current;
    const target = pages.find((p) => p.id === mentionPageId);
    if (!target) return;
    if (context?.mode === 'source') {
      const text = markdownLinkForPage(mentionPageId, context.alias);
      const current = activePage.sourceBody || '';
      const next = `${current.slice(0, context.from)}${text}${current.slice(context.to)}`;
      updatePage(activePage.id, { sourceBody: next });
      requestAnimationFrame(() => {
        const textarea = sourceTextareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(context.from + text.length, context.from + text.length);
      });
      linkContextRef.current = null;
      return;
    }

    const editor = editorInstanceRef.current;
    if (!editor) return;
    const shouldUseWikilinkChip = activePage.path.startsWith('brain/') && target.path.startsWith('brain/');
    const insertContent = shouldUseWikilinkChip
      ? [{ type: 'pageMention', attrs: { pageId: mentionPageId, alias: context?.alias || null } }, { type: 'text', text: ' ' }]
      : `${markdownLinkForPage(mentionPageId, context?.alias)} `;
    if (context?.mode === 'editor' && context.to >= context.from) {
      editor.chain().focus().deleteRange({ from: context.from, to: context.to }).insertContent(insertContent).run();
    } else {
      editor.chain().focus().insertContent(insertContent).run();
    }
    linkContextRef.current = null;
  };

  const handleSourceKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.metaKey || event.ctrlKey;
    const textarea = event.currentTarget;
    if (mod && event.key.toLowerCase() === 'k' && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      if (isReadOnly) {
        showToast(t('editorToasts.pageReadOnly'), 'error');
        return;
      }
      const alias = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
      linkContextRef.current = {
        mode: 'source',
        from: textarea.selectionStart,
        to: textarea.selectionEnd,
        alias: alias || undefined,
      };
      openInternalLinkPicker(textarea.getBoundingClientRect(), alias);
      return;
    }
    if (event.key === '[' && !mod && textarea.selectionStart === textarea.selectionEnd && textarea.selectionStart > 0) {
      const before = textarea.value.slice(textarea.selectionStart - 1, textarea.selectionStart);
      if (before !== '[') return;
      event.preventDefault();
      linkContextRef.current = {
        mode: 'source',
        from: textarea.selectionStart - 1,
        to: textarea.selectionStart,
      };
      openInternalLinkPicker(textarea.getBoundingClientRect());
    }
  };

  return (
    <div className={cn('flex-1 flex flex-col h-full bg-background overflow-hidden relative', isModal && 'rounded-lg overflow-y-auto')}>
      {!isModal && (
        <WorkspaceHeader
          left={<BreadcrumbTrail activePage={activePage} />}
          rightRef={menuRef}
          right={
            <>
              <span className={cn('text-[11px] mr-1', activePage.saveError ? 'text-red-500' : 'text-notion-text-muted')}>
                {statusLabel}
              </span>
              {!isReadOnly && (
                <HeaderButton
                  icon={activePage.saving ? <div className="w-3.5 h-3.5 border-2 border-notion-text/20 border-t-notion-text rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  onClick={() => void handleSave()}
                  ariaLabel={t('common.save')}
                />
              )}
              <HeaderButton
                icon={<Star className={cn('w-4 h-4', activePage.favorite && 'fill-amber-400 text-amber-400')} />}
                onClick={() => toggleFavorite(activePage.id)}
                ariaLabel={activePage.favorite ? t('sidebar.removeFavorite') : t('sidebar.addFavorite')}
              />
              <div className="relative">
                <HeaderButton icon={<MoreHorizontal className="w-4 h-4" />} onClick={() => setShowMenu(!showMenu)} ariaLabel={t('editor.more')} />
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-60 bg-background border border-notion-border rounded-md shadow-lg z-50 py-1 overflow-hidden"
                    >
                      <MenuAction
                        icon={<Check className="w-4 h-4" />}
                        label={activePage.sourceMode ? t('editor.visualEditor') : t('editor.markdownSource')}
                        onClick={() => {
                          setSourceMode(activePage.id, !activePage.sourceMode);
                          setShowMenu(false);
                        }}
                      />
                      <MenuAction
                        icon={<FileText className="w-4 h-4" />}
                        label={t('editor.frontmatter')}
                        onClick={() => {
                          setShowFrontmatterDrawer(true);
                          setShowMenu(false);
                        }}
                      />
                      {!activePage.readOnly && activePage.path !== 'brain/log.md' && !activePage.path.startsWith(`${REPORT_DIR_NAME}/`) && (
                        <MenuAction
                          icon={<Trash2 className="w-4 h-4" />}
                          label={t('common.delete')}
                          destructive
                          onClick={() => {
                            setShowDeleteConfirm(true);
                            setShowMenu(false);
                          }}
                        />
                      )}
                      <div className="relative">
                        <button
                          onClick={() => setShowWidthSub((v) => !v)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer text-notion-text"
                        >
                          <span className="flex items-center gap-2">
                            <Maximize2 className="w-4 h-4" />
                            {t('pageWidth.pageWidth')}
                          </span>
                          <span className="text-[10px] text-notion-text-muted uppercase">{activePage.width || t('pageWidth.auto')}</span>
                        </button>
                        {showWidthSub && (
                          <div className="absolute left-full top-0 ml-1 w-64 bg-background border border-notion-border rounded-md shadow-lg py-1 z-[60]">
                            {pageWidthOptions.map((opt) => (
                              <WidthMenuItem
                                key={opt.value}
                                active={activePage.width === opt.value}
                                label={opt.label}
                                description={opt.description}
                                onClick={() => {
                                  updatePage(activePage.id, { width: opt.value });
                                  setShowWidthSub(false);
                                  setShowMenu(false);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="h-px bg-notion-border my-1" />
                      <div className="px-3 py-1.5 text-[10px] text-notion-text-muted truncate">{activePage.path}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          }
        />
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide relative pb-32">
        {activePage.cover && (
          <div className={cn('w-full relative group/cover', isModal ? 'h-32 sm:h-48' : 'h-48 sm:h-64')}>
            <img src={activePage.cover} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
              <button onClick={() => setShowCoverPicker(true)} className="bg-background/80 backdrop-blur text-xs px-2 py-1 rounded shadow-sm cursor-pointer text-notion-text">
                Change cover
              </button>
              <button onClick={() => updatePage(activePage.id, { cover: null })} className="bg-background/80 backdrop-blur text-xs px-2 py-1 rounded shadow-sm cursor-pointer text-notion-text">
                Remove
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            'w-full mx-auto',
            widthToClass(effectiveWidth),
            isModal ? 'px-10 pt-14' : 'px-12 md:px-16 pt-10',
            activePage.cover ? 'mt-6' : 'mt-2'
          )}
        >
          <div className="group/title relative mb-4">
            <div className="opacity-0 group-hover/title:opacity-100 transition-opacity flex gap-2 absolute -top-8 left-0 text-sm text-notion-text-muted">
              {!activePage.readOnly && !activePage.icon && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(true);
                  }}
                  className="hover:bg-notion-hover px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Smile className="w-4 h-4" /> {t('editor.addIcon')}
                </button>
              )}
              {!activePage.readOnly && !activePage.cover && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCoverPicker(true);
                  }}
                  className="hover:bg-notion-hover px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" /> {t('editor.addCover')}
                </button>
              )}
              <CoverPicker
                open={showCoverPicker}
                currentCover={activePage.cover}
                onClose={() => setShowCoverPicker(false)}
                onChange={(cover) => updatePage(activePage.id, { cover })}
              />
            </div>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  ref={emojiPickerRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute z-50 left-0 top-12 shadow-xl border border-notion-border rounded-lg bg-background"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    onEmojiClick={(emoji) => {
                      updatePage(activePage.id, { icon: emoji.emoji });
                      setShowEmojiPicker(false);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end gap-2">
              {activePage.icon && (
                <div className="relative group/icon-container shrink-0 self-end mb-[0.36em]">
                  <button
                    type="button"
                    className={cn(
                      'flex h-[1.15em] w-[1.15em] items-center justify-center rounded-md leading-none transition-colors',
                      !activePage.readOnly && 'cursor-pointer hover:bg-notion-hover',
                      activePage.readOnly && 'cursor-default',
                      isModal ? 'text-3xl' : 'text-[40px]'
                    )}
                    onClick={(e) => {
                      if (activePage.readOnly) return;
                      e.stopPropagation();
                      setShowEmojiPicker(true);
                    }}
                    aria-label={activePage.readOnly ? activePage.title || t('common.untitled') : t('editor.addIcon')}
                  >
                    {activePage.icon}
                  </button>
                  {!activePage.readOnly && (
                    <button
                      type="button"
                      onClick={() => updatePage(activePage.id, { icon: null })}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-background border border-notion-border rounded-full opacity-0 group-hover/icon-container:opacity-100 transition-opacity shadow-sm hover:bg-notion-hover cursor-pointer"
                      aria-label={t('editor2.removeIcon')}
                    >
                      <X className="w-3 h-3 text-notion-text-muted" />
                    </button>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <TitleEditor
                  pageId={activePage.id}
                  initialTitle={activePage.title}
                  placeholder={t('common.untitled')}
                  endAction={
                    !isModal
                      ? {
                          icon: <Settings />,
                          label: 'Editar metadados',
                          onClick: (e) => {
                            e.stopPropagation();
                            setShowFrontmatterDrawer((open) => !open);
                          },
                        }
                      : undefined
                  }
                  isModal={isModal}
                  autoFocus={!activePage.title && !activePage.readOnly}
                  readOnly={activePage.readOnly}
                  onEnter={() => {
                    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null;
                    editorEl?.focus();
                  }}
                  onPasteMultiline={(p) => setPendingPasteHtml(p)}
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-notion-text-muted">
              {activePage.readOnly && <span className="rounded bg-notion-active px-2 py-0.5">{t('shared.readOnly')}</span>}
              <button
                onClick={() => setShowFrontmatterDrawer(true)}
                className="rounded bg-notion-active hover:bg-notion-hover px-2 py-0.5 cursor-pointer text-notion-text-muted hover:text-notion-text"
              >
                {t('editor.frontmatter')} · {activePage.path.startsWith('conteudos/') ? activePage.frontmatter?.origem || t('project.content') : activePage.path.startsWith('brain/') ? 'brain' : 'local'} · {t('project.fieldCount', { count: Object.keys(activePage.frontmatter || {}).length })}
              </button>
              <span className="truncate">{activePage.path}</span>
            </div>
          </div>

          {activePage.sourceMode ? (
            <textarea
              ref={sourceTextareaRef}
              value={activePage.sourceBody}
              readOnly={isReadOnly}
              onChange={(e) => updatePage(activePage.id, { sourceBody: e.target.value })}
              onKeyDown={handleSourceKeyDown}
              className="w-full min-h-[520px] resize-y rounded-md border border-notion-border bg-background px-4 py-3 font-mono text-sm leading-6 text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
              spellCheck={false}
            />
          ) : !activePage.loaded ? (
            <div className="py-24 flex justify-center">
              <div className="w-8 h-8 border-2 border-notion-text/20 border-t-notion-text rounded-full animate-spin" />
            </div>
          ) : (
            <TiptapEditorSurface
              key={activePage.id}
              pageId={activePage.id}
              content={validContent}
              editable={!isReadOnly}
              isReadOnly={isReadOnly}
              isModal={isModal}
              locale={locale}
              suggestionItems={suggestionItems}
              editorInstanceRef={editorInstanceRef}
              linkContextRef={linkContextRef}
              lastPlusTimeRef={lastPlusTimeRef}
              onUpdate={(content) => updatePage(activePage.id, { content })}
              onOpenInternalLinkPicker={openInternalLinkPicker}
              onReportScoreRecalculated={handleReportScoreRecalculated}
            />
          )}
          {!isModal && activePage.path && <LinkedMentionsPanel pagePath={activePage.path} />}
          {slotAfterEditor}
        </div>
      </div>

      <MentionPopup
        onSelect={insertInternalLink}
      />
      {!isModal && !isReadOnly && !activePage.sourceMode && (
        <>
          <BlockPlusButton editorRef={editorInstanceRef} />
          <BlockHandleMenu editorRef={editorInstanceRef} />
        </>
      )}
      {!isModal && <FrontmatterDrawer page={activePage} open={showFrontmatterDrawer} onClose={() => setShowFrontmatterDrawer(false)} />}
      {!isModal && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => !deleting && setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title={t('deleteFile.title')}
          description={t('deleteFile.description', { title: activePage.title || t('common.untitled') })}
          confirmLabel={deleting ? t('common.loading') : t('common.delete')}
          cancelLabel={t('common.cancel')}
          destructive
        />
      )}
    </div>
  );
}

function TiptapEditorSurface({
  pageId,
  content,
  editable,
  isReadOnly,
  isModal,
  locale,
  suggestionItems,
  editorInstanceRef,
  linkContextRef,
  lastPlusTimeRef,
  onUpdate,
  onOpenInternalLinkPicker,
  onReportScoreRecalculated,
}: {
  pageId: string;
  content: JSONContent;
  editable: boolean;
  isReadOnly: boolean;
  isModal?: boolean;
  locale: string;
  suggestionItems: SuggestionItem[];
  editorInstanceRef: MutableRefObject<any>;
  linkContextRef: MutableRefObject<InternalLinkContext | null>;
  lastPlusTimeRef: MutableRefObject<number>;
  onUpdate: (content: JSONContent) => void;
  onOpenInternalLinkPicker: (clientRect: Pick<DOMRect, 'left' | 'bottom'> | { left: number; bottom: number }, query?: string) => void;
  onReportScoreRecalculated: (result: ReportScoreResult) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  useEffect(() => {
    (window as any).__noteblockSlashItems = (query: string) => {
      if (!query) return suggestionItems;
      const q = query.toLowerCase();
      return suggestionItems.filter((item) => item.title.toLowerCase().includes(q) || item.searchTerms?.some((term) => term.includes(q)));
    };
    return () => {
      delete (window as any).__noteblockSlashItems;
    };
  }, [suggestionItems]);

  const editor = useEditor({
    content,
    editable,
    immediatelyRender: false,
    extensions: getExtensions({ onReportScoreRecalculated, locale: locale as any }),
    onCreate: ({ editor }) => {
      editorInstanceRef.current = editor;
    },
    onDestroy: () => {
      editorInstanceRef.current = null;
    },
    onUpdate: ({ editor }) => {
      editorInstanceRef.current = editor;
      onUpdate(editor.getJSON() as JSONContent);
    },
    editorProps: {
      attributes: {
        class: cn('prose prose-zinc dark:prose-invert max-w-none focus:outline-none', isModal ? 'min-h-[300px]' : 'min-h-[500px]'),
      },
      handleClickOn: (_view, _pos, _node, _nodePos, event) => {
        const target = (event.target as HTMLElement | null)?.closest?.('a');
        if (!target || !(target instanceof HTMLAnchorElement)) return false;
        const href = target.getAttribute('href') || '';
        if (!href) return false;
        const sourcePath = matchSourcePath(href);
        if (sourcePath) {
          if (event.metaKey || event.ctrlKey) {
            window.open(target.href, '_blank', 'noopener,noreferrer');
          } else {
            event.preventDefault();
            useWorkspace.getState().openSourceViewer(sourcePath);
          }
          return true;
        }
        if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
          event.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
          return true;
        }
        if (/\.md(?:#[^?]*)?$/i.test(href) && !href.startsWith('/')) {
          const store = useWorkspace.getState();
          const current = store.pages.find((p) => p.id === store.activePageId);
          if (current) {
            const targetPath = resolveRelativeProjectPath(current.path, href.replace(/#.*$/, ''));
            const targetPage = store.pages.find((p) => p.path === targetPath);
            if (targetPage && store.token) {
              event.preventDefault();
              store.setActivePage(targetPage.id);
              void store.loadPage(targetPage.id);
              router.push(`/project/${store.token}/${targetPage.slug}`);
              return true;
            }
            // Fallback for cluster subpages or content paths that may not yet be in store.pages.
            if (store.token && targetPath) {
              const slug = targetPath.replace(/\.md$/, '').replace(/\//g, '-');
              event.preventDefault();
              router.push(`/project/${store.token}/${slug}`);
              return true;
            }
          }
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        const mod = event.metaKey || event.ctrlKey;
        if (mod && event.key.toLowerCase() === 'k' && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          if (isReadOnly) {
            showToast(t('editorToasts.pageReadOnly'), 'error');
            return true;
          }
          const { selection } = view.state;
          if (!selection.empty) {
            const ed = editorInstanceRef.current;
            const selectedText = view.state.doc.textBetween(selection.from, selection.to, ' ');
            const existing = (ed?.getAttributes('link') || {}) as { href?: string };
            useWorkspace.getState().openLinkEditor(
              { text: selectedText, href: existing.href || '' },
              (submit) => {
                if (!ed) return;
                applyLinkSubmit(ed, selectedText, submit);
              }
            );
            return true;
          }
          const alias = '';
          linkContextRef.current = {
            mode: 'editor',
            from: selection.from,
            to: selection.to,
            alias: undefined,
          };
          onOpenInternalLinkPicker(view.coordsAtPos(selection.from), alias);
          return true;
        }
        if (event.key === '[' && !mod) {
          const { state } = view;
          const { selection } = state;
          if (selection.empty && selection.from > 1 && state.doc.textBetween(selection.from - 1, selection.from) === '[') {
            event.preventDefault();
            view.dispatch(state.tr.delete(selection.from - 1, selection.from));
            linkContextRef.current = {
              mode: 'editor',
              from: selection.from - 1,
              to: selection.from - 1,
            };
            onOpenInternalLinkPicker(view.coordsAtPos(selection.from - 1));
            return true;
          }
        }
        if (event.key === '+') {
          const now = Date.now();
          if (now - lastPlusTimeRef.current < 350) {
            event.preventDefault();
            const { selection } = view.state;
            view.dispatch(view.state.tr.delete(selection.from - 1, selection.from));
            showToast(t('editorToasts.aiUnavailable'), 'error');
            lastPlusTimeRef.current = 0;
            return true;
          }
          lastPlusTimeRef.current = now;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  return (
    <div id={`noteblock-editor-${pageId}`} className="noteblock-editor relative group/editor">
      <MentionChipHydrator editorRootId={`noteblock-editor-${pageId}`} />
      <AgenticQueryHydrator editorRootId={`noteblock-editor-${pageId}`} />
      <MermaidHydrator editorRootId={`noteblock-editor-${pageId}`} />
      {editor && (
        <BubbleMenu
          editor={editor}
          updateDelay={120}
          shouldShow={({ editor }) => editor.isEditable && !editor.isActive('table') && !editor.state.selection.empty}
          className="z-40 flex w-fit max-w-full overflow-hidden rounded-lg border border-notion-border bg-background shadow-lg"
        >
          <BubbleBtn editor={editor} onSelect={(ed) => ed.chain().focus().toggleBold().run()} label="Bold">
            <Bold className="w-4 h-4" />
          </BubbleBtn>
          <BubbleBtn editor={editor} onSelect={(ed) => ed.chain().focus().toggleItalic().run()} label="Italic">
            <Italic className="w-4 h-4" />
          </BubbleBtn>
          <BubbleBtn editor={editor} onSelect={(ed) => ed.chain().focus().toggleUnderline().run()} label="Underline">
            <Underline className="w-4 h-4" />
          </BubbleBtn>
          <BubbleBtn editor={editor} onSelect={(ed) => ed.chain().focus().toggleStrike().run()} label="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </BubbleBtn>
          <BubbleBtn editor={editor} onSelect={(ed) => ed.chain().focus().toggleCode().run()} label="Code">
            <Code className="w-4 h-4" />
          </BubbleBtn>
          <BubbleSep />
          <BubbleBtn
            editor={editor}
            onSelect={(ed) => {
              const { from, to } = ed.state.selection;
              const selectedText = ed.state.doc.textBetween(from, to, ' ');
              const existing = ed.getAttributes('link') as { href?: string };
              useWorkspace.getState().openLinkEditor(
                { text: selectedText, href: existing.href || '' },
                (submit) => applyLinkSubmit(ed, selectedText, submit)
              );
            }}
            label="Link"
          >
            <Link2 className="w-4 h-4" />
          </BubbleBtn>
          <BubbleBtn editor={editor} onSelect={(ed) => ed.chain().focus().toggleHighlight().run()} label="Highlight">
            <Highlighter className="w-4 h-4" />
          </BubbleBtn>
        </BubbleMenu>
      )}
      {editor && (
        <ReportTableMenu editor={editor} locale={locale} onScoreRecalculated={onReportScoreRecalculated} />
      )}
      <EditorContent editor={editor} />
      <SlashCommandMenu />
    </div>
  );
}

function BubbleBtn({
  editor,
  onSelect,
  label,
  children,
  className,
}: {
  editor: Editor;
  onSelect: (editor: any) => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(editor)}
      className={cn('flex h-8 w-8 items-center justify-center text-notion-text hover:bg-notion-hover cursor-pointer', className)}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function BubbleSep() {
  return <div className="w-px h-5 bg-notion-border self-center" />;
}

function HeaderButton({ icon, onClick, ariaLabel }: { icon: ReactNode; onClick?: () => void; ariaLabel?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="p-1.5 rounded hover:bg-notion-hover text-notion-text-muted hover:text-notion-text transition-colors cursor-pointer"
    >
      {icon}
    </button>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
  destructive,
  className,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer',
        destructive ? 'text-red-500' : 'text-notion-text',
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function WidthMenuItem({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
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
