'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '../workspace/store';

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'UL', 'OL', 'BLOCKQUOTE', 'PRE']);

function stripFirstBlock(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    let container: Element | null = body;
    while (container && container.children.length === 1 && !BLOCK_TAGS.has(container.children[0].tagName)) {
      container = container.firstElementChild;
    }

    if (container) {
      for (const child of Array.from(container.children)) {
        if (BLOCK_TAGS.has(child.tagName)) {
          child.remove();
          return body.innerHTML;
        }
      }
      const firstText = body.textContent || '';
      const idx = firstText.indexOf('\n');
      if (idx >= 0) return firstText.slice(idx + 1);
    }
    return body.innerHTML;
  } catch {
    return html;
  }
}

interface TitleEditorProps {
  pageId: string;
  initialTitle: string;
  placeholder: string;
  prefix?: ReactNode;
  endAction?: {
    icon: ReactNode;
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  };
  isModal?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
  onPasteMultiline?: (payload: { html?: string; text?: string }) => void;
  onEnter?: () => void;
}

export function TitleEditor({
  pageId,
  initialTitle,
  placeholder,
  prefix,
  endAction,
  isModal,
  autoFocus,
  readOnly,
  onPasteMultiline,
  onEnter,
}: TitleEditorProps) {
  const updatePage = useWorkspace((s) => s.updatePage);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const textNodeRef = useRef<Text | null>(null);
  const valueRef = useRef(initialTitle);
  const lastCommittedRef = useRef(initialTitle);
  const pageIdRef = useRef(pageId);
  const composingRef = useRef(false);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureTextNode = () => {
    const el = editorRef.current;
    if (!el) return null;
    if (textNodeRef.current && el.contains(textNodeRef.current)) return textNodeRef.current;
    const node = el.lastChild;
    if (node && node.nodeType === Node.TEXT_NODE) {
      textNodeRef.current = node as Text;
      return textNodeRef.current;
    }
    const created = document.createTextNode('');
    el.appendChild(created);
    textNodeRef.current = created;
    return textNodeRef.current;
  };

  const writeText = (text: string) => {
    const node = ensureTextNode();
    if (!node) return;
    if (node.textContent !== text) node.textContent = text;
    const el = editorRef.current;
    if (el) el.dataset.empty = text.length === 0 ? 'true' : 'false';
  };

  useEffect(() => {
    if (pageIdRef.current !== pageId) {
      pageIdRef.current = pageId;
      valueRef.current = initialTitle;
      lastCommittedRef.current = initialTitle;
      writeText(initialTitle);
      return;
    }
    const editor = editorRef.current;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (
      initialTitle !== lastCommittedRef.current &&
      !composingRef.current &&
      active !== editor
    ) {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      valueRef.current = initialTitle;
      lastCommittedRef.current = initialTitle;
      writeText(initialTitle);
    }
  }, [pageId, initialTitle]);

  useEffect(() => {
    writeText(valueRef.current || initialTitle || '');
    if (autoFocus && !initialTitle) {
      const t = setTimeout(() => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const node = ensureTextNode();
        if (node) {
          const range = document.createRange();
          range.setStart(node, node.textContent?.length ?? 0);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 60);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const scheduleCommit = (next: string) => {
    if (composingRef.current) return;
    if (next === lastCommittedRef.current) return;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      lastCommittedRef.current = next;
      updatePage(pageId, { title: next });
    }, 120);
  };

  const readCurrentText = (): string => {
    const node = textNodeRef.current;
    return node?.textContent ?? '';
  };

  const handleInput = () => {
    if (readOnly) return;
    const text = readCurrentText().replace(/\n/g, '');
    valueRef.current = text;
    const el = editorRef.current;
    if (el) el.dataset.empty = text.length === 0 ? 'true' : 'false';
    scheduleCommit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = readCurrentText().replace(/\n/g, '');
      valueRef.current = text;
      if (text !== lastCommittedRef.current) {
        lastCommittedRef.current = text;
        updatePage(pageId, { title: text });
      }
      onEnter?.();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.startOffset === 0 && (range.startContainer === textNodeRef.current || range.startContainer === editorRef.current)) {
          if (e.key === 'Backspace') e.preventDefault();
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLHeadingElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html && text.includes('\n')) {
      const firstLine = (text.match(/^[^\n]*/)?.[0] || '').trim();
      if (firstLine) document.execCommand('insertText', false, firstLine);
      const strippedHtml = stripFirstBlock(html);
      if (strippedHtml.trim()) onPasteMultiline?.({ html: strippedHtml });
      else {
        const rest = text.split('\n').slice(1).join('\n').trim();
        if (rest) onPasteMultiline?.({ text: rest });
      }
      return;
    }
    if (text.includes('\n')) {
      const [firstLine, ...rest] = text.split('\n');
      if (firstLine) document.execCommand('insertText', false, firstLine);
      const restText = rest.join('\n').trim();
      if (restText) onPasteMultiline?.({ text: restText });
      return;
    }
    document.execCommand('insertText', false, text);
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };
  const handleCompositionEnd = () => {
    composingRef.current = false;
    handleInput();
  };

  const titleClassName = cn(
    'block font-bold border-none outline-none bg-transparent text-notion-text tracking-tight leading-[1.15]',
    'whitespace-pre-wrap break-words',
    readOnly && 'cursor-default',
    isModal ? 'text-3xl' : 'text-[40px]',
  );

  return (
    <div className={cn('grid items-start', endAction ? 'grid-cols-[minmax(0,1fr)_auto] gap-[0.35em]' : 'grid-cols-1')}>
      <h1
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="false"
        aria-label={placeholder}
        data-placeholder={placeholder}
        data-empty={(valueRef.current || initialTitle || '').length === 0 ? 'true' : 'false'}
        spellCheck
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={cn(titleClassName, 'title-editor px-2')}
      >
        {prefix && (
          <span
            contentEditable={false}
            className="select-none mr-[0.18em] align-baseline"
          >
            {prefix}
          </span>
        )}
      </h1>
      {endAction && (
        <button
          type="button"
          onClick={endAction.onClick}
          className={cn(
            'mt-[0.075em] flex h-[1em] w-[1em] items-center justify-center text-notion-text-muted opacity-0 transition-opacity hover:text-notion-text group-hover/title:opacity-100 focus-visible:opacity-100 [&_svg]:h-[52.5%] [&_svg]:w-[52.5%]',
            isModal ? 'text-3xl' : 'text-[40px]'
          )}
          aria-label={endAction.label}
          title={endAction.label}
        >
          {endAction.icon}
        </button>
      )}
    </div>
  );
}
