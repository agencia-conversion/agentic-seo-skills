import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parseFrontmatter } from './project-files';

const SCAN_ROOTS = ['brain', 'conteudos', 'workbench', 'relatorios'] as const;
const INLINE_TAG_RE = /(?:^|\s)#([a-z0-9][a-z0-9-_/]*)/gi;
const TAG_NORMALIZER = /[^a-z0-9-_/]/g;

export interface TagFileRef {
  path: string;
  title: string;
  source: 'frontmatter' | 'inline' | 'both';
}

export interface TagSummary {
  tag: string;
  count: number;
  files: TagFileRef[];
}

export interface TagIndex {
  total: number;
  tags: TagSummary[];
}

function normalizeRoot(projectRoot?: string | null) {
  return resolve(projectRoot || process.env.AGENTIC_SEO_PROJECT_ROOT || 'project');
}

function safeWalk(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(current);
  } catch {
    return [];
  }
  for (const name of entries.sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    let lst;
    try {
      lst = lstatSync(full);
    } catch {
      continue;
    }
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...safeWalk(root, full));
    else if (st.isFile() && name.endsWith('.md')) {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out;
}

function listProjectFiles(root: string): string[] {
  const out: string[] = [];
  for (const dir of SCAN_ROOTS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    try {
      const realAbs = realpathSync(abs);
      const realRoot = realpathSync(root);
      if (!realAbs.startsWith(realRoot)) continue;
    } catch {
      continue;
    }
    out.push(...safeWalk(abs).map((rel) => `${dir}/${rel}`));
  }
  return out;
}

function normalizeTag(raw: string): string | null {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(TAG_NORMALIZER, '')
    .replace(/^-+|-+$/g, '');
  return cleaned || null;
}

export function extractFrontmatterTags(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => normalizeTag(String(v))).filter((v): v is string => !!v);
  }
  const str = String(value).trim();
  if (!str) return [];
  // Handle inline array form: "[a, b, c]"
  const arrayMatch = str.match(/^\[(.*)\]$/);
  if (arrayMatch) {
    return arrayMatch[1]
      .split(',')
      .map((v) => normalizeTag(v.replace(/^["']|["']$/g, '').trim()))
      .filter((v): v is string => !!v);
  }
  // Comma-separated form: "a, b, c"
  if (str.includes(',')) {
    return str
      .split(',')
      .map((v) => normalizeTag(v.trim()))
      .filter((v): v is string => !!v);
  }
  // Single tag
  const single = normalizeTag(str);
  return single ? [single] : [];
}

export function extractInlineTags(body: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s/.test(line)) continue; // skip markdown headings, not tags
    INLINE_TAG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INLINE_TAG_RE.exec(line)) !== null) {
      const tag = normalizeTag(m[1]);
      if (tag) out.push(tag);
    }
  }
  return out;
}

function titleFromFrontmatterOrPath(frontmatter: Record<string, any>, rel: string): string {
  const title = String(frontmatter.title || '').replace(/^["']|["']$/g, '').trim();
  if (title) return title;
  return rel
    .split('/')
    .pop()!
    .replace(/\.md$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildTagIndex(projectRoot?: string | null): TagIndex {
  const root = normalizeRoot(projectRoot);
  const files = listProjectFiles(root);
  const tagMap = new Map<string, Map<string, TagFileRef>>();

  for (const rel of files) {
    const abs = join(root, rel);
    let raw: string;
    try {
      raw = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const { data: frontmatter, body } = parseFrontmatter(raw);
    const fmTags = extractFrontmatterTags(frontmatter.tags);
    const inlineTags = extractInlineTags(body);
    const title = titleFromFrontmatterOrPath(frontmatter, rel);

    const fmSet = new Set(fmTags);
    const inlineSet = new Set(inlineTags);
    const all = new Set([...fmSet, ...inlineSet]);

    for (const tag of all) {
      const source: TagFileRef['source'] =
        fmSet.has(tag) && inlineSet.has(tag)
          ? 'both'
          : fmSet.has(tag)
            ? 'frontmatter'
            : 'inline';
      const fileEntries = tagMap.get(tag) || new Map<string, TagFileRef>();
      const existing = fileEntries.get(rel);
      if (existing) {
        if (existing.source !== source && existing.source !== 'both') {
          existing.source = 'both';
        }
      } else {
        fileEntries.set(rel, { path: rel, title, source });
      }
      tagMap.set(tag, fileEntries);
    }
  }

  const tags: TagSummary[] = [];
  for (const [tag, fileEntries] of tagMap) {
    const fileList = Array.from(fileEntries.values()).sort((a, b) =>
      a.path.localeCompare(b.path, 'pt-BR')
    );
    tags.push({ tag, count: fileList.length, files: fileList });
  }
  tags.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'pt-BR'));

  return {
    total: tags.length,
    tags,
  };
}
