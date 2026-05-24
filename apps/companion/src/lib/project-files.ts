import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

export const AUTHORIAL_BRAIN_PAGES = new Set([
  'brain/index.md',
  'brain/identidade.md',
  'brain/voz.md',
  'brain/tecnologia.md',
  'brain/editorial.md',
  'brain/topic-clusters.md',
]);

const BRAIN_PAGE_ORDER = [
  'brain/index.md',
  'brain/identidade.md',
  'brain/voz.md',
  'brain/tecnologia.md',
  'brain/editorial.md',
  'brain/topic-clusters.md',
  'brain/log.md',
];

const CONTENT_ORIGINS = new Set(['blog', 'linkedin', 'podcast', 'outros']);
const REPORT_MODULES = new Set([
  'technical-seo',
  'internal-links',
  'seo-analysis',
  'keyword-research',
  'serp-extract',
  'backlink-analysis',
  'topic-cluster',
  'eeat',
]);
const SUPPORTED_PROJECT_LANGUAGES = new Set(['pt-BR', 'en']);
const ROOT = process.env.AGENTIC_SEO_PLUGIN_ROOT || process.env.SEO_BRAIN_PLUGIN_ROOT || join(/*turbopackIgnore: true*/ process.cwd(), '..', '..');
const BRAIN_TEMPLATE_DIR = join(ROOT, 'templates', 'project', 'brain');

export interface ProjectTreeItem {
  path: string;
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
  return resolve(/*turbopackIgnore: true*/ projectRoot || process.env.AGENTIC_SEO_PROJECT_ROOT || 'project');
}

function yamlString(value: unknown) {
  return JSON.stringify(String(value ?? ''));
}

function yamlValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.length ? ['', ...value.map((item) => `  - ${yamlString(item)}`)] : ['[]'];
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
    /^conteudos\/(blog|linkedin|podcast|outros)\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    /^workbench\/[A-Za-z0-9._/-]+\.md$/.test(rel) ||
    /^relatorios\/[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+\/report\.md$/.test(rel);
  if (!allowed) return { ok: false as const, reason: 'path-not-allowed' };
  if (rel.startsWith('relatorios/')) {
    if (!REPORT_MODULES.has(parts[1])) return { ok: false as const, reason: 'path-not-allowed' };
  }
  if (write && rel === 'brain/log.md') return { ok: false as const, reason: 'read-only-log' };
  return { ok: true as const, rel };
}

function resolveAllowedFile(projectRoot: string | undefined, rel: string) {
  const root = normalizeProjectRoot(projectRoot);
  const filePath = resolve(root, rel);
  const allowedRoots = ['brain', 'conteudos', 'workbench', 'relatorios'].map((dir) => resolve(root, dir));
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

function normalizeProjectLanguage(value: unknown, fallback = 'pt-BR') {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('en')) return 'en';
  return 'en';
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
  const data: Record<string, any> = {};
  let currentList: string[] | null = null;
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s/.test(line) && currentList) {
      const m = line.match(/^\s+-\s*(.+)$/);
      if (m) currentList.push(m[1].replace(/^["']|["']$/g, ''));
      continue;
    }
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (val === '' || val === '[]') {
      currentList = [];
      data[key] = currentList;
    } else {
      data[key] = val.replace(/^["']|["']$/g, '');
      currentList = null;
    }
  }
  return { data, body, raw };
}

function setFrontmatterFields(text: string, fields: Record<string, unknown>) {
  const linesForFields = frontmatterLines(fields);
  if (!text.startsWith('---\n')) {
    return `---\n${linesForFields.join('\n')}\n---\n\n${text.replace(/^\n+/, '')}`;
  }
  const end = text.indexOf('\n---', 4);
  if (end === -1) {
    return `---\n${linesForFields.join('\n')}\n---\n\n${text}`;
  }
  const raw = text.slice(4, end);
  const after = text.slice(end + 4);
  const lines = raw.split(/\r?\n/);
  const seen = new Set<string>();
  const nextLines: string[] = [];
  for (const line of lines) {
    let replaced = false;
    for (const [key, value] of Object.entries(fields)) {
      if (new RegExp(`^${key}\\s*:`).test(line)) {
        seen.add(key);
        nextLines.push(...frontmatterLines({ [key]: value }));
        replaced = true;
        break;
      }
    }
    if (!replaced) nextLines.push(line);
  }
  for (const [key, value] of Object.entries(fields)) {
    if (!seen.has(key)) nextLines.push(...frontmatterLines({ [key]: value }));
  }
  return `---\n${nextLines.join('\n')}\n---${after}`;
}

function cleanFrontmatterRaw(raw: unknown) {
  if (typeof raw !== 'string') return null;
  if (raw.includes('\0') || /^---\s*$/m.test(raw)) return null;
  return raw.replace(/\r\n/g, '\n').replace(/\s+$/, '');
}

function frontmatterFieldsForPath(rel: string, incoming: Record<string, any>, existing: Record<string, any>, title?: string) {
  if (rel.startsWith('conteudos/')) {
    return {
      ...existing,
      ...incoming,
      title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
    };
  }
  if (rel.startsWith('relatorios/')) {
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
    `## ${entry.date} - ${entry.titulo}`,
    '',
    `- tipo: ${entry.tipo}`,
    `- escopo: ${entry.escopo || 'n/a'}`,
    `- decisao: ${entry.decisao}`,
  ];
  if (entry.evidencia) lines.push(`- evidencia: ${entry.evidencia}`);
  lines.push(`- aprovador: ${entry.aprovador || 'agent'}`);
  if (entry.aprovado_em) lines.push(`- aprovado_em: ${entry.aprovado_em}`);
  if (entry.notas) lines.push(`- notas: ${entry.notas}`);
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
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stripDuplicateReportHeading(rel: string, body: string, title: string) {
  if (!rel.startsWith('relatorios/')) return body;
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
      tipo: 'decisao',
      titulo: 'Idioma do projeto atualizado',
      escopo: '.agentic-seo/project.json',
      decisao: `Idioma canônico do projeto definido como ${nextLanguage}.`,
      evidencia: '.agentic-seo/project.json',
      aprovador: 'agent',
    });
  }
  return readProjectSettings({ projectRoot: root });
}

function readSummary(projectRoot: string, rel: string, ui: Record<string, any>): ProjectTreeItem | null {
  const { filePath } = resolveAllowedFile(projectRoot, rel);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
  const text = readFileSync(filePath, 'utf8');
  const { data: frontmatter, body } = parseFrontmatter(text);
  const title = titleFromFile(rel, frontmatter);
  const displayBody = stripDuplicateReportHeading(rel, body, title);
  return applyPageUi({
    path: rel,
    title,
    updated: frontmatter.updated || frontmatter.published_at || null,
    readOnly: rel === 'brain/log.md',
    requiresApproval: false,
    excerpt: displayBody.replace(/\s+/g, ' ').trim().slice(0, 180),
    hash: sha256(text),
  }, ui);
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
      if (!name.startsWith('.') && name.endsWith('.md') && statSync(full).isFile()) brainRels.add(rel);
    }
  }
  const orderedBrain = [...brainRels].sort((a, b) => {
    const ia = BRAIN_PAGE_ORDER.indexOf(a);
    const ib = BRAIN_PAGE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b, 'pt-BR');
  });

  const contentItems: ProjectTreeItem[] = [];
  for (const origem of CONTENT_ORIGINS) {
    const dir = join(root, 'conteudos', origem);
    for (const rel of walkMarkdown(dir).map((child) => `conteudos/${origem}/${child}`)) {
      const item = readSummary(root, rel, ui);
      if (item) contentItems.push(item);
    }
  }
  const workbenchItems = walkMarkdown(join(root, 'workbench'))
    .map((child) => readSummary(root, `workbench/${child}`, ui))
    .filter(Boolean) as ProjectTreeItem[];
  const hasFiles = orderedBrain.map((rel) => readSummary(root, rel, ui)).filter(Boolean).length + contentItems.length + workbenchItems.length > 0;
  const hasBrain = canonicalBrainExists(root);

  const sections: ProjectTreeSection[] = [
    {
      id: 'brain',
      title: 'Brain',
      items: orderedBrain.map((rel) => readSummary(root, rel, ui)).filter(Boolean) as ProjectTreeItem[],
    },
  ];
  sections.push({ id: 'conteudos', title: 'Content', items: contentItems });
  sections.push({ id: 'workbench', title: 'Workbench', items: workbenchItems });

  return {
    ok: true,
    hasFiles,
    hasBrain,
    canBootstrapBrain: !hasBrain,
    project: { root, name: projectName, icon: projectIcon },
    sections,
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
    writeFileSync(filePath, renderBrainTemplate(rel, readFileSync(source, 'utf8'), projectName), 'utf8');
    created.push(rel);
  }
  appendLogEntry(join(root, 'brain', 'log.md'), {
    date: todayIso(),
    tipo: 'decisao',
    titulo: 'Brain criado no Companion',
    escopo: created.join(', '),
    decisao: 'Arquivos canônicos do Brain criados no Companion Web.',
    evidencia: created.join(', '),
    aprovador: 'agent',
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
  const displayBody = stripDuplicateReportHeading(validation.rel, body, title);
  return {
    ok: true,
    projectRoot: root,
    path: validation.rel,
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
  const rawCandidate = validation.rel.startsWith('conteudos/') ? cleanFrontmatterRaw(frontmatterRaw) : null;
  if (rawCandidate !== null) {
    rawFrontmatter = rawCandidate;
  } else {
    const fields = frontmatterFieldsForPath(validation.rel, incomingFrontmatter, existingFrontmatter, finalTitle);
    const textWithFrontmatter = setFrontmatterFields(current, fields);
    rawFrontmatter = parseFrontmatter(textWithFrontmatter).raw;
  }
  const finalText = `---\n${rawFrontmatter}\n---\n\n${body.replace(/^\n+/, '').replace(/\s*$/, '\n')}`;
  writeFileSync(filePath, finalText, 'utf8');
  const uiSaved = hasUiChange ? savePageUi(root, validation.rel, ui || {}) : false;

  if (validation.rel.startsWith('brain/') || validation.rel.startsWith('relatorios/')) {
    const today = todayIso();
    const isReport = validation.rel.startsWith('relatorios/');
    appendLogEntry(join(root, 'brain', 'log.md'), {
      date: today,
      tipo: 'decisao',
      titulo: isReport ? 'Relatório editado no Companion' : `${basename(validation.rel, '.md')} editado no Companion`,
      escopo: validation.rel,
      decisao: `${isReport ? 'Relatório' : validation.rel} editado no Companion Web${approverClean ? ` por ${approverClean}` : ''}.`,
      evidencia: validation.rel,
      aprovador: approverClean || 'agent',
      aprovado_em: null,
      notas: notes ? String(notes).trim() : null,
    });
  }

  const next = readFileSync(filePath, 'utf8');
  return {
    ok: true,
    path: validation.rel,
    title: finalTitle,
    updated: todayIso(),
    hash: sha256(next),
    requiresApproval: false,
    uiSaved,
    logAppended: validation.rel.startsWith('brain/') || validation.rel.startsWith('relatorios/'),
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
}: {
  projectRoot?: string;
  kind?: 'workbench' | 'content';
  title?: string;
}) {
  const root = normalizeProjectRoot(projectRoot);
  const slug = slugFromTitle(title);
  const rel =
    kind === 'content'
      ? uniqueRel(root, `conteudos/outros/${slug}.md`)
      : uniqueRel(root, `workbench/companion/${slug}.md`);
  const validation = validateProjectFileRel(rel, { write: true });
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { filePath } = resolveAllowedFile(root, validation.rel);
  mkdirSync(dirname(filePath), { recursive: true });
  const today = todayIso();
  const text =
    kind === 'content'
      ? `---\ntitle: ${yamlString(title)}\nslug: ${yamlString(basename(rel, '.md'))}\npublished_at: ""\nsource_url: ""\norigem: "outros"\narea: ""\n---\n\n`
      : `---\ntitle: ${yamlString(title)}\nupdated: ${yamlString(today)}\n---\n\n`;
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
  if (validation.rel.startsWith('relatorios/')) return { ok: false, reason: 'report-delete-not-allowed' };
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
  renameSync(filePath, absoluteTrash);
  deletePageUi(root, validation.rel);

  if (validation.rel.startsWith('brain/')) {
    appendLogEntry(join(root, 'brain', 'log.md'), {
      date: todayIso(),
      tipo: 'decisao',
      titulo: `${basename(validation.rel, '.md')} movido para lixeira`,
      escopo: validation.rel,
      decisao: `${validation.rel} movido para a lixeira do Companion Web.`,
      evidencia: trashPath,
      aprovador: 'agent',
    });
  }

  return { ok: true, path: validation.rel, trashPath };
}

export function readProjectLog({ projectRoot }: { projectRoot?: string }) {
  const file = readProjectFile({ projectRoot, fileRel: 'brain/log.md' });
  if (!file.ok) return file;
  const entries = [];
  const blocks = String(file.body || '').split(/^## /m).slice(1);
  for (const block of blocks) {
    const heading = block.split(/\r?\n/, 1)[0].trim();
    if (!heading) continue;
    const tipo = block.match(/^- tipo:\s*(.+)$/m)?.[1]?.trim() || '';
    const escopo = block.match(/^- escopo:\s*(.+)$/m)?.[1]?.trim() || '';
    const decisao = block.match(/^- decisao:\s*(.+)$/m)?.[1]?.trim() || '';
    const aprovador = block.match(/^- aprovador:\s*(.+)$/m)?.[1]?.trim() || '';
    const aprovadoEm = block.match(/^- aprovado_em:\s*(.+)$/m)?.[1]?.trim() || '';
    entries.push({ heading, tipo, escopo, decisao, aprovador, aprovadoEm });
  }
  return { ...file, entries };
}
