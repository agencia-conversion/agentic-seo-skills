import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { REPORT_DIR_NAME, REPORT_MODULE_IDS } from '../../../../shared/report-modules';
import companionRoutes from '../../../../shared/companion-routes.js';
import { loadBrainSubpageTemplate } from './brain-templates';
import { ensureWatcherStarted, silenceWrite } from './auto-block-watcher';

export const AUTHORIAL_BRAIN_PAGES = new Set([
  'brain/index.md',
  'brain/identity.md',
  'brain/voice.md',
  'brain/technology.md',
  'brain/topic-clusters.md',
  'brain/products.md',
  'brain/review.md',
]);

const BRAIN_PAGE_ORDER = [
  'brain/index.md',
  'brain/identity.md',
  'brain/voice.md',
  'brain/technology.md',
  'brain/topic-clusters.md',
  'brain/products.md',
  'brain/review.md',
  'brain/log.md',
];

const CONTENT_ORIGINS = new Set(['blog', 'linkedin', 'podcast', 'other']);
const REPORT_MODULES = new Set<string>(REPORT_MODULE_IDS);
const ARTIFACT_DRAFT_RE = /^artifacts\/contents\/[A-Za-z0-9._-]+\/draft\.md$/;
const { companionTargetForPath } = companionRoutes;
const SUPPORTED_PROJECT_LANGUAGES = new Set(['pt-BR', 'en']);
const ROOT = process.env.AGENTIC_SEO_PLUGIN_ROOT || process.env.SEO_BRAIN_PLUGIN_ROOT || join(/*turbopackIgnore: true*/ process.cwd(), '..', '..');
const BRAIN_TEMPLATE_DIR = join(ROOT, 'templates', 'project', 'brain');

export interface ProjectTreeItem {
  path: string;
  companion_slug: string;
  companion_path: string;
  title: string;
  icon?: string | null;
  cover?: string | null;
  updated: string | null;
  readOnly: boolean;
  requiresApproval: boolean;
  excerpt: string;
  hash: string;
}

export interface ProjectTreeSection {
  id: string;
  title: string;
  items: ProjectTreeItem[];
}

function sha256(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProjectRoot(projectRoot?: string | null) {
  const root = resolve(/*turbopackIgnore: true*/ projectRoot || process.env.AGENTIC_SEO_PROJECT_ROOT || 'project');
  // Auto-fix legacy project/content/ → project/contents/ before any read so
  // the watcher and downstream APIs see the canonical layout. Safe to call
  // repeatedly (no-op when already canonical).
  applyLegacyContentRename(root);
  // Lazily start the external-edit watcher on the first API call that
  // resolves a project root. Idempotent.
  ensureWatcherStarted(root);
  return root;
}

// Tracks one-time auto-renames per project root so we log only once.
const AUTO_RENAMED_ROOTS = new Set<string>();

export function applyLegacyContentRename(root: string) {
  const legacy = join(root, 'content');
  const canonical = join(root, 'contents');
  let legacyExists = false;
  let canonicalExists = false;
  try {
    legacyExists = existsSync(legacy) && statSync(legacy).isDirectory();
  } catch {
    legacyExists = false;
  }
  try {
    canonicalExists = existsSync(canonical) && statSync(canonical).isDirectory();
  } catch {
    canonicalExists = false;
  }
  if (!legacyExists || canonicalExists) return false;
  try {
    renameSync(legacy, canonical);
  } catch {
    return false;
  }
  if (!AUTO_RENAMED_ROOTS.has(root)) {
    AUTO_RENAMED_ROOTS.add(root);
    // eslint-disable-next-line no-console
    console.warn(`[agentic-seo] auto-renamed ${legacy} → ${canonical}`);
  }
  return true;
}

function yamlString(value: unknown) {
  return JSON.stringify(String(value ?? ''));
}

function yamlValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.length ? ['', ...value.map((item) => `  - ${yamlString(item)}`)] : ['[]'];
  }
  if (value && typeof value === 'object') {
    const yaml = stringifyYaml(value, { lineWidth: 0 }).trimEnd().split(/\r?\n/);
    return yaml.length ? ['', ...yaml.map((line) => `  ${line}`)] : ['{}'];
  }
  return [yamlString(value)];
}

function frontmatterLines(fields: Record<string, unknown>) {
  return Object.entries(fields).flatMap(([key, value]) => {
    const rendered = yamlValue(value);
    return rendered.length === 1 ? [`${key}: ${rendered[0]}`] : [`${key}:`, ...rendered.slice(1)];
  });
}

function isSafeSegment(segment: string) {
  return !!segment && segment !== '.' && segment !== '..' && !segment.startsWith('.');
}

export function validateProjectFileRel(rawPath: unknown, { write = false } = {}) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return { ok: false as const, reason: 'missing-path' };
  }
  const rel = rawPath.trim().replace(/^\/+/, '');
  if (rel.includes('\\') || rel.includes('\0')) {
    return { ok: false as const, reason: 'path-not-allowed' };
  }
  const parts = rel.split('/');
  if (!parts.every(isSafeSegment) || !rel.endsWith('.md')) {
    return { ok: false as const, reason: 'path-not-allowed' };
  }
  const allowed =
    /^brain\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    /^brain\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    /^contents\/(blog|linkedin|podcast|other)\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    ARTIFACT_DRAFT_RE.test(rel) ||
    /^workbench\/[A-Za-z0-9._/-]+\.md$/.test(rel) ||
    new RegExp(`^${REPORT_DIR_NAME}\\/[A-Za-z0-9._-]+\\/[A-Za-z0-9._/-]+\\/report\\.md$`).test(rel);
  if (!allowed) return { ok: false as const, reason: 'path-not-allowed' };
  if (rel.startsWith(`${REPORT_DIR_NAME}/`)) {
    if (!REPORT_MODULES.has(parts[1])) return { ok: false as const, reason: 'path-not-allowed' };
  }
  if (write && rel === 'brain/log.md') return { ok: false as const, reason: 'read-only-log' };
  return { ok: true as const, rel };
}

function resolveAllowedFile(projectRoot: string | undefined, rel: string) {
  const root = normalizeProjectRoot(projectRoot);
  const filePath = resolve(root, rel);
  const allowedRoots = ['brain', 'contents', 'artifacts', 'workbench', REPORT_DIR_NAME].map((dir) => resolve(root, dir));
  if (!allowedRoots.some((allowed) => filePath === allowed || filePath.startsWith(`${allowed}${sep}`))) {
    throw new Error('path escaped project root');
  }
  if (existsSync(filePath)) {
    const lst = lstatSync(filePath);
    if (lst.isSymbolicLink()) throw new Error('symlink files are not allowed');
    const realFile = realpathSync(filePath);
    const realRoot = realpathSync(root);
    if (!realFile.startsWith(`${realRoot}${sep}`)) throw new Error('path escaped project root');
  }
  return { root, filePath };
}

function companionUiPath(root: string) {
  return join(root, '.agentic-seo', 'companion-ui.json');
}

function projectConfigPath(root: string) {
  return join(root, '.agentic-seo', 'project.json');
}

function readProjectConfig(root: string): Record<string, any> {
  const config = projectConfigPath(root);
  if (!existsSync(config)) return {};
  try {
    const data = JSON.parse(readFileSync(config, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

import { normalizeLanguage as sharedNormalizeLanguage } from '../../../../shared/locale.mjs';

// Fallback is 'pt-BR' to match the CLI canonical default, so a transient
// empty/unparseable read never biases delivery language to 'en'. The explicit
// user-initiated change path is updateProjectSettings + PATCH /api/project/settings.
function normalizeProjectLanguage(value: unknown, fallback: 'pt-BR' | 'en' = 'pt-BR') {
  return sharedNormalizeLanguage(value, fallback);
}

function readCompanionUi(root: string) {
  const fallback = { schema_version: '1.0.0', project: {} as Record<string, any>, pages: {} as Record<string, any> };
  const file = companionUiPath(root);
  if (!existsSync(file)) return fallback;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return {
      schema_version: '1.0.0',
      project: data?.project && typeof data.project === 'object' ? data.project : {},
      pages: data?.pages && typeof data.pages === 'object' ? data.pages : {},
    };
  } catch {
    return fallback;
  }
}

function writeCompanionUi(root: string, ui: Record<string, any>) {
  mkdirSync(dirname(companionUiPath(root)), { recursive: true });
  writeFileSync(companionUiPath(root), JSON.stringify(ui, null, 2) + '\n', 'utf8');
}

function pageUi(ui: Record<string, any>, rel: string) {
  const item = ui.pages?.[rel];
  return item && typeof item === 'object' ? item : {};
}

function applyPageUi(summary: ProjectTreeItem, ui: Record<string, any>) {
  const item = pageUi(ui, summary.path);
  if (Object.prototype.hasOwnProperty.call(item, 'icon')) summary.icon = item.icon ?? null;
  if (Object.prototype.hasOwnProperty.call(item, 'cover')) summary.cover = item.cover ?? null;
  return summary;
}

function savePageUi(root: string, rel: string, nextUi: { icon?: unknown; cover?: unknown }) {
  const hasIcon = Object.prototype.hasOwnProperty.call(nextUi, 'icon');
  const hasCover = Object.prototype.hasOwnProperty.call(nextUi, 'cover');
  if (!hasIcon && !hasCover) return false;
  const ui = readCompanionUi(root);
  ui.pages[rel] = {
    ...pageUi(ui, rel),
    ...(hasIcon ? { icon: typeof nextUi.icon === 'string' && nextUi.icon ? nextUi.icon : null } : {}),
    ...(hasCover ? { cover: typeof nextUi.cover === 'string' && nextUi.cover ? nextUi.cover : null } : {}),
    updated_at: new Date().toISOString(),
  };
  writeCompanionUi(root, ui);
  return true;
}

function deletePageUi(root: string, rel: string) {
  const ui = readCompanionUi(root);
  if (!Object.prototype.hasOwnProperty.call(ui.pages || {}, rel)) return false;
  delete ui.pages[rel];
  writeCompanionUi(root, ui);
  return true;
}

export function parseFrontmatter(text: string) {
  if (!text.startsWith('---\n')) return { data: {} as Record<string, any>, body: text, raw: '' };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { data: {} as Record<string, any>, body: text, raw: '' };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, '');
  let data: Record<string, any> = {};
  try {
    const parsed = parseYaml(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed as Record<string, any>;
    }
  } catch {
    data = {};
  }
  return { data, body, raw };
}

function setFrontmatterFields(text: string, fields: Record<string, unknown>) {
  if (!text.startsWith('---\n')) {
    const linesForFields = frontmatterLines(fields);
    return `---\n${linesForFields.join('\n')}\n---\n\n${text.replace(/^\n+/, '')}`;
  }
  const end = text.indexOf('\n---', 4);
  if (end === -1) {
    const linesForFields = frontmatterLines(fields);
    return `---\n${linesForFields.join('\n')}\n---\n\n${text}`;
  }
  const raw = text.slice(4, end);
  const after = text.slice(end + 4);
  let current: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) current = parsed as Record<string, unknown>;
  } catch {
    current = {};
  }
  const nextRaw = stringifyYaml({ ...current, ...fields }, { lineWidth: 0 }).trimEnd();
  return `---\n${nextRaw}\n---${after}`;
}

function cleanFrontmatterRaw(raw: unknown) {
  if (typeof raw !== 'string') return null;
  if (raw.includes('\0') || /^---\s*$/m.test(raw)) return null;
  return raw.replace(/\r\n/g, '\n').replace(/\s+$/, '');
}

function frontmatterFieldsForPath(rel: string, incoming: Record<string, any>, existing: Record<string, any>, title?: string) {
  if (rel.startsWith('contents/') || rel.startsWith('artifacts/contents/')) {
    return {
      ...existing,
      ...incoming,
      title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
    };
  }
  if (rel.startsWith(`${REPORT_DIR_NAME}/`)) {
    return {
      ...existing,
      ...incoming,
      title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
      edited_at: nowIso(),
    };
  }
  const next: Record<string, unknown> = {
    title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
  };
  if (rel.startsWith('brain/')) next.updated = todayIso();
  return next;
}

function appendLogEntry(logFile: string, entry: Record<string, string | null | undefined>) {
  mkdirSync(dirname(logFile), { recursive: true });
  const lines = [
    '',
    '',
    `## ${entry.date} - ${entry.title}`,
    '',
    `- type: ${entry.type}`,
    `- scope: ${entry.scope || 'n/a'}`,
    `- decision: ${entry.decision}`,
  ];
  if (entry.evidence) lines.push(`- evidence: ${entry.evidence}`);
  lines.push(`- approver: ${entry.approver || 'agent'}`);
  if (entry.approved_at) lines.push(`- approved_at: ${entry.approved_at}`);
  if (entry.notes) lines.push(`- notes: ${entry.notes}`);
  appendFileSync(logFile, lines.join('\n') + '\n', 'utf8');
}

function titleFromFile(rel: string, frontmatter: Record<string, any>) {
  const title = String(frontmatter.title || '').trim().replace(/^["']|["']$/g, '');
  if (title) return title;
  if (rel === 'brain/log.md') return 'Log';
  return basename(rel, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeHeadingTitle(value: string) {
  return String(value || '')
    .replace(/^["']|["']$/g, '')
    // Strip leading emoji/icon prefix (Unicode pictographs, symbols, dingbats).
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{S}]+\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stripDuplicateTitleHeading(_rel: string, body: string, title: string) {
  const match = body.match(/^\s*#\s+([^\n\r]+)\s*(?:\r?\n|$)/);
  if (!match) return body;
  if (normalizeHeadingTitle(match[1]) !== normalizeHeadingTitle(title)) return body;
  return body.slice(match[0].length).replace(/^\s*\n/, '');
}

function projectDisplayName(projectRoot?: string) {
  const root = normalizeProjectRoot(projectRoot);
  const data = readProjectConfig(root);
  if (data?.name) return String(data.name);
  if (data?.brand_name) return String(data.brand_name);
  const index = join(root, 'brain', 'index.md');
  if (existsSync(index)) {
    try {
      const { data } = parseFrontmatter(readFileSync(index, 'utf8'));
      if (data.title) return String(data.title).replace(/^["']|["']$/g, '');
    } catch {}
  }
  return 'Agentic SEO';
}

export function readProjectSettings({ projectRoot }: { projectRoot?: string }) {
  const root = normalizeProjectRoot(projectRoot);
  const data = readProjectConfig(root);
  const projectName = data?.name || data?.brand_name || projectDisplayName(root);
  const market = data?.market || data?.country || 'Brasil';
  const country = data?.country || market;
  return {
    ok: true,
    projectRoot: root,
    projectName: String(projectName),
    language: normalizeProjectLanguage(data?.language),
    market: String(market),
    country: String(country),
  };
}

export function updateProjectSettings({ projectRoot, language }: { projectRoot?: string; language?: unknown }) {
  const root = normalizeProjectRoot(projectRoot);
  const nextLanguage = typeof language === 'string' ? language.trim() : '';
  if (!SUPPORTED_PROJECT_LANGUAGES.has(nextLanguage)) return { ok: false, reason: 'invalid-language' };
  const previous = readProjectConfig(root);
  const next = {
    schema_version: previous.schema_version || '2.0.0',
    name: previous.name || previous.project_name || 'Agentic SEO Project',
    ...previous,
    language: nextLanguage,
    updated_at: nowIso(),
    single_project_root: previous.single_project_root || 'project',
  };
  mkdirSync(dirname(projectConfigPath(root)), { recursive: true });
  writeFileSync(projectConfigPath(root), JSON.stringify(next, null, 2) + '\n', 'utf8');
  if (existsSync(join(root, 'brain', 'log.md'))) {
    appendLogEntry(join(root, 'brain', 'log.md'), {
      date: todayIso(),
      type: 'decision',
      title: 'Idioma do projeto atualizado',
      scope: '.agentic-seo/project.json',
      decision: `Idioma canônico do projeto definido como ${nextLanguage}.`,
      evidence: '.agentic-seo/project.json',
      approver: 'agent',
    });
  }
  return readProjectSettings({ projectRoot: root });
}

// Appends a deliberate DataForSEO bypass decision to project/brain/log.md.
// Used by the Companion bypass dialog (POST /api/project/bypass) to replace the
// legacy 127.0.0.1/handoff dataforseo-bypass flow. Returns ok:false with a
// reason when input is missing or the Brain log does not exist yet.
export function appendBypassDecision({
  projectRoot,
  reason,
  consequence,
  approver,
  workflow,
  step,
}: {
  projectRoot?: string;
  reason?: unknown;
  consequence?: unknown;
  approver?: unknown;
  workflow?: unknown;
  step?: unknown;
}) {
  const root = normalizeProjectRoot(projectRoot);
  const reasonClean = typeof reason === 'string' ? reason.trim() : '';
  if (!reasonClean) return { ok: false as const, reason: 'missing-reason' };
  const approverClean = (typeof approver === 'string' ? approver.trim() : '') || 'agent';
  const workflowClean = (typeof workflow === 'string' ? workflow.trim() : '') || 'agentic-seo';
  const stepClean = (typeof step === 'string' ? step.trim() : '') || 'dataforseo';
  const consequenceClean =
    (typeof consequence === 'string' ? consequence.trim() : '') || 'O artifact não será DataForSEO-backed.';
  const logFile = join(root, 'brain', 'log.md');
  if (!existsSync(join(root, 'brain')) && !existsSync(logFile)) {
    return { ok: false as const, reason: 'brain-log-missing' };
  }
  appendLogEntry(logFile, {
    date: todayIso(),
    type: 'decision',
    title: `DataForSEO bypass · ${workflowClean}`,
    scope: workflowClean,
    decision: `${workflowClean} registrado sem DataForSEO em ${stepClean}: ${consequenceClean}`,
    evidence: reasonClean,
    approver: approverClean,
    approved_at: null,
    notes: reasonClean,
  });
  return { ok: true as const, workflow: workflowClean, step: stepClean, approver: approverClean };
}

function readSummary(
  projectRoot: string,
  rel: string,
  ui: Record<string, any>,
  defaultIcons?: Map<string, string>,
): ProjectTreeItem | null {
  const { filePath } = resolveAllowedFile(projectRoot, rel);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
  const text = readFileSync(filePath, 'utf8');
  const { data: frontmatter, body } = parseFrontmatter(text);
  const title = titleFromFile(rel, frontmatter);
  const displayBody = stripDuplicateTitleHeading(rel, body, title);
  const summary: ProjectTreeItem = {
    path: rel,
    ...companionTargetForPath(rel),
    title,
    updated: frontmatter.updated || frontmatter.published_at || null,
    readOnly: rel === 'brain/log.md',
    requiresApproval: false,
    excerpt: displayBody.replace(/\s+/g, ' ').trim().slice(0, 180),
    hash: sha256(text),
  };
  if (defaultIcons && defaultIcons.has(rel)) {
    summary.icon = defaultIcons.get(rel);
  }
  return applyPageUi(summary, ui);
}

function readClusterIcons(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const clustersRoot = join(root, 'clusters');
  if (!existsSync(clustersRoot)) return out;
  for (const name of readdirSync(clustersRoot)) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const yamlPath = join(clustersRoot, name, 'cluster.yaml');
    if (!existsSync(yamlPath)) continue;
    try {
      const text = readFileSync(yamlPath, 'utf8');
      const match = text.match(/^icon:\s*(.+)$/m);
      const slugMatch = text.match(/^slug:\s*(.+)$/m);
      const slug = slugMatch ? slugMatch[1].trim().replace(/^["']|["']$/g, '') : name;
      if (match) {
        const icon = match[1].trim().replace(/^["']|["']$/g, '');
        if (icon) out.set(`brain/topic-clusters/${slug}.md`, icon);
      }
    } catch {
      // Skip malformed cluster yaml.
    }
  }
  return out;
}

function walkMarkdown(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkMarkdown(root, full));
    if (st.isFile() && name.endsWith('.md')) out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function canonicalBrainExists(root: string) {
  return BRAIN_PAGE_ORDER.some((rel) => existsSync(join(root, rel)));
}

export interface ProjectWarning {
  code: 'legacy-content-dir' | 'content-and-contents-coexist';
  message: string;
  details?: Record<string, string>;
}

// Tracks one-time console warnings per project root so we don't spam logs.
const WARNED_ROOTS = new Set<string>();

export function detectProjectWarnings(root: string): ProjectWarning[] {
  const warnings: ProjectWarning[] = [];
  const legacy = join(root, 'content');
  const canonical = join(root, 'contents');
  const legacyExists = existsSync(legacy) && statSync(legacy).isDirectory();
  const canonicalExists = existsSync(canonical) && statSync(canonical).isDirectory();
  if (legacyExists && !canonicalExists) {
    // Should be rare since normalizeProjectRoot() auto-renames. Only seen
    // when the rename failed (permissions, locked files). Keep the warning
    // as a fallback so the user notices.
    warnings.push({
      code: 'legacy-content-dir',
      message:
        'project/content/ existe (legado) e o auto-rename para project/contents/ falhou. Rode `mv project/content project/contents` manualmente.',
      details: { legacy, canonical },
    });
  } else if (legacyExists && canonicalExists) {
    warnings.push({
      code: 'content-and-contents-coexist',
      message:
        'project/content/ e project/contents/ existem. Apenas project/contents/ é lido — mova/mescle os arquivos manualmente e remova project/content/.',
      details: { legacy, canonical },
    });
  }
  return warnings;
}

function emitProjectWarningsOnce(root: string, warnings: ProjectWarning[]) {
  if (warnings.length === 0) return;
  if (WARNED_ROOTS.has(root)) return;
  WARNED_ROOTS.add(root);
  for (const w of warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[agentic-seo] ${w.code}: ${w.message}`);
  }
}

export function buildProjectTree({ projectRoot }: { projectRoot?: string }) {
  const root = normalizeProjectRoot(projectRoot);
  const projectName = projectDisplayName(root);
  const ui = readCompanionUi(root);
  const hasProjectIcon = Object.prototype.hasOwnProperty.call(ui.project || {}, 'icon');
  const projectIcon = hasProjectIcon ? ui.project.icon || null : null;
  const brainRoot = join(root, 'brain');
  const brainRels = new Set(BRAIN_PAGE_ORDER);
  if (existsSync(brainRoot)) {
    for (const name of readdirSync(brainRoot)) {
      const rel = `brain/${name}`;
      const full = join(brainRoot, name);
      if (name.startsWith('.') || name.startsWith('_')) continue;
      const st = statSync(full);
      if (st.isFile() && name.endsWith('.md')) brainRels.add(rel);
      if (st.isDirectory()) {
        for (const child of walkMarkdown(full)) brainRels.add(`brain/${name}/${child}`);
      }
    }
  }
  const orderedBrain = [...brainRels].sort((a, b) => {
    const ia = BRAIN_PAGE_ORDER.indexOf(a);
    const ib = BRAIN_PAGE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b, 'pt-BR');
  });
  const clusterIcons = readClusterIcons(root);

  const contentItems: ProjectTreeItem[] = [];
  for (const origin of CONTENT_ORIGINS) {
    const dir = join(root, 'contents', origin);
    for (const rel of walkMarkdown(dir).map((child) => `contents/${origin}/${child}`)) {
      const item = readSummary(root, rel, ui);
      if (item) contentItems.push(item);
    }
  }
  const workbenchItems = walkMarkdown(join(root, 'workbench'))
    .map((child) => readSummary(root, `workbench/${child}`, ui))
    .filter(Boolean) as ProjectTreeItem[];
  const draftItems = walkMarkdown(join(root, 'artifacts', 'contents'))
    .filter((child) => /^[A-Za-z0-9._-]+\/draft\.md$/.test(child))
    .map((child) => readSummary(root, `artifacts/contents/${child}`, ui))
    .filter(Boolean) as ProjectTreeItem[];
  const brainItems = orderedBrain.map((rel) => readSummary(root, rel, ui, clusterIcons)).filter(Boolean) as ProjectTreeItem[];
  const hasFiles = brainItems.length + contentItems.length + draftItems.length + workbenchItems.length > 0;
  const hasBrain = canonicalBrainExists(root);

  const sections: ProjectTreeSection[] = [
    {
      id: 'brain',
      title: 'Brain',
      items: brainItems,
    },
  ];
  sections.push({ id: 'contents', title: 'Content', items: contentItems });
  if (draftItems.length || existsSync(join(root, 'artifacts', 'contents'))) {
    sections.push({ id: 'drafts', title: 'Rascunhos', items: draftItems });
  }
  sections.push({ id: 'workbench', title: 'Workbench', items: workbenchItems });

  const warnings = detectProjectWarnings(root);
  emitProjectWarningsOnce(root, warnings);

  return {
    ok: true,
    hasFiles,
    hasBrain,
    canBootstrapBrain: !hasBrain,
    project: { root, name: projectName, icon: projectIcon },
    sections,
    warnings,
  };
}

function renderBrainTemplate(rel: string, text: string, projectName: string) {
  const today = todayIso();
  let out = text.replaceAll('<YYYY-MM-DD>', today);
  if (rel === 'brain/index.md') {
    out = out.replaceAll('<Nome do projeto>', projectName || 'Agentic SEO');
  }
  return out;
}

export function bootstrapBrainFiles({ projectRoot }: { projectRoot?: string }) {
  const root = normalizeProjectRoot(projectRoot);
  if (canonicalBrainExists(root)) return { ok: false, reason: 'brain-already-exists' };
  const projectName = projectDisplayName(root);
  const created: string[] = [];
  for (const rel of BRAIN_PAGE_ORDER) {
    const source = join(/*turbopackIgnore: true*/ BRAIN_TEMPLATE_DIR, basename(rel));
    if (!existsSync(source)) return { ok: false, reason: 'template-not-found', path: rel };
    const validation = validateProjectFileRel(rel, { write: rel !== 'brain/log.md' });
    if (!validation.ok && rel !== 'brain/log.md') return { ok: false, reason: validation.reason, path: rel };
    const { filePath } = resolveAllowedFile(root, rel);
    mkdirSync(dirname(filePath), { recursive: true });
    silenceWrite(filePath);
    writeFileSync(filePath, renderBrainTemplate(rel, readFileSync(source, 'utf8'), projectName), 'utf8');
    created.push(rel);
  }
  appendLogEntry(join(root, 'brain', 'log.md'), {
    date: todayIso(),
    type: 'decision',
    title: 'Brain created via Companion',
    scope: created.join(', '),
    decision: 'Canonical Brain files created via Companion Web.',
    evidence: created.join(', '),
    approver: 'agent',
  });
  return { ok: true, created, tree: buildProjectTree({ projectRoot: root }) };
}

export function readProjectFile({ projectRoot, fileRel }: { projectRoot?: string; fileRel: unknown }) {
  const validation = validateProjectFileRel(fileRel);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { root, filePath } = resolveAllowedFile(projectRoot, validation.rel);
  if (!existsSync(filePath)) return { ok: false, reason: 'file-not-found' };
  const text = readFileSync(filePath, 'utf8');
  const { data: frontmatter, body, raw } = parseFrontmatter(text);
  const itemUi = pageUi(readCompanionUi(root), validation.rel);
  const title = titleFromFile(validation.rel, frontmatter);
  const displayBody = stripDuplicateTitleHeading(validation.rel, body, title);
  return {
    ok: true,
    projectRoot: root,
    path: validation.rel,
    ...companionTargetForPath(validation.rel),
    title,
    frontmatter,
    frontmatterRaw: raw,
    icon: Object.prototype.hasOwnProperty.call(itemUi, 'icon') ? itemUi.icon ?? null : undefined,
    cover: Object.prototype.hasOwnProperty.call(itemUi, 'cover') ? itemUi.cover ?? null : undefined,
    body: displayBody,
    text,
    hash: sha256(text),
    readOnly: validation.rel === 'brain/log.md',
    requiresApproval: false,
  };
}

export function saveProjectFile({
  projectRoot,
  fileRel,
  expectedHash,
  title,
  body,
  frontmatter,
  frontmatterRaw,
  ui,
  approver,
  notes,
}: {
  projectRoot?: string;
  fileRel: unknown;
  expectedHash?: string;
  title?: string;
  body?: string;
  frontmatter?: Record<string, any>;
  frontmatterRaw?: string;
  ui?: { icon?: unknown; cover?: unknown };
  approver?: string;
  notes?: string;
}) {
  const hasBodyChange = typeof body === 'string';
  const validation = validateProjectFileRel(fileRel, { write: hasBodyChange });
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { root, filePath } = resolveAllowedFile(projectRoot, validation.rel);
  if (!existsSync(filePath)) return { ok: false, reason: 'file-not-found' };
  const hasUiChange = !!ui && (Object.prototype.hasOwnProperty.call(ui, 'icon') || Object.prototype.hasOwnProperty.call(ui, 'cover'));
  if (!hasBodyChange && !hasUiChange) return { ok: false, reason: 'invalid-body' };

  const current = readFileSync(filePath, 'utf8');
  const currentHash = sha256(current);
  if (!hasBodyChange) {
    const uiSaved = hasUiChange ? savePageUi(root, validation.rel, ui || {}) : false;
    return {
      ok: true,
      path: validation.rel,
      ...companionTargetForPath(validation.rel),
      hash: currentHash,
      uiSaved,
      logAppended: false,
    };
  }

  if (!expectedHash || expectedHash !== currentHash) {
    return { ok: false, reason: 'file-modified', currentHash };
  }
  const approverClean = String(approver || '').trim();

  const { data: existingFrontmatter } = parseFrontmatter(current);
  const incomingFrontmatter = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
  const finalTitle = String(
    incomingFrontmatter.title || title || existingFrontmatter.title || titleFromFile(validation.rel, existingFrontmatter)
  ).trim();
  let rawFrontmatter: string;
  const rawCandidate =
    validation.rel.startsWith('contents/') || validation.rel.startsWith('artifacts/contents/')
      ? cleanFrontmatterRaw(frontmatterRaw)
      : null;
  if (rawCandidate !== null) {
    rawFrontmatter = rawCandidate;
  } else {
    const fields = frontmatterFieldsForPath(validation.rel, incomingFrontmatter, existingFrontmatter, finalTitle);
    const textWithFrontmatter = setFrontmatterFields(current, fields);
    rawFrontmatter = parseFrontmatter(textWithFrontmatter).raw;
  }
  const finalText = `---\n${rawFrontmatter}\n---\n\n${body.replace(/^\n+/, '').replace(/\s*$/, '\n')}`;
  silenceWrite(filePath);
  writeFileSync(filePath, finalText, 'utf8');
  const uiSaved = hasUiChange ? savePageUi(root, validation.rel, ui || {}) : false;

  if (validation.rel.startsWith('brain/') || validation.rel.startsWith(`${REPORT_DIR_NAME}/`)) {
    const today = todayIso();
    const isReport = validation.rel.startsWith(`${REPORT_DIR_NAME}/`);
    appendLogEntry(join(root, 'brain', 'log.md'), {
      date: today,
      type: 'decision',
      title: isReport ? 'Análise editada no Companion' : `${basename(validation.rel, '.md')} editado no Companion`,
      scope: validation.rel,
      decision: `${isReport ? 'Análise' : validation.rel} editado${isReport ? 'a' : ''} no Companion Web${approverClean ? ` por ${approverClean}` : ''}.`,
      evidence: validation.rel,
      approver: approverClean || 'agent',
      approved_at: null,
      notes: notes ? String(notes).trim() : null,
    });
  }

  const next = readFileSync(filePath, 'utf8');
  return {
    ok: true,
    path: validation.rel,
    ...companionTargetForPath(validation.rel),
    title: finalTitle,
    updated: todayIso(),
    hash: sha256(next),
    requiresApproval: false,
    uiSaved,
    logAppended: validation.rel.startsWith('brain/') || validation.rel.startsWith(`${REPORT_DIR_NAME}/`),
  };
}

function slugFromTitle(title: string) {
  return (title || 'nova-pagina')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'nova-pagina';
}

function uniqueRel(root: string, rel: string) {
  const ext = '.md';
  const base = rel.endsWith(ext) ? rel.slice(0, -ext.length) : rel;
  let candidate = `${base}${ext}`;
  let i = 2;
  while (existsSync(join(root, candidate))) {
    candidate = `${base}-${i}${ext}`;
    i++;
  }
  return candidate;
}

export function createProjectFile({
  projectRoot,
  kind = 'workbench',
  title = 'New page',
  parentPath,
  origin,
  clusters,
}: {
  projectRoot?: string;
  kind?: 'workbench' | 'content' | 'brain-subpage';
  title?: string;
  parentPath?: string;
  origin?: string;
  clusters?: string[];
}) {
  const root = normalizeProjectRoot(projectRoot);
  const slug = slugFromTitle(title);
  const safeOrigin = ['blog', 'linkedin', 'podcast', 'other'].includes(String(origin))
    ? String(origin)
    : 'other';
  let rel: string;
  if (kind === 'content') {
    rel = uniqueRel(root, `contents/${safeOrigin}/${slug}.md`);
  } else if (kind === 'brain-subpage') {
    if (!parentPath || typeof parentPath !== 'string') return { ok: false, reason: 'parent-path-required' };
    const match = parentPath.match(/^brain\/([A-Za-z0-9._-]+)\.md$/);
    if (!match) return { ok: false, reason: 'parent-path-not-brain' };
    rel = uniqueRel(root, `brain/${match[1]}/${slug}.md`);
  } else {
    rel = uniqueRel(root, `workbench/companion/${slug}.md`);
  }
  const validation = validateProjectFileRel(rel, { write: true });
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { filePath } = resolveAllowedFile(root, validation.rel);
  mkdirSync(dirname(filePath), { recursive: true });
  const today = todayIso();
  let text: string;
  if (kind === 'content') {
    const clusterList = Array.isArray(clusters) ? clusters.filter((c) => typeof c === 'string' && c.length > 0) : [];
    const clustersYaml = clusterList.length
      ? clusterList.map((c) => `  - ${yamlString(c)}`).join('\n')
      : '';
    const clustersBlock = clustersYaml ? `clusters:\n${clustersYaml}\n` : 'clusters: []\n';
    // Seed a minimal body so a freshly created content item is never an empty
    // document. The leading `# <title>` heading is intentionally stripped on read
    // by stripDuplicateTitleHeading (the editor renders the title separately), so
    // the seed also carries a placeholder paragraph that survives that strip —
    // otherwise readProjectFile/GET would still return body:"" despite the seed
    // reaching disk, and the editor/table would see an empty document.
    const placeholder = '_Comece a escrever este conteúdo…_';
    text = `---\ncontract_version: 1\ntitle: ${yamlString(title)}\nslug: ${yamlString(basename(rel, '.md'))}\npublished_at: ""\nsource_url: ""\norigin: ${yamlString(safeOrigin)}\n${clustersBlock}---\n\n# ${title}\n\n${placeholder}\n`;
  } else if (kind === 'brain-subpage' && parentPath) {
    const parentMatch = parentPath.match(/^brain\/([A-Za-z0-9._-]+)\.md$/);
    const parentSlug = parentMatch ? parentMatch[1] : '';
    const fromTemplate = parentSlug
      ? loadBrainSubpageTemplate(ROOT, parentSlug, {
          title,
          updated: today,
          parent_slug: parentSlug,
          parent_label: parentSlug,
          heading: title,
          resumo: '',
          area: '',
          pillar_line: '_pilar a definir_',
          contents_table: '<!-- Tabela regenerada pela skill `topic-cluster` ao promover um cluster. -->',
          next_actions: '- <próxima ação>',
          provenance: 'criação manual',
        })
      : null;
    text = fromTemplate ?? `---\ntitle: ${yamlString(title)}\nupdated: ${yamlString(today)}\n---\n\n# ${title}\n\n`;
  } else {
    text = `---\ntitle: ${yamlString(title)}\nupdated: ${yamlString(today)}\n---\n\n`;
  }
  silenceWrite(filePath);
  writeFileSync(filePath, text, 'utf8');
  const file = readProjectFile({ projectRoot: root, fileRel: rel });
  return { ...file, created: true };
}

function uniqueTrashPath(root: string, rel: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let trashRel = `.agentic-seo/trash/${stamp}/${rel}`;
  let i = 2;
  while (existsSync(join(root, trashRel))) {
    trashRel = `.agentic-seo/trash/${stamp}-${i}/${rel}`;
    i++;
  }
  return trashRel;
}

export function deleteProjectFile({
  projectRoot,
  fileRel,
  expectedHash,
  dirty = false,
}: {
  projectRoot?: string;
  fileRel: unknown;
  expectedHash?: string;
  dirty?: boolean;
}) {
  if (dirty) return { ok: false, reason: 'dirty-file' };
  const validation = validateProjectFileRel(fileRel);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  if (validation.rel.startsWith(`${REPORT_DIR_NAME}/`)) return { ok: false, reason: 'report-delete-not-allowed' };
  if (validation.rel === 'brain/log.md') return { ok: false, reason: 'read-only-log' };
  const { root, filePath } = resolveAllowedFile(projectRoot, validation.rel);
  if (!existsSync(filePath)) return { ok: false, reason: 'file-not-found' };
  const current = readFileSync(filePath, 'utf8');
  const currentHash = sha256(current);
  if (!expectedHash || expectedHash !== currentHash) {
    return { ok: false, reason: 'file-modified', currentHash };
  }
  const trashPath = uniqueTrashPath(root, validation.rel);
  const absoluteTrash = join(root, trashPath);
  mkdirSync(dirname(absoluteTrash), { recursive: true });
  silenceWrite(filePath);
  renameSync(filePath, absoluteTrash);
  deletePageUi(root, validation.rel);

  if (validation.rel.startsWith('brain/')) {
    appendLogEntry(join(root, 'brain', 'log.md'), {
      date: todayIso(),
      type: 'decision',
      title: `${basename(validation.rel, '.md')} movido para lixeira`,
      scope: validation.rel,
      decision: `${validation.rel} movido para a lixeira do Companion Web.`,
      evidence: trashPath,
      approver: 'agent',
    });
  }

  return { ok: true, path: validation.rel, ...companionTargetForPath(validation.rel), trashPath };
}

export function readProjectLog({ projectRoot }: { projectRoot?: string }) {
  const file = readProjectFile({ projectRoot, fileRel: 'brain/log.md' });
  if (!file.ok) return file;
  const loaded = file as typeof file & { body?: string };
  const entries = [];
  const blocks = String(loaded.body || '').split(/^## /m).slice(1);
  for (const block of blocks) {
    const heading = block.split(/\r?\n/, 1)[0].trim();
    if (!heading) continue;
    const type = block.match(/^- type:\s*(.+)$/m)?.[1]?.trim() || '';
    const scope = block.match(/^- scope:\s*(.+)$/m)?.[1]?.trim() || '';
    const decision = block.match(/^- decision:\s*(.+)$/m)?.[1]?.trim() || '';
    const approver = block.match(/^- approver:\s*(.+)$/m)?.[1]?.trim() || '';
    const approvedAt = block.match(/^- approved_at:\s*(.+)$/m)?.[1]?.trim() || '';
    entries.push({ heading, type, scope, decision, approver, approvedAt });
  }
  return { ...file, entries };
}
