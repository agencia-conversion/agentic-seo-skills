'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/toast';
import { useWorkspace } from '@/features/workspace/store';
import { patchContentMetadata } from '@/features/clusters/cluster-row-api';
import { formatRowError } from '@/lib/row-error-messages';
import { cn } from '@/lib/utils';

export interface ClusterRow {
  slug: string;
  role: 'pillar' | 'satellite';
  role_label: string;
  content:
    | { kind: 'published'; title: string; href: string; origin: string }
    | { kind: 'planned'; slug: string };
  keyword: string;
  keyword_volume?: number | null;
  intent: string;
  status: 'published' | 'planned';
  editorial_status: 'draft' | 'in-review' | 'approved' | 'published';
  action: string;
  updated: string;
  also_in: string[];
}

export function ContentLink({
  row,
  onOpenContent: _onOpenContent,
  onTitleChange,
}: {
  row: ClusterRow;
  onOpenContent?: (slug: string) => void;
  onTitleChange?: (slug: string, nextTitle: string) => void;
}) {
  const router = useRouter();
  const token = useWorkspace((s) => s.token);
  const locale: 'pt-BR' | 'en' = useWorkspace((s) =>
    s.settings.language === 'en' ? 'en' : 'pt-BR',
  );
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closedRef = useRef(false);

  useEffect(
    () => () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    closedRef.current = false;
  }, [editing]);

  if (row.content.kind === 'planned') {
    return <span className="italic text-notion-text-muted">{row.content.slug}</span>;
  }
  const origin = row.content.origin;
  const targetPath =
    token && `/project/${encodeURIComponent(token)}/contents-${encodeURIComponent(origin)}-${encodeURIComponent(row.slug)}`;
  const currentTitle = row.content.title;

  const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (!targetPath) return;
    e.preventDefault();
    // Debounce navigation by 250ms so onDoubleClick can cancel it.
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      router.push(targetPath);
    }, 250);
  };

  const handleDoubleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setEditing(true);
  };

  const commit = async (rawValue: string) => {
    if (closedRef.current) return;
    closedRef.current = true;
    const trimmed = rawValue.trim();
    if (!trimmed || trimmed === currentTitle) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await patchContentMetadata(row.slug, 'title', trimmed);
      if (!res.ok) {
        showToast(formatRowError('title', res.reason, locale), 'error');
        return;
      }
      onTitleChange?.(row.slug, trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    closedRef.current = true;
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={currentTitle}
        disabled={saving}
        data-testid="content-title-input"
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => void commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit((e.target as HTMLInputElement).value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn(
          'w-full rounded border border-notion-border bg-background px-1 py-0.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10',
          saving && 'opacity-60',
        )}
      />
    );
  }

  return (
    <a
      href={targetPath || '#'}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="text-left text-sm text-notion-text underline-offset-2 hover:underline truncate cursor-pointer w-full"
      title={currentTitle}
    >
      {currentTitle}
    </a>
  );
}

export function AlsoInChips({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  const token = useWorkspace((s) => s.token);
  if (slugs.length === 0) return <span className="text-xs text-notion-text-muted">—</span>;
  const visible = slugs.slice(0, 2);
  const overflow = slugs.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((slug) => (
        <button
          key={slug}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (token) router.push(`/project/${token}/brain-topic-clusters-${slug}`);
          }}
          className="inline-flex max-w-[120px] items-center gap-0.5 truncate rounded border border-notion-border bg-notion-active/40 px-1.5 py-0.5 text-[10px] leading-4 text-notion-text-muted hover:bg-notion-hover cursor-pointer"
          title={`Ver cluster ${slug}`}
        >
          {slug}
        </button>
      ))}
      {overflow > 0 && (
        <span
          className="text-[10px] leading-4 text-notion-text-muted"
          title={slugs.slice(visible.length).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function EditableCell({
  initial,
  placeholder,
  onCommit,
  className,
}: {
  initial: string;
  placeholder?: string;
  onCommit: (next: string) => Promise<void>;
  className?: string;
}) {
  const display = initial && initial !== '—' ? initial : '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(display);
  }, [display]);

  const commit = useCallback(async () => {
    if (draft === display) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onCommit(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [draft, display, onCommit]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'w-full rounded text-left text-xs text-notion-text-muted hover:bg-notion-hover px-1 py-0.5 cursor-text',
          !display && 'italic text-notion-text-muted/60',
          className,
        )}
      >
        {display || placeholder || '—'}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(display);
          setEditing(false);
        }
      }}
      className={cn(
        'w-full rounded border border-notion-border bg-background px-1 py-0.5 text-xs text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10',
        saving && 'opacity-60',
        className,
      )}
    />
  );
}

export function RoleToggle({
  current,
  onCommit,
}: {
  current: 'pillar' | 'satellite';
  onCommit: (next: 'pillar' | 'satellite') => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const toggle = useCallback(async () => {
    setSaving(true);
    try {
      await onCommit(current === 'pillar' ? 'satellite' : 'pillar');
    } finally {
      setSaving(false);
    }
  }, [current, onCommit]);
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      className={cn(
        'rounded px-1.5 py-0.5 text-xs hover:bg-notion-hover cursor-pointer disabled:opacity-60',
        current === 'pillar' ? 'text-emerald-700 font-medium' : 'text-notion-text-muted',
      )}
      title="Alternar role pillar/satellite"
    >
      {current === 'pillar' ? 'Pilar' : 'Satélite'}
    </button>
  );
}
