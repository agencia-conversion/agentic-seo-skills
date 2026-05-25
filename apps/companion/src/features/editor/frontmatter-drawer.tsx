'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Settings, X } from 'lucide-react';
import type { Page } from '../workspace/store';
import { parseFrontmatterText, useWorkspace } from '../workspace/store';
import { cn } from '@/lib/utils';
import { Select } from '@/components/select';
import { useI18n } from '@/components/i18n-provider';

const ORIGEM_OPTIONS = [
  { value: 'blog', label: 'blog' },
  { value: 'linkedin', label: 'linkedin' },
  { value: 'podcast', label: 'podcast' },
  { value: 'outros', label: 'outros' },
];

const PAPEL_OPTIONS = [
  { value: 'pilar', label: 'pilar' },
  { value: 'satelite', label: 'satelite' },
];

const CONTENT_FIELDS = ['title', 'slug', 'published_at', 'source_url', 'origem'];
const BRAIN_FIELDS = ['title', 'updated'];

interface ClusterOption {
  slug: string;
  nome: string;
  icon?: string;
  status?: string;
}

function useClusterOptions(enabled: boolean): ClusterOption[] {
  const [options, setOptions] = useState<ClusterOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const token =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token')
        : null;
    const url = token
      ? `/api/project/cluster-list?token=${encodeURIComponent(token)}`
      : '/api/project/cluster-list';
    fetch(url, { headers: token ? { 'x-companion-token': token } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.clusters)) setOptions(data.clusters);
      })
      .catch(() => {});
  }, [enabled]);
  return options;
}

export function FrontmatterDrawer({
  page,
  open,
  onClose,
}: {
  page: Page;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const updatePage = useWorkspace((s) => s.updatePage);
  const isContent = page.path.startsWith('conteudos/');
  const clusterOptions = useClusterOptions(open && isContent);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isBrain = page.path.startsWith('brain/');
  const isLog = page.path === 'brain/log.md';
  const isBrainRestricted = isBrain && !isLog;
  const canEditStructured = !page.readOnly;
  const canEditYaml = canEditStructured && !isBrainRestricted;
  const frontmatter = page.frontmatter || {};
  const knownFields = isContent ? CONTENT_FIELDS : isBrain ? BRAIN_FIELDS : Object.keys(frontmatter);
  const reservedKeys = new Set([
    ...knownFields,
    'clusters',
    'papel',
    'contract_version',
    'area', // legacy, surfaced read-only
  ]);
  const extraFields = Object.keys(frontmatter).filter((key) => !reservedKeys.has(key));

  const clustersValue: string[] = Array.isArray(frontmatter.clusters)
    ? (frontmatter.clusters as unknown[]).map((c) => String(c))
    : [];
  const papelValue: Record<string, string> =
    frontmatter.papel && typeof frontmatter.papel === 'object'
      ? Object.fromEntries(
          Object.entries(frontmatter.papel as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        )
      : {};

  const updateField = (key: string, value: string) => {
    if (!canEditStructured) return;
    if (isBrainRestricted && key !== 'title') return;
    const next = { ...frontmatter, [key]: value };
    updatePage(page.id, key === 'title' ? { frontmatter: next, title: value } : { frontmatter: next });
  };

  const updateClusters = (clusters: string[]) => {
    if (!canEditStructured) return;
    const filteredPapel = Object.fromEntries(
      Object.entries(papelValue).filter(([k]) => clusters.includes(k)),
    );
    const next = { ...frontmatter, clusters };
    if (Object.keys(filteredPapel).length > 0) {
      (next as Record<string, unknown>).papel = filteredPapel;
    } else {
      delete (next as Record<string, unknown>).papel;
    }
    updatePage(page.id, { frontmatter: next });
  };

  const updatePapel = (clusterSlug: string, value: string) => {
    if (!canEditStructured) return;
    const nextPapel = { ...papelValue, [clusterSlug]: value };
    const next = { ...frontmatter, papel: nextPapel };
    updatePage(page.id, { frontmatter: next });
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
          <strong className="text-sm text-notion-text truncate">{t('frontmatterDrawer.title')}</strong>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-notion-hover text-notion-text-muted hover:text-notion-text cursor-pointer"
          aria-label={t('frontmatterDrawer.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isBrainRestricted && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 flex gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{t('frontmatterDrawer.brainNotice')}</span>
          </div>
        )}

        {isLog && (
          <div className="rounded-md border border-notion-border bg-notion-active/60 px-3 py-2 text-xs text-notion-text-muted flex gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{t('frontmatterDrawer.logReadOnly')}</span>
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

        {isContent && (
          <div className="space-y-3 pt-2 border-t border-notion-border">
            <ClusterMultiSelect
              label="clusters"
              value={clustersValue}
              options={clusterOptions}
              readOnly={!canEditStructured}
              onChange={updateClusters}
            />
            {clustersValue.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">papel</div>
                {clustersValue.map((slug) => (
                  <label key={slug} className="flex items-center gap-2">
                    <span className="text-xs text-notion-text-muted min-w-[120px] truncate">{slug}</span>
                    <Select
                      value={papelValue[slug] || 'satelite'}
                      onChange={(v) => updatePapel(slug, v)}
                      disabled={!canEditStructured}
                      options={PAPEL_OPTIONS}
                      className="flex-1"
                      triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-2.5 py-1.5"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {extraFields.length > 0 && (
          <div className="pt-2 border-t border-notion-border space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">{t('frontmatterDrawer.blockedFields')}</div>
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
            <label className="text-xs font-medium text-notion-text">{t('frontmatterDrawer.yamlSource')}</label>
            {!canEditYaml && <span className="text-[10px] text-notion-text-muted">{t('frontmatterDrawer.blocked')}</span>}
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

function ClusterMultiSelect({
  label,
  value,
  options,
  readOnly,
  onChange,
}: {
  label: string;
  value: string[];
  options: ClusterOption[];
  readOnly: boolean;
  onChange: (next: string[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const remaining = useMemo(
    () => options.filter((o) => !value.includes(o.slug)),
    [options, value],
  );

  const removeSlug = (slug: string) => {
    if (readOnly) return;
    onChange(value.filter((s) => s !== slug));
  };

  const addSlug = (slug: string) => {
    if (readOnly) return;
    if (value.includes(slug)) return;
    onChange([...value, slug]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-notion-text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]" data-testid="cluster-chips">
        {value.length === 0 && (
          <span className="text-xs text-notion-text-muted">—</span>
        )}
        {value.map((slug) => {
          const opt = options.find((o) => o.slug === slug);
          return (
            <span
              key={slug}
              data-testid={`cluster-chip-${slug}`}
              className="inline-flex items-center gap-1 rounded-md border border-notion-border bg-notion-active/40 px-2 py-0.5 text-xs text-notion-text"
            >
              {opt?.icon ? <span>{opt.icon}</span> : null}
              <span>{slug}</span>
              {!readOnly && (
                <button
                  onClick={() => removeSlug(slug)}
                  className="text-notion-text-muted hover:text-notion-text cursor-pointer"
                  aria-label={`remover ${slug}`}
                  data-testid={`remove-cluster-${slug}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
        {!readOnly && remaining.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              data-testid="add-cluster-button"
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-notion-border px-2 py-0.5 text-xs text-notion-text-muted hover:bg-notion-hover cursor-pointer"
            >
              <Plus className="w-3 h-3" /> cluster
            </button>
            {pickerOpen && (
              <div
                data-testid="cluster-picker"
                className="absolute left-0 mt-1 z-10 w-56 rounded-md border border-notion-border bg-background shadow-lg p-1 max-h-56 overflow-auto"
              >
                {remaining.map((opt) => (
                  <button
                    key={opt.slug}
                    onClick={() => addSlug(opt.slug)}
                    data-testid={`pick-cluster-${opt.slug}`}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-notion-hover cursor-pointer flex items-center gap-2"
                  >
                    {opt.icon ? <span>{opt.icon}</span> : null}
                    <span>{opt.nome}</span>
                    <span className="text-notion-text-muted">{opt.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
        <Select
          value={value || 'outros'}
          onChange={onChange}
          disabled={readOnly}
          options={ORIGEM_OPTIONS}
          className="w-full"
          triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-2.5 py-1.5 disabled:bg-notion-active/40 disabled:text-notion-text-muted"
        />
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
