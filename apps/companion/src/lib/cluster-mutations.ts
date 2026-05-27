import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';
import { loadBrainSubpageTemplate } from './brain-templates';
import { updateContentMetadata } from './content-mutations';
import { silenceWrite } from './auto-block-watcher';

const PLUGIN_ROOT =
  process.env.AGENTIC_SEO_PLUGIN_ROOT ||
  process.env.SEO_BRAIN_PLUGIN_ROOT ||
  join(/*turbopackIgnore: true*/ process.cwd(), '..', '..');

interface AddPlannedInput {
  slug: string;
  keyword: string;
  intent?: string;
  role?: 'satellite' | 'pillar';
  action?: string;
  note?: string;
  display_title?: string;
  volume?: number;
}

function shortenTitle(title: string): string {
  if (!title) return title;
  if (title.length <= 40) return title;
  const cut = title.search(/[:—–-]\s/);
  if (cut > 0 && cut < 50) return title.slice(0, cut).trim();
  return title;
}

function renderKeyword(keyword: string | null | undefined, volume: number | null | undefined): string {
  if (!keyword) return '—';
  if (typeof volume === 'number' && volume > 0) return `${keyword} (${volume})`;
  return keyword;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function clusterYamlPath(projectRoot: string, clusterSlug: string) {
  return join(resolve(projectRoot), 'clusters', clusterSlug, 'cluster.yaml');
}

function brainSubpagePath(projectRoot: string, clusterSlug: string) {
  return join(resolve(projectRoot), 'brain', 'topic-clusters', `${clusterSlug}.md`);
}

function readContentTitle(projectRoot: string, contentSlug: string) {
  const file = join(resolve(projectRoot), 'contents', 'blog', `${contentSlug}.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^title:\s*"?([^"\n]+)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
}

function readContentPublishedAt(projectRoot: string, contentSlug: string) {
  const file = join(resolve(projectRoot), 'contents', 'blog', `${contentSlug}.md`);
  if (!existsSync(file)) return '';
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^published_at:\s*"?([^"\n]*)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

function buildContentsTableLines(clusterYaml: any, projectRoot: string): string[] {
  const tableLines = [
    '| Papel | Conteúdo | Keyword | Intent | Status | Ação | Atualizado |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  const rows: Array<{ role: string; content: string; keyword: string; intent: string; status: string; action: string; updated: string }> = [];
  if (clusterYaml.pillar?.slug) {
    const title = readContentTitle(projectRoot, clusterYaml.pillar.slug);
    const updated = readContentPublishedAt(projectRoot, clusterYaml.pillar.slug);
    const visible = clusterYaml.pillar.display_title || (title ? shortenTitle(title) : null);
    rows.push({
      role: 'Pilar',
      content: visible
        ? `[${visible}](../../contents/blog/${clusterYaml.pillar.slug}.md)`
        : `_${clusterYaml.pillar.slug}_`,
      keyword: renderKeyword(clusterYaml.pillar.keyword, clusterYaml.pillar.volume),
      intent: clusterYaml.pillar.intent || '—',
      status: title ? 'publicado' : 'planejado',
      action: title ? 'manter' : 'criar',
      updated: updated || '—',
    });
  }
  for (const planned of clusterYaml.planned_satellites || []) {
    rows.push({
      role: planned.role === 'pillar' ? 'Pilar' : 'Satélite',
      content: `_${planned.slug}_`,
      keyword: renderKeyword(planned.keyword, planned.volume),
      intent: planned.intent || '—',
      status: 'planejado',
      action: planned.action || 'criar',
      updated: '—',
    });
  }
  for (const row of rows) {
    tableLines.push(
      `| ${row.role} | ${row.content} | ${row.keyword} | ${row.intent} | ${row.status} | ${row.action} | ${row.updated} |`,
    );
  }
  if (rows.length === 0) tableLines.push('| — | — | — | — | — | — | — |');
  return tableLines;
}

function pillarLine(projectRoot: string, clusterYaml: any): string {
  if (clusterYaml.pillar?.slug) {
    const title = readContentTitle(projectRoot, clusterYaml.pillar.slug);
    const visible = clusterYaml.pillar.display_title || (title ? shortenTitle(title) : null);
    if (visible) return `[${visible}](../../contents/blog/${clusterYaml.pillar.slug}.md)`;
    return `_${clusterYaml.pillar.slug}_ — pillar planejado, conteúdo a criar.`;
  }
  return '_pilar a definir_';
}

function nextActionsBlock(clusterYaml: any): string {
  const planned = clusterYaml.planned_satellites || [];
  if (planned.length === 0) return '- Cluster com cobertura completa do escopo declarado neste momento.';
  return planned
    .map((entry: any) => {
      const verb = entry.action === 'revisar' ? 'Revisar' : 'Criar';
      return `- ${verb} \`${entry.slug}\`${entry.note ? ` — ${entry.note}` : ''}.`;
    })
    .join('\n');
}

function buildClusterSubpageMarkdown(projectRoot: string, clusterYaml: any): string {
  const icon = clusterYaml.icon || '';
  const heading = icon ? `${icon} ${clusterYaml.name}` : clusterYaml.name;
  const contentsTable = buildContentsTableLines(clusterYaml, projectRoot).join('\n');
  const rendered = loadBrainSubpageTemplate(PLUGIN_ROOT, 'topic-clusters', {
    title: clusterYaml.name,
    updated: new Date().toISOString().slice(0, 10),
    parent_slug: 'topic-clusters',
    parent_label: 'Topic Clusters',
    heading,
    resumo: clusterYaml.context || '',
    area: clusterYaml.area || '',
    pillar_line: pillarLine(projectRoot, clusterYaml),
    contents_table: contentsTable,
    next_actions: nextActionsBlock(clusterYaml),
    provenance: clusterYaml.provenance?.source || 'reset-clusters',
  });
  if (!rendered) {
    throw new Error('Missing topic-clusters subpage template at templates/project/brain/topic-clusters/_subpage-template.md');
  }
  return rendered;
}

function regenerateSubpage(projectRoot: string, clusterYaml: any) {
  const file = brainSubpagePath(projectRoot, clusterYaml.slug);
  const tableLines = buildContentsTableLines(clusterYaml, projectRoot);
  const contentsBlock = ['## Conteúdos', '', ...tableLines, ''].join('\n');
  silenceWrite(file);
  if (!existsSync(file)) {
    writeFileSync(file, buildClusterSubpageMarkdown(projectRoot, clusterYaml), 'utf8');
    return;
  }
  const current = readFileSync(file, 'utf8');
  const sectionRegex = /^## Conteúdos[\s\S]*?(?=^## |\Z)/m;
  if (sectionRegex.test(current)) {
    writeFileSync(file, current.replace(sectionRegex, `${contentsBlock}\n`), 'utf8');
    return;
  }
  const pillarRegex = /^(## Pilar[\s\S]*?)(?=^## )/m;
  if (pillarRegex.test(current)) {
    writeFileSync(file, current.replace(pillarRegex, (block) => `${block}${contentsBlock}\n\n`), 'utf8');
    return;
  }
  writeFileSync(file, current.replace(/\s*$/, '\n\n') + contentsBlock + '\n', 'utf8');
}

export function addPlannedSatellite(projectRoot: string, clusterSlug: string, input: AddPlannedInput) {
  const yamlPath = clusterYamlPath(projectRoot, clusterSlug);
  if (!existsSync(yamlPath)) return { ok: false as const, reason: 'cluster-not-found' };
  const slug = slugify(input.slug);
  const keyword = (input.keyword || '').trim();
  if (!slug) return { ok: false as const, reason: 'invalid-slug' };
  if (!keyword) return { ok: false as const, reason: 'invalid-keyword' };
  const data = parseYaml(readFileSync(yamlPath, 'utf8')) || {};
  data.planned_satellites = Array.isArray(data.planned_satellites) ? data.planned_satellites : [];
  if (data.planned_satellites.some((s: any) => s?.slug === slug)) {
    return { ok: false as const, reason: 'slug-already-exists' };
  }
  data.planned_satellites.push({
    slug,
    keyword,
    intent: input.intent || 'informational',
    volume: typeof input.volume === 'number' && input.volume > 0 ? input.volume : null,
    volume_source: null,
    role: input.role === 'pillar' ? 'pillar' : 'satellite',
    note: input.note || null,
    ...(input.display_title ? { display_title: input.display_title } : {}),
  });
  data.contract_version = 1;
  silenceWrite(yamlPath);
  writeFileSync(yamlPath, yamlStringify(data, { lineWidth: 0 }), 'utf8');
  return { ok: true as const, slug };
}

export function listClusterSlugs(projectRoot: string): string[] {
  const dir = join(resolve(projectRoot), 'clusters');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => {
    if (name.startsWith('.') || name.startsWith('_')) return false;
    return existsSync(join(dir, name, 'cluster.yaml'));
  });
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const CONTENT_ORIGINS = ['blog', 'linkedin', 'podcast', 'other'];

function findContentFile(projectRoot: string, slug: string): { path: string; origin: string } | null {
  for (const origin of CONTENT_ORIGINS) {
    const file = join(resolve(projectRoot), 'contents', origin, `${slug}.md`);
    if (existsSync(file)) return { path: file, origin };
  }
  return null;
}

export interface EditRowInput {
  field:
    | 'display_title'
    | 'keyword'
    | 'intent'
    | 'action'
    | 'role'
    | 'note'
    | 'editorial_status'
    | 'volume';
  value: string;
  kind: 'published' | 'planned';
}

export type EditRowResult =
  | { ok: true; affected: string[] }
  | { ok: false; reason: string };

function normalizeStringValue(value: string): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' || trimmed === '—' ? null : trimmed;
}

// Cluster-scoped attributes for published rows. `keyword`, `intent`, and
// `volume` are sourced from the content's `.md` frontmatter and are NOT
// written to overrides — see `editClusterRow` for the published-row branch.
const PUBLISHED_OVERRIDE_FIELDS = new Set<EditRowInput['field']>([
  'display_title',
  'editorial_status',
  'action',
  'note',
]);

function editPublishedOverride(
  data: Record<string, any>,
  contentSlug: string,
  field: EditRowInput['field'],
  value: string,
): boolean {
  if (!PUBLISHED_OVERRIDE_FIELDS.has(field)) {
    return false;
  }
  const overrides = (data.satellite_overrides && typeof data.satellite_overrides === 'object'
    ? data.satellite_overrides
    : {}) as Record<string, Record<string, unknown>>;
  const current = { ...(overrides[contentSlug] || {}) };
  const normalized = normalizeStringValue(value);
  if (normalized === null) delete current[field];
  else current[field] = normalized;
  if (Object.keys(current).length === 0) {
    const next = { ...overrides };
    delete next[contentSlug];
    data.satellite_overrides = next;
  } else {
    data.satellite_overrides = { ...overrides, [contentSlug]: current };
  }
  return true;
}

function editPlannedEntry(
  data: Record<string, any>,
  contentSlug: string,
  field: EditRowInput['field'],
  value: string,
): boolean {
  const list = Array.isArray(data.planned_satellites) ? data.planned_satellites : [];
  const index = list.findIndex((s: any) => s?.slug === contentSlug);
  if (index < 0) return false;
  const entry = { ...list[index] };
  if (field === 'note') {
    const normalized = (value ?? '').trim();
    entry.note = normalized || null;
  } else if (field === 'role') {
    entry.role = value === 'pillar' ? 'pillar' : 'satellite';
  } else if (field === 'volume') {
    const num = Number((value || '').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(num) || num <= 0) {
      delete entry.volume;
      delete entry.volume_source;
    } else {
      entry.volume = Math.round(num);
      entry.volume_source = 'manual';
    }
  } else if (
    field === 'action' ||
    field === 'display_title' ||
    field === 'keyword' ||
    field === 'intent' ||
    field === 'editorial_status'
  ) {
    const normalized = normalizeStringValue(value);
    if (normalized === null) delete entry[field];
    else entry[field] = normalized;
  } else {
    return false;
  }
  const next = [...list];
  next[index] = entry;
  data.planned_satellites = next;
  return true;
}

function writeContentFrontmatterRole(
  projectRoot: string,
  contentSlug: string,
  clusterSlug: string,
  value: string,
): boolean {
  const located = findContentFile(projectRoot, contentSlug);
  if (!located) return false;
  const text = readFileSync(located.path, 'utf8');
  const match = text.match(FM_RE);
  if (!match) return false;
  let fm: Record<string, any> = {};
  try {
    fm = (parseYaml(match[1]) as Record<string, any>) || {};
  } catch {
    fm = {};
  }
  const next: Record<string, any> = { ...fm };
  const role = value === 'pillar' ? 'pillar' : 'satellite';
  const roleMap = { ...(typeof next.role === 'object' && next.role ? next.role : {}) };
  roleMap[clusterSlug] = role;
  next.role = roleMap;
  const body = match[2] || '';
  const yamlText = yamlStringify(next, { lineWidth: 0 }).trimEnd();
  silenceWrite(located.path);
  writeFileSync(located.path, `---\n${yamlText}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`, 'utf8');
  return true;
}

function ensureUniquePillar(
  projectRoot: string,
  data: Record<string, any>,
  newPillarSlug: string,
  currentClusterSlug: string,
): { ok: boolean; conflicts: string[] } {
  const conflicts: string[] = [];
  const dir = join(resolve(projectRoot), 'clusters');
  if (!existsSync(dir)) return { ok: true, conflicts };
  for (const name of readdirSync(dir)) {
    if (name === currentClusterSlug) continue;
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const yamlPath = join(dir, name, 'cluster.yaml');
    if (!existsSync(yamlPath)) continue;
    try {
      const other = parseYaml(readFileSync(yamlPath, 'utf8')) as Record<string, any>;
      if (other?.pillar?.slug === newPillarSlug) conflicts.push(name);
    } catch {
      // skip
    }
  }
  return { ok: conflicts.length === 0, conflicts };
}

export function editClusterRow(
  projectRoot: string,
  clusterSlug: string,
  contentSlug: string,
  input: EditRowInput,
): EditRowResult {
  const yamlPath = clusterYamlPath(projectRoot, clusterSlug);
  if (!existsSync(yamlPath)) return { ok: false, reason: 'cluster-not-found' };
  const data = (parseYaml(readFileSync(yamlPath, 'utf8')) as Record<string, any>) || {};
  const affected: string[] = [];

  if (input.kind === 'planned') {
    if (!editPlannedEntry(data, contentSlug, input.field, input.value)) {
      return { ok: false, reason: 'planned-entry-not-found' };
    }
    data.contract_version = 1;
    silenceWrite(yamlPath);
    writeFileSync(yamlPath, yamlStringify(data, { lineWidth: 0 }), 'utf8');
    affected.push(`clusters/${clusterSlug}/cluster.yaml`);
    return { ok: true, affected };
  }

  if (input.field === 'role') {
    const role = input.value === 'pillar' ? 'pillar' : 'satellite';
    if (role === 'pillar') {
      const unique = ensureUniquePillar(projectRoot, data, contentSlug, clusterSlug);
      if (!unique.ok) {
        return { ok: false, reason: `unique-pillar-violation:${unique.conflicts.join(',')}` };
      }
      data.pillar = { ...(data.pillar || {}), slug: contentSlug };
      data.contract_version = 1;
      silenceWrite(yamlPath);
      writeFileSync(yamlPath, yamlStringify(data, { lineWidth: 0 }), 'utf8');
      affected.push(`clusters/${clusterSlug}/cluster.yaml`);
    }
    if (writeContentFrontmatterRole(projectRoot, contentSlug, clusterSlug, role)) {
      const located = findContentFile(projectRoot, contentSlug);
      if (located) affected.push(`contents/${located.origin}/${contentSlug}.md`);
    }
    return { ok: true, affected };
  }

  // Source of truth for keyword/intent/volume on published rows is the
  // content's `.md` frontmatter, NOT cluster.yaml.satellite_overrides.
  // Writing only the frontmatter keeps the 3 sync views consistent and
  // lets cluster-sync re-materialize the brain table on the next run.
  if (input.field === 'keyword' || input.field === 'intent' || input.field === 'volume') {
    const contentResult = updateContentMetadata(projectRoot, contentSlug, {
      [input.field]: input.value,
    });
    if (!contentResult.ok) return contentResult;
    return { ok: true, affected: [contentResult.path] };
  }

  // display_title, editorial_status, action, note are cluster-scoped and
  // belong in cluster.yaml.satellite_overrides[contentSlug].
  if (!editPublishedOverride(data, contentSlug, input.field, input.value)) {
    return { ok: false, reason: 'unsupported-field' };
  }
  data.contract_version = 1;
  silenceWrite(yamlPath);
  writeFileSync(yamlPath, yamlStringify(data, { lineWidth: 0 }), 'utf8');
  affected.push(`clusters/${clusterSlug}/cluster.yaml`);
  return { ok: true, affected };
}
