'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { useWorkspace } from '@/features/workspace/store';
import { ConfirmModal } from '@/components/confirm-modal';
import { ClusterPickModal } from '@/components/cluster-pick-modal';
import { AutoBlockConfigModal } from '@/components/auto-block-config-modal';
import { showToast } from '@/components/toast';

const SENTINEL = 'data-auto-block-hydrated';

// Module-level dispatchers wired by the React hydrator component so the DOM
// event listeners can request modal interactions without using window.prompt
// or window.confirm.
type ConflictCallback = (reload: boolean) => void;
type SlugCallback = (slug: string | null) => void;
type BodyCallback = (body: string | null) => void;
let dispatchConflict: ((opts: { localValue: string; canonical: string }, cb: ConflictCallback) => void) | null = null;
let dispatchClusterPick: ((title: string, excludeSlugs: string[], cb: SlugCallback) => void) | null = null;
let dispatchYamlEdit: ((title: string, body: string, cb: BodyCallback) => void) | null = null;

interface ExpandResult {
  ok: boolean;
  materialized?: string;
  materialized_at?: string;
  materialized_fingerprint?: string;
  row_keys?: string[] | null;
  error?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ColumnSchema {
  key: string;
  label: string;
  derived: boolean;
  editable: boolean;
}

interface BlockSchema {
  kind: string;
  columns: ColumnSchema[];
  rowMutationPolicy: string;
  supportsRowMutation: boolean;
}

const schemaCache = new Map<string, BlockSchema | null>();

async function loadSchema(kind: string, token: string): Promise<BlockSchema | null> {
  if (schemaCache.has(kind)) return schemaCache.get(kind) || null;
  try {
    const res = await fetch(
      `/api/project/auto-block/schema?kind=${encodeURIComponent(kind)}&token=${encodeURIComponent(token)}`,
    );
    const data = await res.json();
    if (!data.ok) {
      schemaCache.set(kind, null);
      return null;
    }
    const schema: BlockSchema = data;
    schemaCache.set(kind, schema);
    return schema;
  } catch {
    schemaCache.set(kind, null);
    return null;
  }
}

function parseTableRows(markdown: string): { headers: string[]; rows: string[][] } {
  const lines = markdown.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const rows = lines.slice(2).map((line) =>
    line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()),
  );
  return { headers, rows };
}

function extractRowKey(rowCells: string[]): string | null {
  // Convention: first column's first markdown link path basename is the rowKey.
  if (rowCells.length === 0) return null;
  const linkMatch = rowCells[0].match(/\[[^\]]+\]\(([^)]+)\)/);
  if (linkMatch) {
    const target = linkMatch[1];
    const basename = target.split('/').pop()?.replace(/\.md$/, '');
    return basename || null;
  }
  return null;
}

function renderCellInner(cellText: string): string {
  const linkMatch = cellText.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (linkMatch) {
    return `<a href="${escapeHtml(linkMatch[2])}" class="text-notion-text underline-offset-2 hover:underline" data-no-edit>${escapeHtml(linkMatch[1])}</a>`;
  }
  return escapeHtml(cellText);
}

function renderTableFromMarkdown(
  markdown: string,
  schema: BlockSchema | null,
  rowKeys: string[] | null,
): string {
  const { headers, rows } = parseTableRows(markdown);
  if (headers.length === 0) {
    return `<div class="text-xs text-notion-text-muted italic px-3 py-2">${escapeHtml(markdown)}</div>`;
  }
  const cols = schema?.columns || [];
  const supportsRowDrag = !!schema?.supportsRowMutation;
  const handleCol = supportsRowDrag
    ? `<th class="w-6 text-left px-1 py-2 border-b border-notion-border"></th>`
    : '';
  const headerHtml = headers
    .map(
      (h) =>
        `<th class="text-left text-[11px] font-semibold uppercase tracking-wider text-notion-text-muted px-3 py-2 border-b border-notion-border">${escapeHtml(h)}</th>`,
    )
    .join('');
  const rowsHtml = rows
    .map((rowCells, rowIdx) => {
      const rowKey = rowKeys && rowKeys[rowIdx] ? rowKeys[rowIdx] : extractRowKey(rowCells);
      const dragAttrs =
        supportsRowDrag && rowKey
          ? ` draggable="true" data-auto-block-row="true" data-row-key="${escapeHtml(rowKey)}"`
          : '';
      const handleCell = supportsRowDrag
        ? `<td class="px-1 py-2 text-notion-text-muted text-xs border-b border-notion-border/50 cursor-move opacity-30 group-hover:opacity-100 select-none">${supportsRowDrag && rowKey ? '⠿' : ''}</td>`
        : '';
      const cellsHtml = rowCells
        .map((cellText, idx) => {
          const col = cols[idx];
          const editable = col?.editable && !col.derived && rowKey;
          const baseClasses =
            'px-3 py-2 text-sm text-notion-text border-b border-notion-border/50';
          if (editable) {
            return `<td class="${baseClasses} cursor-text hover:bg-notion-accent/5 focus:outline focus:outline-2 focus:outline-notion-accent/50" data-auto-block-cell="true" data-row-key="${escapeHtml(rowKey)}" data-column-key="${escapeHtml(col!.key)}" contenteditable="true">${escapeHtml(cellText)}</td>`;
          }
          return `<td class="${baseClasses}">${renderCellInner(cellText)}</td>`;
        })
        .join('');
      return `<tr class="group hover:bg-notion-hover"${dragAttrs}>${handleCell}${cellsHtml}</tr>`;
    })
    .join('');
  return `<div class="overflow-x-auto"><table class="w-full"><thead><tr>${handleCol}${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

function renderHeader(kind: string, params: Record<string, unknown>): string {
  const typeLabel = kind.replace(/^agentic-/, '');
  const paramsDisplay = Object.entries(params)
    .filter(([k]) => !['version', 'materialized', 'materialized_at', 'materialized_fingerprint'].includes(k))
    .map(([k, v]) => `${escapeHtml(k)}=${escapeHtml(String(v))}`)
    .join(' · ');
  return `
    <div class="flex items-center justify-between gap-2 border-b border-notion-border bg-notion-sidebar/40 px-3 py-2">
      <div class="flex items-center gap-2 text-xs text-notion-text-muted font-mono">
        <span class="inline-flex items-center rounded bg-notion-hover px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">🧩 ${escapeHtml(typeLabel)}</span>
        <span class="text-[11px]">${paramsDisplay}</span>
      </div>
      <div class="flex items-center gap-1">
        <button data-auto-block-action="configure" class="text-[11px] px-2 py-1 rounded hover:bg-notion-hover">Configurar</button>
        <button data-auto-block-action="refresh" class="text-[11px] px-2 py-1 rounded hover:bg-notion-hover" title="Atualizar tabela">⟳</button>
      </div>
    </div>
  `;
}

function renderFooter(kind: string, params: Record<string, unknown>): string {
  if (kind !== 'agentic-clusters-by-area') return '';
  const area = String(params.area || '');
  if (!area) return '';
  return `
    <div class="border-t border-notion-border bg-notion-sidebar/30 px-3 py-2 text-center">
      <button data-auto-block-action="add" data-area="${escapeHtml(area)}" class="text-[11px] px-3 py-1 rounded hover:bg-notion-hover text-notion-accent">+ Mover cluster para esta área</button>
    </div>
  `;
}

function statusCard(kind: 'loading' | 'empty' | 'error', message: string): string {
  const palette = {
    loading: 'text-notion-text-muted',
    empty: 'text-notion-text-muted italic',
    error: 'text-red-500',
  };
  return `<div class="px-3 py-3 text-xs ${palette[kind]}">${escapeHtml(message)}</div>`;
}

function render(
  host: HTMLElement,
  kind: string,
  body: string,
  schema: BlockSchema | null,
  status: 'idle' | 'loading' | 'error' = 'idle',
  rowKeys: string[] | null = null,
) {
  let parsed: Record<string, unknown> = {};
  try {
    const result = parseYaml(body);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      parsed = result as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  const materialized = typeof parsed.materialized === 'string' ? parsed.materialized : '';
  const header = renderHeader(kind, parsed);
  const footer = renderFooter(kind, parsed);
  const tableHtml =
    status === 'loading'
      ? statusCard('loading', 'Carregando…')
      : status === 'error'
        ? statusCard('error', 'Falha ao expandir bloco. Clique em ⟳ para tentar de novo.')
        : materialized
          ? renderTableFromMarkdown(materialized, schema, rowKeys)
          : statusCard('empty', 'Bloco vazio. Clique em ⟳ para gerar a tabela a partir dos dados atuais.');
  host.innerHTML = `${header}${tableHtml}${footer}`;
}

function getToken(): string {
  return window.location.pathname.split('/').filter(Boolean)[1] || '';
}

async function expandBlock(host: HTMLElement, kind: string, body: string, schema: BlockSchema | null): Promise<void> {
  // Preserve current rowKeys (if any) during loading state so the table stays
  // interactive without flicker.
  const existingKeys = readRowKeysFromHost(host);
  render(host, kind, body, schema, 'loading', existingKeys);
  let parsed: Record<string, unknown> = {};
  try {
    const r = parseYaml(body);
    if (r && typeof r === 'object' && !Array.isArray(r)) parsed = r as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const payload = { kind, params: { ...parsed } };
  delete (payload.params as Record<string, unknown>).materialized;
  delete (payload.params as Record<string, unknown>).materialized_at;
  delete (payload.params as Record<string, unknown>).materialized_fingerprint;

  const token = getToken();
  try {
    const res = await fetch(`/api/project/auto-block/expand?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ExpandResult;
    if (!data.ok || !data.materialized) {
      render(host, kind, body, schema, 'error');
      return;
    }
    const nextPayload = { version: 1, ...payload.params, materialized: data.materialized, materialized_at: data.materialized_at, materialized_fingerprint: data.materialized_fingerprint };
    const nextBody = stringifyYaml(nextPayload, { lineWidth: 0 }).replace(/\n$/, '');
    host.setAttribute('data-body', nextBody);
    writeRowKeysToHost(host, data.row_keys || null);
    render(host, kind, nextBody, schema, 'idle', data.row_keys || null);
    window.dispatchEvent(new CustomEvent('auto-block:body-updated', { detail: { host, body: nextBody } }));
  } catch {
    render(host, kind, body, schema, 'error');
  }
}

function readRowKeysFromHost(host: HTMLElement): string[] | null {
  const raw = host.getAttribute('data-row-keys');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : null;
  } catch {
    return null;
  }
}

function writeRowKeysToHost(host: HTMLElement, rowKeys: string[] | null): void {
  if (rowKeys && rowKeys.length > 0) {
    host.setAttribute('data-row-keys', JSON.stringify(rowKeys));
  } else {
    host.removeAttribute('data-row-keys');
  }
}

interface CellMutateResult {
  ok: boolean;
  new_fingerprint?: string;
  materialized?: string;
  materialized_at?: string;
  row_keys?: string[] | null;
  conflict?: { current_fingerprint: string; current_materialized: string };
  error?: string;
}

async function mutateCell(
  host: HTMLElement,
  cellEl: HTMLElement,
  kind: string,
  schema: BlockSchema | null,
): Promise<void> {
  const rowKey = cellEl.getAttribute('data-row-key');
  const columnKey = cellEl.getAttribute('data-column-key');
  if (!rowKey || !columnKey) return;
  const newValue = cellEl.textContent?.trim() || '';
  const body = host.getAttribute('data-body') || '';
  let parsed: Record<string, unknown> = {};
  try {
    const r = parseYaml(body);
    if (r && typeof r === 'object' && !Array.isArray(r)) parsed = r as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  const expected = typeof parsed.materialized_fingerprint === 'string' ? parsed.materialized_fingerprint : '';
  const params: Record<string, unknown> = { ...parsed };
  delete params.materialized;
  delete params.materialized_at;
  delete params.materialized_fingerprint;
  cellEl.classList.add('auto-block-cell-saving');
  try {
    const res = await fetch(
      `/api/project/auto-block/mutate?token=${encodeURIComponent(getToken())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          params,
          expected_fingerprint: expected,
          mutation: { type: 'cell', row: rowKey, column: columnKey, value: newValue },
          actor: 'human',
        }),
      },
    );
    const data = (await res.json()) as CellMutateResult;
    cellEl.classList.remove('auto-block-cell-saving');
    if (res.status === 409 && data.conflict) {
      cellEl.classList.add('auto-block-cell-error');
      const backupKey = `auto-block:retry:${kind}:${rowKey}:${columnKey}`;
      localStorage.setItem(backupKey, newValue);
      const canonical = data.conflict.current_materialized || '';
      const reload = await new Promise<boolean>((resolve) => {
        if (!dispatchConflict) {
          resolve(false);
          return;
        }
        dispatchConflict({ localValue: newValue, canonical }, (choice) => resolve(choice));
      });
      if (reload) {
        await expandBlock(host, kind, host.getAttribute('data-body') || '', schema);
        localStorage.removeItem(backupKey);
      } else {
        cellEl.setAttribute('title', `Conflito; valor preservado em localStorage (${backupKey})`);
      }
      return;
    }
    if (!data.ok || !data.materialized) {
      cellEl.classList.add('auto-block-cell-error');
      cellEl.setAttribute('title', data.error || 'Erro ao salvar');
      localStorage.setItem(`auto-block:retry:${kind}:${rowKey}:${columnKey}`, newValue);
      return;
    }
    const nextPayload = {
      version: 1,
      ...params,
      materialized: data.materialized,
      materialized_at: data.materialized_at,
      materialized_fingerprint: data.new_fingerprint,
    };
    const nextBody = stringifyYaml(nextPayload, { lineWidth: 0 }).replace(/\n$/, '');
    host.setAttribute('data-body', nextBody);
    writeRowKeysToHost(host, data.row_keys || null);
    render(host, kind, nextBody, schema, 'idle', data.row_keys || null);
    window.dispatchEvent(new CustomEvent('auto-block:body-updated', { detail: { host, body: nextBody } }));
  } catch (err) {
    cellEl.classList.remove('auto-block-cell-saving');
    cellEl.classList.add('auto-block-cell-error');
    cellEl.setAttribute('title', String(err));
  }
}

function extractExistingClusterSlugs(host: HTMLElement): string[] {
  const slugs = new Set<string>();
  host.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const match = href.match(/topic-clusters\/([^/]+)\.md/);
    if (match) slugs.add(match[1]);
  });
  return Array.from(slugs);
}

async function moveClusterToArea(host: HTMLElement, area: string): Promise<void> {
  const excludeSlugs = extractExistingClusterSlugs(host);
  const slug = await new Promise<string | null>((resolve) => {
    if (!dispatchClusterPick) {
      resolve(null);
      return;
    }
    dispatchClusterPick(`Mover cluster para "${area}"`, excludeSlugs, (chosen) =>
      resolve(chosen),
    );
  });
  if (!slug || !slug.trim()) return;
  const token = window.location.pathname.split('/').filter(Boolean)[1] || '';
  try {
    const res = await fetch(`/api/project/clusters/${encodeURIComponent(slug.trim())}/area?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area }),
    });
    const data = await res.json();
    if (!data.ok) {
      showToast(`Falha: ${data.error || 'erro desconhecido'}`, 'error');
      return;
    }
    const kind = host.getAttribute('data-kind') || '';
    const body = host.getAttribute('data-body') || '';
    const schema = await loadSchema(kind, getToken());
    await expandBlock(host, kind, body, schema);
  } catch (err) {
    showToast(`Falha ao mover cluster: ${String(err)}`, 'error');
  }
}

interface ConflictModalState {
  open: boolean;
  localValue: string;
  canonical: string;
  callback: ConflictCallback | null;
}

interface ClusterPickState {
  open: boolean;
  title: string;
  excludeSlugs: string[];
  callback: SlugCallback | null;
}

interface YamlEditState {
  open: boolean;
  title: string;
  body: string;
  callback: BodyCallback | null;
}

export function AutoBlockHydrator(): ReactElement {
  const activeId = useWorkspace((s) => s.activePageId);
  const workspaceToken = useWorkspace((s) => s.token);
  const [conflictState, setConflictState] = useState<ConflictModalState>({
    open: false,
    localValue: '',
    canonical: '',
    callback: null,
  });
  const [clusterPickState, setClusterPickState] = useState<ClusterPickState>({
    open: false,
    title: '',
    excludeSlugs: [],
    callback: null,
  });
  const [yamlEditState, setYamlEditState] = useState<YamlEditState>({
    open: false,
    title: '',
    body: '',
    callback: null,
  });
  const conflictResolvedRef = useRef(false);
  const clusterResolvedRef = useRef(false);
  const yamlResolvedRef = useRef(false);

  useEffect(() => {
    dispatchConflict = (opts, cb) => {
      conflictResolvedRef.current = false;
      setConflictState({ open: true, localValue: opts.localValue, canonical: opts.canonical, callback: cb });
    };
    dispatchClusterPick = (title, excludeSlugs, cb) => {
      clusterResolvedRef.current = false;
      setClusterPickState({ open: true, title, excludeSlugs, callback: cb });
    };
    dispatchYamlEdit = (title, body, cb) => {
      yamlResolvedRef.current = false;
      setYamlEditState({ open: true, title, body, callback: cb });
    };
    return () => {
      dispatchConflict = null;
      dispatchClusterPick = null;
      dispatchYamlEdit = null;
    };
  }, []);

  useEffect(() => {
    const hydrateHost = (host: HTMLElement): void => {
      if (host.hasAttribute(SENTINEL)) return;
      host.setAttribute(SENTINEL, 'true');
      const kind = host.getAttribute('data-kind') || '';
      const body = host.getAttribute('data-body') || '';
      let schema: BlockSchema | null = null;
      let parsed: Record<string, unknown> = {};
      try {
        const r = parseYaml(body);
        if (r && typeof r === 'object' && !Array.isArray(r)) parsed = r as Record<string, unknown>;
      } catch {
        /* ignore */
      }

      void (async () => {
        schema = await loadSchema(kind, getToken());
        // Always render local materialized first for fast paint, then refresh
        // from canonical to catch out-of-band edits.
        if (parsed.materialized) render(host, kind, body, schema, 'idle');
        await expandBlock(host, kind, body, schema);
      })();

      host.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const action = target.closest<HTMLElement>('[data-auto-block-action]')?.getAttribute('data-auto-block-action');
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        const currentKind = host.getAttribute('data-kind') || '';
        const currentBody = host.getAttribute('data-body') || '';
        if (action === 'configure') {
          if (!dispatchYamlEdit) return;
          dispatchYamlEdit(`Configurar ${currentKind}`, currentBody, (nextBody) => {
            if (nextBody == null) return;
            host.setAttribute('data-body', nextBody);
            void expandBlock(host, currentKind, nextBody, schema);
          });
        } else if (action === 'refresh') {
          void expandBlock(host, currentKind, currentBody, schema);
        } else if (action === 'add') {
          const area = target.closest<HTMLElement>('[data-area]')?.getAttribute('data-area') || '';
          if (area) void moveClusterToArea(host, area);
        }
      });

      host.addEventListener(
        'blur',
        (event) => {
          const target = event.target as HTMLElement | null;
          if (!target || target.getAttribute('data-auto-block-cell') !== 'true') return;
          void mutateCell(host, target, kind, schema);
        },
        true,
      );

      host.addEventListener('keydown', (event) => {
        const target = event.target as HTMLElement | null;
        if (!target || target.getAttribute('data-auto-block-cell') !== 'true') return;
        if (event.key === 'Enter') {
          event.preventDefault();
          target.blur();
        }
      });

      // Drag/drop row between auto-blocks (same kind on same page).
      host.addEventListener('dragstart', (event) => {
        const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
          '[data-auto-block-row="true"]',
        );
        if (!target) return;
        const rowKey = target.getAttribute('data-row-key') || '';
        if (!event.dataTransfer) return;
        const body = host.getAttribute('data-body') || '';
        let parsed: Record<string, unknown> = {};
        try {
          const r = parseYaml(body);
          if (r && typeof r === 'object' && !Array.isArray(r)) parsed = r as Record<string, unknown>;
        } catch {
          /* ignore */
        }
        const params: Record<string, unknown> = { ...parsed };
        delete params.materialized;
        delete params.materialized_at;
        delete params.materialized_fingerprint;
        event.dataTransfer.setData(
          'application/x-auto-block-row',
          JSON.stringify({
            kind,
            params,
            rowKey,
            fingerprint: parsed.materialized_fingerprint || '',
          }),
        );
        event.dataTransfer.effectAllowed = 'move';
      });
      host.addEventListener('dragover', (event) => {
        if (event.dataTransfer?.types.includes('application/x-auto-block-row')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          host.classList.add('auto-block-drop-target');
        }
      });
      host.addEventListener('dragleave', () => {
        host.classList.remove('auto-block-drop-target');
      });
      host.addEventListener('drop', async (event) => {
        host.classList.remove('auto-block-drop-target');
        const raw = event.dataTransfer?.getData('application/x-auto-block-row');
        if (!raw) return;
        event.preventDefault();
        let payload: { kind: string; params: Record<string, unknown>; rowKey: string; fingerprint: string };
        try {
          payload = JSON.parse(raw);
        } catch {
          return;
        }
        if (payload.kind !== kind) {
          showToast('Drag entre tipos diferentes ainda não suportado.', 'error');
          return;
        }
        const currentBody = host.getAttribute('data-body') || '';
        let currentParsed: Record<string, unknown> = {};
        try {
          const r = parseYaml(currentBody);
          if (r && typeof r === 'object' && !Array.isArray(r)) currentParsed = r as Record<string, unknown>;
        } catch {
          /* ignore */
        }
        const targetParams: Record<string, unknown> = { ...currentParsed };
        delete targetParams.materialized;
        delete targetParams.materialized_at;
        delete targetParams.materialized_fingerprint;
        if (JSON.stringify(targetParams) === JSON.stringify(payload.params)) {
          showToast(
            'Ordem é determinada pelo tipo (name-asc, etc.). Mude o param "order" em Configurar.',
            'info',
          );
          return;
        }
        try {
          const res = await fetch(
            `/api/project/auto-block/mutate?token=${encodeURIComponent(getToken())}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                kind: payload.kind,
                params: payload.params,
                expected_fingerprint: payload.fingerprint,
                mutation: {
                  type: 'row',
                  row: payload.rowKey,
                  action: 'move-to-block',
                  targetParams,
                },
                actor: 'human',
              }),
            },
          );
          const data = await res.json();
          if (!data.ok) {
            showToast(`Falha ao mover: ${data.error || 'erro desconhecido'}`, 'error');
            return;
          }
          // Refresh both blocks (source + target) by triggering expand on both.
          const sourceHost = Array.from(
            document.querySelectorAll<HTMLElement>('[data-auto-block]'),
          ).find((h) => {
            try {
              const pb = parseYaml(h.getAttribute('data-body') || '');
              if (!pb || typeof pb !== 'object' || Array.isArray(pb)) return false;
              const candidate: Record<string, unknown> = { ...(pb as Record<string, unknown>) };
              delete candidate.materialized;
              delete candidate.materialized_at;
              delete candidate.materialized_fingerprint;
              return JSON.stringify(candidate) === JSON.stringify(payload.params);
            } catch {
              return false;
            }
          });
          if (sourceHost) {
            const sh = await loadSchema(payload.kind, getToken());
            await expandBlock(sourceHost, payload.kind, sourceHost.getAttribute('data-body') || '', sh);
          }
          await expandBlock(host, kind, host.getAttribute('data-body') || '', schema);
        } catch (err) {
          showToast(`Falha no drag: ${String(err)}`, 'error');
        }
      });
    };

    document
      .querySelectorAll<HTMLElement>(`[data-auto-block]:not([${SENTINEL}])`)
      .forEach(hydrateHost);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.('[data-auto-block]')) hydrateHost(node);
          node
            .querySelectorAll?.<HTMLElement>(`[data-auto-block]:not([${SENTINEL}])`)
            .forEach(hydrateHost);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [activeId]);

  return (
    <>
      <ConfirmModal
        isOpen={conflictState.open}
        title="Conflito de edição"
        description={`Outra edição mudou esta fonte enquanto você editava.\n\nSeu valor: "${conflictState.localValue}"\nValor canônico: "${conflictState.canonical}"\n\nRecarregar = descarta seu valor; Manter = preserva localmente para nova tentativa.`}
        confirmLabel="Recarregar canônico"
        cancelLabel="Manter meu valor"
        destructive
        onConfirm={() => {
          if (!conflictResolvedRef.current) {
            conflictResolvedRef.current = true;
            conflictState.callback?.(true);
          }
          setConflictState((s) => ({ ...s, open: false, callback: null }));
        }}
        onClose={() => {
          if (!conflictResolvedRef.current) {
            conflictResolvedRef.current = true;
            conflictState.callback?.(false);
          }
          setConflictState((s) => ({ ...s, open: false, callback: null }));
        }}
      />
      <ClusterPickModal
        isOpen={clusterPickState.open}
        title={clusterPickState.title}
        token={workspaceToken || ''}
        excludeSlugs={clusterPickState.excludeSlugs}
        onPick={(slug) => {
          if (!clusterResolvedRef.current) {
            clusterResolvedRef.current = true;
            clusterPickState.callback?.(slug);
          }
        }}
        onClose={() => {
          if (!clusterResolvedRef.current) {
            clusterResolvedRef.current = true;
            clusterPickState.callback?.(null);
          }
          setClusterPickState((s) => ({ ...s, open: false, callback: null }));
        }}
      />
      <AutoBlockConfigModal
        isOpen={yamlEditState.open}
        title={yamlEditState.title}
        initialBody={yamlEditState.body}
        onSave={(body) => {
          if (!yamlResolvedRef.current) {
            yamlResolvedRef.current = true;
            yamlEditState.callback?.(body);
          }
        }}
        onClose={() => {
          if (!yamlResolvedRef.current) {
            yamlResolvedRef.current = true;
            yamlEditState.callback?.(null);
          }
          setYamlEditState((s) => ({ ...s, open: false, callback: null }));
        }}
      />
    </>
  );
}
