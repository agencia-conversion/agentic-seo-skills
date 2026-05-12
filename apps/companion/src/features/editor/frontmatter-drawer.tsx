'use client';

import { useEffect } from 'react';
import { Lock, Settings, X } from 'lucide-react';
import type { Page } from '../workspace/store';
import { parseFrontmatterText, useWorkspace } from '../workspace/store';
import { cn } from '@/lib/utils';

const CONTENT_FIELDS = ['title', 'slug', 'published_at', 'source_url', 'origem', 'area'];
const BRAIN_FIELDS = ['title', 'updated'];

export function FrontmatterDrawer({
  page,
  open,
  onClose,
}: {
  page: Page;
  open: boolean;
  onClose: () => void;
}) {
  const updatePage = useWorkspace((s) => s.updatePage);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isContent = page.path.startsWith('conteudos/');
  const isBrain = page.path.startsWith('brain/');
  const isLog = page.path === 'brain/log.md';
  const isBrainRestricted = isBrain && !isLog;
  const canEditStructured = !page.readOnly;
  const canEditYaml = canEditStructured && !isBrainRestricted;
  const frontmatter = page.frontmatter || {};
  const knownFields = isContent ? CONTENT_FIELDS : isBrain ? BRAIN_FIELDS : Object.keys(frontmatter);
  const extraFields = Object.keys(frontmatter).filter((key) => !knownFields.includes(key));

  const updateField = (key: string, value: string) => {
    if (!canEditStructured) return;
    if (isBrainRestricted && key !== 'title') return;
    const next = { ...frontmatter, [key]: value };
    updatePage(page.id, key === 'title' ? { frontmatter: next, title: value } : { frontmatter: next });
  };

  const updateYaml = (value: string) => {
    if (!canEditYaml) return;
    const parsed = parseFrontmatterText(value);
    updatePage(page.id, {
      frontmatterText: value,
      frontmatter: parsed,
      ...(parsed.title ? { title: String(parsed.title) } : {}),
    });
  };

  return (
    <aside className="fixed right-0 top-0 z-[260] h-screen w-[360px] border-l border-notion-border bg-background shadow-2xl flex flex-col">
      <header className="h-12 px-4 border-b border-notion-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="w-4 h-4 text-notion-text-muted shrink-0" />
          <strong className="text-sm text-notion-text truncate">Metadados</strong>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-notion-hover text-notion-text-muted hover:text-notion-text cursor-pointer"
          aria-label="Fechar metadados"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isBrainRestricted && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 flex gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Brain autoral: apenas o título é editável; updated é automático ao salvar.</span>
          </div>
        )}

        {isLog && (
          <div className="rounded-md border border-notion-border bg-notion-active/60 px-3 py-2 text-xs text-notion-text-muted flex gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Log é somente leitura.</span>
          </div>
        )}

        <div className="space-y-3">
          {knownFields.map((field) => (
            <FieldControl
              key={field}
              field={field}
              value={String(frontmatter[field] ?? '')}
              readOnly={!canEditStructured || field === 'updated' || (isBrainRestricted && field !== 'title')}
              select={field === 'origem'}
              onChange={(value) => updateField(field, value)}
            />
          ))}
        </div>

        {extraFields.length > 0 && (
          <div className="pt-2 border-t border-notion-border space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">Campos bloqueados</div>
            {extraFields.map((field) => (
              <FieldControl
                key={field}
                field={field}
                value={String(frontmatter[field] ?? '')}
                readOnly
                onChange={() => {}}
              />
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-notion-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-notion-text">YAML source</label>
            {!canEditYaml && <span className="text-[10px] text-notion-text-muted">bloqueado</span>}
          </div>
          <textarea
            value={page.frontmatterText}
            readOnly={!canEditYaml}
            onChange={(e) => updateYaml(e.target.value)}
            className={cn(
              'w-full min-h-[180px] resize-y rounded-md border border-notion-border bg-background px-3 py-2 font-mono text-xs leading-5 text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10',
              !canEditYaml && 'bg-notion-active/40 text-notion-text-muted'
            )}
            spellCheck={false}
          />
        </div>
      </div>
    </aside>
  );
}

function FieldControl({
  field,
  value,
  readOnly,
  select,
  onChange,
}: {
  field: string;
  value: string;
  readOnly: boolean;
  select?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-notion-text-muted">{field}</span>
      {select ? (
        <select
          value={value || 'outros'}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none disabled:bg-notion-active/40 disabled:text-notion-text-muted"
        >
          <option value="blog">blog</option>
          <option value="linkedin">linkedin</option>
          <option value="podcast">podcast</option>
          <option value="outros">outros</option>
        </select>
      ) : (
        <input
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 read-only:bg-notion-active/40 read-only:text-notion-text-muted"
        />
      )}
    </label>
  );
}
