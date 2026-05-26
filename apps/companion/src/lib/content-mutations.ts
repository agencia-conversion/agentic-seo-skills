import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const ORIGEMS = ['blog', 'linkedin', 'podcast', 'outros'] as const;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ContentLocation {
  filePath: string;
  relPath: string;
  origem: string;
  slug: string;
}

export interface ContentOption {
  slug: string;
  title: string;
  origem: string;
  path: string;
}

function slugify(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function parseContent(text: string): { fm: Record<string, any>; body: string } {
  const match = text.match(FM_RE);
  if (!match) return { fm: {}, body: text };
  try {
    const parsed = parseYaml(match[1]);
    return {
      fm: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {},
      body: match[2] || '',
    };
  } catch {
    return { fm: {}, body: match[2] || '' };
  }
}

function writeContent(filePath: string, fm: Record<string, any>, body: string) {
  const yaml = stringifyYaml(fm, { lineWidth: 0 }).trimEnd();
  writeFileSync(filePath, `---\n${yaml}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`, 'utf8');
}

export function findContentBySlug(projectRoot: string, contentSlug: string): ContentLocation | null {
  const root = resolve(projectRoot);
  const target = slugify(contentSlug);
  if (!target) return null;
  for (const origem of ORIGEMS) {
    const dir = join(root, 'conteudos', origem);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const filePath = join(dir, name);
      let fm: Record<string, any> = {};
      try {
        fm = parseContent(readFileSync(filePath, 'utf8')).fm;
      } catch {
        fm = {};
      }
      const slug = slugify(fm.slug || basename(name, '.md'));
      if (slug === target) {
        return {
          filePath,
          relPath: relative(root, filePath).split(sep).join('/'),
          origem,
          slug,
        };
      }
    }
  }
  return null;
}

export function listContentOptions(projectRoot: string): ContentOption[] {
  const root = resolve(projectRoot);
  const out: ContentOption[] = [];
  for (const origem of ORIGEMS) {
    const dir = join(root, 'conteudos', origem);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const filePath = join(dir, name);
      try {
        if (!statSync(filePath).isFile()) continue;
        const { fm } = parseContent(readFileSync(filePath, 'utf8'));
        const slug = slugify(fm.slug || basename(name, '.md'));
        if (!slug) continue;
        out.push({
          slug,
          title: String(fm.title || slug),
          origem,
          path: relative(root, filePath).split(sep).join('/'),
        });
      } catch {
        // Ignore malformed content files; the selector should remain usable.
      }
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

export function updateContentMetadata(
  projectRoot: string,
  contentSlug: string,
  updates: Record<string, unknown>,
): { ok: true; path: string; frontmatter: Record<string, any> } | { ok: false; reason: string } {
  const located = findContentBySlug(projectRoot, contentSlug);
  if (!located) return { ok: false, reason: 'content-not-found' };
  const parsed = parseContent(readFileSync(located.filePath, 'utf8'));
  const next = { ...parsed.fm };
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'volume') {
      const raw = String(value ?? '').trim();
      if (!raw) {
        delete next.volume;
        continue;
      }
      const numeric = Number(raw.replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(numeric) || numeric < 0) return { ok: false, reason: 'invalid-volume' };
      next.volume = Math.round(numeric);
      continue;
    }
    if (key === 'title') {
      const normalized = String(value ?? '').trim();
      if (!normalized) return { ok: false, reason: 'invalid-title' };
      next.title = normalized;
      continue;
    }
    if (key === 'keyword' || key === 'intent') {
      const normalized = String(value ?? '').trim();
      if (normalized) next[key] = normalized;
      else delete next[key];
      continue;
    }
    return { ok: false, reason: `unsupported-field:${key}` };
  }
  writeContent(located.filePath, next, parsed.body);
  return { ok: true, path: located.relPath, frontmatter: next };
}

export function updateContentClusterMembership(
  projectRoot: string,
  contentSlug: string,
  clusterSlug: string,
  role: 'pilar' | 'satelite' | null,
): { ok: true; path: string; frontmatter: Record<string, any> } | { ok: false; reason: string } {
  const located = findContentBySlug(projectRoot, contentSlug);
  if (!located) return { ok: false, reason: 'content-not-found' };
  const parsed = parseContent(readFileSync(located.filePath, 'utf8'));
  const next = { ...parsed.fm };
  const clusters = Array.isArray(next.clusters)
    ? (next.clusters as unknown[]).map(String).filter(Boolean)
    : [];
  if (role === null) {
    next.clusters = clusters.filter((slug) => slug !== clusterSlug);
  } else if (!clusters.includes(clusterSlug)) {
    next.clusters = [...clusters, clusterSlug];
  } else {
    next.clusters = clusters;
  }
  const papel = next.papel && typeof next.papel === 'object' && !Array.isArray(next.papel)
    ? { ...(next.papel as Record<string, unknown>) }
    : {};
  if (role === null) delete papel[clusterSlug];
  else papel[clusterSlug] = role;
  if (Object.keys(papel).length > 0) next.papel = papel;
  else delete next.papel;
  writeContent(located.filePath, next, parsed.body);
  return { ok: true, path: located.relPath, frontmatter: next };
}
