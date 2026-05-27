'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Plus, Settings, X } from 'lucide-react';
import type { Page } from '../workspace/store';
import { parseFrontmatterText, useWorkspace } from '../workspace/store';
import { cn } from '@/lib/utils';
import { Select } from '@/components/select';
import { useI18n } from '@/components/i18n-provider';
import { getCompanionToken } from '@/features/clusters/cluster-row-api';
import { INTENT_CANONICAL_OPTIONS, intentLabel } from '@/lib/cluster-labels';
import { syncBus } from '@/lib/sync-bus';

const ORIGIN_OPTIONS = [
  { value: 'blog', label: 'blog' },
  { value: 'linkedin', label: 'linkedin' },
  { value: 'podcast', label: 'podcast' },
  { value: 'other', label: 'other' },
];

const ROLE_OPTIONS = [
  { value: 'pillar', label: 'pillar' },
  { value: 'satellite', label: 'satellite' },
];

const CONTENT_FIELD_ORDER = [
  'title',
  'slug',
  'origin',
  'published_at',
  'source_url',
  'keyword',
  'intent',
  'volume',
  'contract_version',
] as const;

const CONTENT_FIELD_SET = new Set<string>(CONTENT_FIELD_ORDER);
const DEDICATED_KEYS = new Set(['clusters', 'role']);
const TITLE_KEY = 'title';

interface ClusterOption {
  slug: string;
  name: string;
  icon?: string;
  status?: string;
  pillar_slug?: string;
}

function useClusterOptions(enabled: boolean): { options: ClusterOption[]; refresh: () => Promise<void> } {
  const [options, setOptions] = useState<ClusterOption[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const token = getCompanionToken();
    const url = token
      ? `/api/project/cluster-list?token=${encodeURIComponent(token)}`
      : '/api/project/cluster-list';
    try {
      const r = await fetch(url, { headers: token ? { 'x-companion-token': token } : {} });
      const data = r.ok ? await r.json() : null;
      if (data && Array.isArray(data.clusters)) setOptions(data.clusters);
    } catch {
      // The drawer remains usable with the frontmatter values already loaded.
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, refresh };
}

function sortKeys(keys: string[]): string[] {
  const others = keys.filter((k) => k !== TITLE_KEY && !DEDICATED_KEYS.has(k));
  others.sort((a, b) => a.localeCompare(b));
  const titleFirst = keys.includes(TITLE_KEY) ? [TITLE_KEY] : [];
  return [...titleFirst, ...others];
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
  const { t, locale } = useI18n();
  const updatePage = useWorkspace((s) => s.updatePage);
  const savePage = useWorkspace((s) => s.savePage);
  const loadPage = useWorkspace((s) => s.loadPage);
  const refreshProjectTree = useWorkspace((s) => s.refreshProjectTree);
  const isContent = page.path.startsWith('contents/');
  const { options: clusterOptions, refresh: refreshClusterOptions } = useClusterOptions(open && isContent);
  const [clusterError, setClusterError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Listen for content:changed coming from other views (contents list /
  // cluster table) and reload the current page so the drawer reflects
  // the new frontmatter values.
  const contentSlugForBus = String(
    (page.frontmatter as Record<string, unknown> | undefined)?.slug
      || page.path.split('/').pop()?.replace(/\.md$/, '')
      || '',
  );
  useEffect(() => {
    if (!open || !isContent || !contentSlugForBus) return;
    return syncBus.on((event) => {
      if (event.type === 'content:changed' && event.slug === contentSlugForBus) {
        void loadPage(page.id, { force: true });
      }
    });
  }, [open, isContent, contentSlugForBus, page.id, loadPage]);

  if (!open) return null;

  const isBrain = page.path.startsWith('brain/');
  const isLog = page.path === 'brain/log.md';
  const isBrainRestricted = isBrain && !isLog;
  const canEditStructured = !page.readOnly;
  const canEditYaml = canEditStructured && !isBrainRestricted;
  const frontmatter = page.frontmatter || {};
  const genericKeys = sortKeys(
    Object.keys(frontmatter).filter((k) => !DEDICATED_KEYS.has(k) && !(isContent && CONTENT_FIELD_SET.has(k))),
  );
  const contentSlug = String(frontmatter.slug || page.path.split('/').pop()?.replace(/\.md$/, '') || '');

  const clustersValue: string[] = Array.isArray(frontmatter.clusters)
    ? (frontmatter.clusters as unknown[]).map((c) => String(c))
    : [];
  const roleValue: Record<string, string> =
    frontmatter.role && typeof frontmatter.role === 'object'
      ? Object.fromEntries(
          Object.entries(frontmatter.role as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        )
      : {};

  const updateField = (key: string, value: unknown) => {
    if (!canEditStructured) return;
    if (isBrainRestricted && key !== 'title') return;
    setClusterError(null);
    const next = { ...frontmatter, [key]: value };
    const titleUpdate = key === 'title' && typeof value === 'string' ? { title: value } : {};
    updatePage(page.id, { frontmatter: next, ...titleUpdate });
  };

  const persistCurrentPage = async () => {
    const ok = await savePage(page.id, { silent: true });
    if (!ok) setClusterError('Não foi possível salvar o conteúdo antes de atualizar os clusters.');
    return ok;
  };

  const reloadCurrentPage = async () => {
    await refreshClusterOptions();
    await refreshProjectTree();
    await loadPage(page.id, { force: true });
  };

  const patchClusterMembership = async (clusterSlug: string, role: 'pillar' | 'satellite' | null) => {
    const token = getCompanionToken();
    if (!token) {
      setClusterError('Token do Companion ausente. Reabra o projeto para editar clusters.');
      return false;
    }
    const saved = await persistCurrentPage();
    if (!saved) return false;
    const res = await fetch(
      `/api/project/content/${encodeURIComponent(contentSlug)}/clusters?token=${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
        body: JSON.stringify({ cluster_slug: clusterSlug, role, syncWait: true }),
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setClusterError(json?.reason === 'active-pillar-required'
        ? 'Escolha outro pillar antes de remover ou rebaixar este conteúdo em um cluster ativo.'
        : 'Não foi possível atualizar o vínculo com o cluster.');
      return false;
    }
    syncBus.emit({ type: 'cluster:changed', slug: clusterSlug });
    syncBus.emit({ type: 'content:changed', slug: contentSlug, fields: ['clusters', 'role'] });
    return true;
  };

  const createClusterFromContent = async (name?: string) => {
    if (!canEditStructured || !contentSlug) return false;
    setClusterError(null);
    const token = getCompanionToken();
    if (!token) {
      setClusterError('Token do Companion ausente. Reabra o projeto para criar clusters.');
      return false;
    }
    const saved = await persistCurrentPage();
    if (!saved) return false;
    const latestPage = useWorkspace.getState().pages.find((candidate) => candidate.id === page.id);
    const title = String(name || latestPage?.frontmatter?.title || latestPage?.title || frontmatter.title || page.title || contentSlug).trim();
    if (!title) {
      setClusterError('Informe um nome para criar o cluster.');
      return false;
    }
    const res = await fetch(`/api/project/clusters?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
      body: JSON.stringify({ name: title, pillar_slug: contentSlug, syncWait: true }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setClusterError(json?.reason === 'cluster-exists'
        ? 'Este cluster já existe. Use a busca para selecioná-lo ou escolha outro nome.'
        : 'Não foi possível criar o cluster a partir deste conteúdo.');
      return false;
    }
    syncBus.emit({ type: 'clusters:changed' });
    syncBus.emit({ type: 'content:changed', slug: contentSlug, fields: ['clusters', 'role'] });
    await reloadCurrentPage();
    return true;
  };

  const updateClusters = async (clusters: string[]) => {
    if (!canEditStructured) return;
    setClusterError(null);
    if (clusters.length === 0) {
      setClusterError('Conteúdos publicados precisam permanecer vinculados a pelo menos um cluster.');
      return;
    }
    const removed = clustersValue.filter((slug) => !clusters.includes(slug));
    const blocked = removed.find((slug) => {
      const option = clusterOptions.find((cluster) => cluster.slug === slug);
      return option?.status === 'active' && option.pillar_slug === contentSlug;
    });
    if (blocked) {
      setClusterError('Escolha outro pillar antes de remover este conteúdo de um cluster ativo.');
      return;
    }
    const added = clusters.filter((slug) => !clustersValue.includes(slug));
    for (const slug of added) {
      const ok = await patchClusterMembership(slug, 'satellite');
      if (!ok) return;
    }
    for (const slug of removed) {
      const ok = await patchClusterMembership(slug, null);
      if (!ok) return;
    }
    await reloadCurrentPage();
  };

  const updateRole = async (clusterSlug: string, value: string) => {
    if (!canEditStructured) return;
    setClusterError(null);
    const option = clusterOptions.find((cluster) => cluster.slug === clusterSlug);
    if (roleValue[clusterSlug] === 'pillar' && value !== 'pillar' && option?.status === 'active' && option.pillar_slug === contentSlug) {
      setClusterError('Escolha outro pillar antes de rebaixar este conteúdo em um cluster ativo.');
      return;
    }
    const ok = await patchClusterMembership(clusterSlug, value === 'pillar' ? 'pillar' : 'satellite');
    if (ok) await reloadCurrentPage();
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

        {isContent && (
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">conteúdo</div>
            {CONTENT_FIELD_ORDER.map((field) => (
              <ContentFieldControl
                key={field}
                field={field}
                value={frontmatter[field]}
                readOnly={!canEditStructured || field === 'contract_version'}
                locale={locale}
                onChange={(value) => updateField(field, value)}
              />
            ))}
          </div>
        )}

        {genericKeys.length > 0 && (
          <div className="space-y-3">
            {genericKeys.map((field) => (
              <GenericFieldControl
                key={field}
                field={field}
                value={frontmatter[field]}
                readOnly={!canEditStructured || (isBrainRestricted && field !== 'title')}
                isOrigin={field === 'origin'}
                onChange={(value) => updateField(field, value)}
              />
            ))}
          </div>
        )}

        {isContent && (
          <div className="space-y-3 pt-2 border-t border-notion-border">
            <ClusterMultiSelect
              label="clusters"
              value={clustersValue}
              options={clusterOptions}
              readOnly={!canEditStructured}
              onChange={updateClusters}
              onCreateCluster={createClusterFromContent}
            />
            {clusterError && (
              <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600">
                {clusterError}
              </div>
            )}
            {clustersValue.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-notion-text-muted">role</div>
                {clustersValue.map((slug) => (
                  <label key={slug} data-testid={`role-field-${slug}`} className="flex items-center gap-2">
                    <span className="text-xs text-notion-text-muted min-w-[120px] truncate">{slug}</span>
                    <Select
                      value={roleValue[slug] || 'satellite'}
                      onChange={(v) => void updateRole(slug, v)}
                      disabled={!canEditStructured}
                      options={ROLE_OPTIONS}
                      className="flex-1"
                      triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-2.5 py-1.5"
                    />
                  </label>
                ))}
              </div>
            )}
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
  onCreateCluster,
}: {
  label: string;
  value: string[];
  options: ClusterOption[];
  readOnly: boolean;
  onChange: (next: string[]) => void | Promise<void>;
  onCreateCluster?: (name: string) => boolean | void | Promise<boolean | void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [pickerStyle, setPickerStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryValue = query.trim();
  const queryKey = clusterSearchKey(queryValue);
  const querySlug = slugifyCluster(queryValue);
  const visibleOptions = useMemo(() => {
    if (!queryKey) return options;
    return options.filter((o) =>
      clusterSearchKey(o.name).includes(queryKey) ||
      clusterSearchKey(o.slug).includes(queryKey)
    );
  }, [options, queryKey]);
  const exactOption = queryValue
    ? options.find((o) =>
        clusterSearchKey(o.name) === queryKey ||
        clusterSearchKey(o.slug) === queryKey ||
        slugifyCluster(o.name) === querySlug ||
        slugifyCluster(o.slug) === querySlug
      )
    : null;
  const allLinked = options.length > 0 && options.every((o) => value.includes(o.slug));
  const canCreate = !!onCreateCluster && !!queryValue && !exactOption;

  useEffect(() => {
    if (!pickerOpen) {
      setPickerStyle(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const measuredHeight = pickerRef.current?.getBoundingClientRect().height;
      const estimatedHeight = estimateClusterPickerHeight({
        visibleCount: visibleOptions.length,
        canCreate,
        allLinked: allLinked && !queryValue,
      });
      setPickerStyle(computeClusterPickerStyle(
        rect,
        window.innerWidth,
        window.innerHeight,
        measuredHeight || estimatedHeight,
      ));
    };

    updatePosition();
    let secondFrame: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      secondFrame = window.requestAnimationFrame(updatePosition);
    });
    const timeout = window.setTimeout(updatePosition, 0);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [pickerOpen, visibleOptions.length, canCreate, allLinked, queryValue]);

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || pickerRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pickerOpen]);

  const removeSlug = (slug: string) => {
    if (readOnly) return;
    void onChange(value.filter((s) => s !== slug));
  };

  const addSlug = (slug: string) => {
    if (readOnly) return;
    if (value.includes(slug)) return;
    void onChange([...value, slug]);
    setPickerOpen(false);
    setQuery('');
  };

  const handleAddClick = () => {
    if (readOnly) return;
    setPickerOpen((v) => {
      const next = !v;
      if (next) setQuery('');
      return next;
    });
  };

  const createFromQuery = async () => {
    if (!onCreateCluster || creating || !queryValue) return;
    setCreating(true);
    try {
      const ok = await onCreateCluster(queryValue);
      if (ok !== false) {
        setPickerOpen(false);
        setQuery('');
      }
    } finally {
      setCreating(false);
    }
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
        {!readOnly && (
          <div ref={rootRef}>
            <button
              ref={triggerRef}
              type="button"
              onClick={handleAddClick}
              data-testid="add-cluster-button"
              disabled={creating}
              title="Adicionar ou criar cluster"
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-notion-border px-2 py-0.5 text-xs text-notion-text-muted hover:bg-notion-hover cursor-pointer"
            >
              <Plus className="w-3 h-3" /> {creating ? 'criando…' : 'cluster'}
            </button>
            {pickerOpen && pickerStyle && typeof document !== 'undefined' && createPortal(
              <div
                ref={pickerRef}
                data-testid="cluster-picker"
                style={{
                  top: pickerStyle.top,
                  left: pickerStyle.left,
                  width: pickerStyle.width,
                  maxHeight: pickerStyle.maxHeight,
                }}
                className="fixed z-[340] overflow-hidden rounded-md border border-notion-border bg-background shadow-lg p-2"
              >
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar ou criar cluster…"
                  data-testid="cluster-search-input"
                  className="mb-1.5 w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-xs text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
                  autoFocus
                />
                <div className="overflow-auto" style={{ maxHeight: Math.max(96, pickerStyle.maxHeight - 88) }}>
                  {visibleOptions.length > 0 && visibleOptions.map((opt) => {
                    const linked = value.includes(opt.slug);
                    return (
                      <button
                        key={opt.slug}
                        type="button"
                        disabled={linked}
                        onClick={() => addSlug(opt.slug)}
                        data-testid={`pick-cluster-${opt.slug}`}
                        className={cn(
                          'w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2',
                          linked
                            ? 'cursor-default text-notion-text-muted opacity-70'
                            : 'hover:bg-notion-hover cursor-pointer text-notion-text'
                        )}
                      >
                        {opt.icon ? <span>{opt.icon}</span> : null}
                        <span className="min-w-0 flex-1 truncate">{opt.name}</span>
                        <span className="shrink-0 text-notion-text-muted">{linked ? 'vinculado' : opt.slug}</span>
                      </button>
                    );
                  })}
                  {visibleOptions.length === 0 && (
                    <div className="px-2 py-2 text-xs text-notion-text-muted">Nenhum cluster encontrado.</div>
                  )}
                  {allLinked && !queryValue && (
                    <div data-testid="cluster-all-linked" className="px-2 py-2 text-xs text-notion-text-muted">
                      Todos os clusters disponíveis já estão vinculados.
                    </div>
                  )}
                </div>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => void createFromQuery()}
                    disabled={creating}
                    data-testid="create-cluster-from-search"
                    className="mt-1.5 w-full rounded-md border border-dashed border-notion-border px-2 py-1.5 text-left text-xs text-notion-text hover:bg-notion-hover disabled:opacity-50 cursor-pointer"
                  >
                    Criar cluster "{queryValue}"
                  </button>
                )}
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function clusterSearchKey(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugifyCluster(value: unknown) {
  return clusterSearchKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function estimateClusterPickerHeight({
  visibleCount,
  canCreate,
  allLinked,
}: {
  visibleCount: number;
  canCreate: boolean;
  allLinked: boolean;
}) {
  const shellPadding = 16;
  const inputHeight = 34;
  const inputMargin = 6;
  const optionRows = visibleCount > 0 ? visibleCount * 30 : 32;
  const linkedNotice = allLinked ? 48 : 0;
  const createAction = canCreate ? 42 : 0;
  return shellPadding + inputHeight + inputMargin + optionRows + linkedNotice + createAction;
}

function computeClusterPickerStyle(
  rect: Pick<DOMRect, 'top' | 'bottom' | 'left'>,
  viewportWidth: number,
  viewportHeight: number,
  measuredHeight?: number,
) {
  const viewportPadding = 8;
  const gap = 4;
  const width = Math.min(288, Math.max(180, viewportWidth - viewportPadding * 2));
  const spaceBelow = viewportHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
  const available = Math.max(140, (openUp ? spaceAbove : spaceBelow) - gap);
  const maxHeight = Math.min(360, available);
  const fallbackHeight = Math.min(220, maxHeight);
  const heightForPosition = Math.min(
    Math.max(measuredHeight && measuredHeight > 0 ? measuredHeight : fallbackHeight, 0),
    maxHeight,
  );
  const unclampedTop = openUp ? rect.top - heightForPosition - gap : rect.bottom + gap;
  const top = Math.max(
    viewportPadding,
    Math.min(unclampedTop, viewportHeight - viewportPadding - heightForPosition),
  );
  const left = Math.max(
    viewportPadding,
    Math.min(rect.left, viewportWidth - viewportPadding - width),
  );

  return { top, left, width, maxHeight };
}

function ContentFieldControl({
  field,
  value,
  readOnly,
  locale,
  onChange,
}: {
  field: string;
  value: unknown;
  readOnly: boolean;
  locale: string;
  onChange: (value: unknown) => void;
}) {
  if (field === 'intent') {
    const intentOptions = [
      { value: '', label: '—' },
      ...INTENT_CANONICAL_OPTIONS.map((option) => ({
        value: option.value,
        label: intentLabel(option.value, locale === 'en' ? 'en' : 'pt-BR'),
      })),
    ];
    return (
      <label className="block space-y-1.5" data-testid={`frontmatter-field-${field}`}>
        <span className="text-xs font-medium text-notion-text-muted">{field}</span>
        <Select
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v || null)}
          disabled={readOnly}
          options={intentOptions}
          className="w-full"
          triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-2.5 py-1.5 disabled:bg-notion-active/40 disabled:text-notion-text-muted"
        />
      </label>
    );
  }

  if (field === 'published_at') {
    const dateValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
    return (
      <label className="block space-y-1.5" data-testid={`frontmatter-field-${field}`}>
        <span className="text-xs font-medium text-notion-text-muted">{field}</span>
        <input
          type="date"
          value={dateValue}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 read-only:bg-notion-active/40 read-only:text-notion-text-muted"
        />
      </label>
    );
  }

  if (field === 'volume') {
    const numericValue =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : value == null || value === ''
          ? ''
          : String(value);
    return (
      <label className="block space-y-1.5" data-testid={`frontmatter-field-${field}`}>
        <span className="text-xs font-medium text-notion-text-muted">{field}</span>
        <input
          type="number"
          min={0}
          step={1}
          value={numericValue}
          readOnly={readOnly}
          onChange={(e) => {
            const raw = e.target.value.trim();
            const numeric = Number(raw);
            onChange(raw === '' || !Number.isFinite(numeric) ? null : Math.max(0, Math.round(numeric)));
          }}
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 read-only:bg-notion-active/40 read-only:text-notion-text-muted"
        />
      </label>
    );
  }

  return (
    <GenericFieldControl
      field={field}
      value={value == null ? '' : value}
      readOnly={readOnly}
      isOrigin={field === 'origin'}
      onChange={onChange}
    />
  );
}

function GenericFieldControl({
  field,
  value,
  readOnly,
  isOrigin,
  onChange,
}: {
  field: string;
  value: unknown;
  readOnly: boolean;
  isOrigin?: boolean;
  onChange: (value: unknown) => void;
}) {
  if (isOrigin) {
    return (
      <label className="block space-y-1.5" data-testid={`frontmatter-field-${field}`}>
        <span className="text-xs font-medium text-notion-text-muted">{field}</span>
        <Select
          value={typeof value === 'string' ? value : 'other'}
          onChange={(v) => onChange(v)}
          disabled={readOnly}
          options={ORIGIN_OPTIONS}
          className="w-full"
          triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-2.5 py-1.5 disabled:bg-notion-active/40 disabled:text-notion-text-muted"
        />
      </label>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2 cursor-pointer" data-testid={`frontmatter-field-${field}`}>
        <input
          type="checkbox"
          checked={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-xs font-medium text-notion-text-muted">{field}</span>
      </label>
    );
  }

  if (typeof value === 'number') {
    return (
      <label className="block space-y-1.5" data-testid={`frontmatter-field-${field}`}>
        <span className="text-xs font-medium text-notion-text-muted">{field}</span>
        <input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          readOnly={readOnly}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value);
            onChange(n);
          }}
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 read-only:bg-notion-active/40 read-only:text-notion-text-muted"
        />
      </label>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ArrayFieldControl
        field={field}
        value={value as unknown[]}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  if (value !== null && typeof value === 'object') {
    return (
      <ObjectFieldControl
        field={field}
        value={value as Record<string, unknown>}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  return (
    <label className="block space-y-1.5" data-testid={`frontmatter-field-${field}`}>
      <span className="text-xs font-medium text-notion-text-muted">{field}</span>
      <input
        value={value == null ? '' : String(value)}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 read-only:bg-notion-active/40 read-only:text-notion-text-muted"
      />
    </label>
  );
}

function ArrayFieldControl({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: string;
  value: unknown[];
  readOnly: boolean;
  onChange: (next: unknown) => void;
}) {
  const allStrings = value.every((v) => typeof v === 'string');
  if (allStrings) {
    return (
      <StringArrayFieldControl
        field={field}
        value={value as string[]}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }
  return (
    <ObjectFieldControl
      field={field}
      value={value}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
}

function StringArrayFieldControl({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: string;
  value: string[];
  readOnly: boolean;
  onChange: (next: unknown) => void;
}) {
  const [draft, setDraft] = useState('');
  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));
  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-notion-text-muted">{field}</span>
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 && (
          <span className="text-xs text-notion-text-muted">—</span>
        )}
        {value.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="inline-flex items-center gap-1 rounded-md border border-notion-border bg-notion-active/40 px-2 py-0.5 text-xs text-notion-text"
          >
            <span>{item}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="text-notion-text-muted hover:text-notion-text cursor-pointer"
                aria-label={`remover ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Adicionar…"
            className="flex-1 rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-xs text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
          />
          <button
            type="button"
            onClick={addItem}
            className="rounded-md bg-notion-text px-2 py-1 text-[11px] font-medium text-background hover:opacity-90 cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function ObjectFieldControl({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: string;
  value: unknown;
  readOnly: boolean;
  onChange: (next: unknown) => void;
}) {
  const initial = useMemo(() => safeJsonStringify(value), [value]);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initial);
    setError(null);
  }, [initial]);

  const commit = () => {
    if (readOnly) return;
    const text = draft.trim();
    if (!text) {
      setError(null);
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch (err) {
      setError(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-notion-text-muted">
          {field} <span className="text-[10px] text-notion-text-muted/70">(JSON)</span>
        </span>
        {error && <span className="text-[10px] text-red-600">JSON inválido</span>}
      </div>
      <textarea
        value={draft}
        readOnly={readOnly}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        spellCheck={false}
        rows={Math.min(8, Math.max(2, draft.split('\n').length))}
        className={cn(
          'w-full resize-y rounded-md border border-notion-border bg-background px-2.5 py-1.5 font-mono text-[11px] leading-5 text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10 read-only:bg-notion-active/40 read-only:text-notion-text-muted',
          error && 'border-red-500/50',
        )}
      />
    </div>
  );
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
