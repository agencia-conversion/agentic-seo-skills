'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  endAction,
  isModal,
  autoFocus,
  readOnly,
  onPasteMultiline,
  onEnter,
}: TitleEditorProps) {
  const updatePage = useWorkspace((s) => s.updatePage);
  const [value, setValue] = useState(initialTitle);
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastCommittedRef = useRef(initialTitle);
  const pageIdRef = useRef(pageId);

  useEffect(() => {
    if (pageIdRef.current !== pageId) {
      pageIdRef.current = pageId;
      setValue(initialTitle);
      lastCommittedRef.current = initialTitle;
    }
  }, [pageId, initialTitle]);

  useEffect(() => {
    if (autoFocus && !initialTitle) {
      const t = setTimeout(() => ref.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [autoFocus, initialTitle, pageId]);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  useEffect(() => {
    if (value === lastCommittedRef.current) return;
    const t = setTimeout(() => {
      lastCommittedRef.current = value;
      updatePage(pageId, { title: value });
    }, 120);
    return () => clearTimeout(t);
  }, [value, pageId, updatePage]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    setValue(e.target.value.replace(/\n/g, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value !== lastCommittedRef.current) {
        lastCommittedRef.current = value;
        updatePage(pageId, { title: value });
      }
      onEnter?.();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html && text.includes('\n')) {
      e.preventDefault();
      const firstLine = (text.match(/^[^\n]*/)?.[0] || '').trim();
      if (firstLine) setValue((v) => v + firstLine);
      const strippedHtml = stripFirstBlock(html);
      if (strippedHtml.trim()) onPasteMultiline?.({ html: strippedHtml });
      else {
        const rest = text.split('\n').slice(1).join('\n').trim();
        if (rest) onPasteMultiline?.({ text: rest });
      }
      return;
    }
    if (text && text.includes('\n')) {
      e.preventDefault();
      const [firstLine, ...rest] = text.split('\n');
      setValue((v) => v + firstLine);
      const restText = rest.join('\n').trim();
      if (restText) onPasteMultiline?.({ text: restText });
    }
  };

  const titleLayoutStyle = {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    paddingLeft: '8px',
    paddingRight: '8px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  } as const;
  const titleClassName = cn(
    'block font-bold border-none outline-none bg-transparent placeholder:text-notion-text-muted/30 text-notion-text tracking-tight leading-[1.15] resize-none overflow-hidden',
    readOnly && 'cursor-default',
    isModal ? 'text-3xl' : 'text-[40px]'
  );

  return (
    <div className={cn('grid items-start', endAction ? 'grid-cols-[minmax(0,1fr)_auto] gap-[0.35em]' : 'grid-cols-1')}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        readOnly={readOnly}
        rows={1}
        style={titleLayoutStyle}
        className={titleClassName}
      />
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
