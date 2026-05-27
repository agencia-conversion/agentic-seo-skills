'use client';

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/features/workspace/store';
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
}: {
  row: ClusterRow;
  onOpenContent?: (slug: string) => void;
}) {
  const router = useRouter();
  const token = useWorkspace((s) => s.token);
  if (row.content.kind === 'planned') {
    return <span className="italic text-notion-text-muted">{row.content.slug}</span>;
  }
  const origin = row.content.origin;
  const targetPath =
    token && `/project/${encodeURIComponent(token)}/contents-${encodeURIComponent(origin)}-${encodeURIComponent(row.slug)}`;
  const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (!targetPath) return;
    e.preventDefault();
    router.push(targetPath);
  };
  return (
    <a
      href={targetPath || '#'}
      onClick={handleClick}
      className="text-left text-sm text-notion-text underline-offset-2 hover:underline truncate cursor-pointer w-full"
      title={row.content.title}
    >
      {row.content.title}
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
