import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import YAML from 'yaml';
import { parseFrontmatter } from './project-files';

const SCAN_ROOTS = ['brain', 'conteudos', 'workbench', 'relatorios'] as const;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 25;

export type QueryRender = 'table' | 'list';
export type SortDir = 'asc' | 'desc';

export interface AgenticQuery {
  version?: number;
  from?: string;
  where?: Record<string, string | string[]>;
  sort?: string;
  limit?: number;
  columns?: string[];
  render?: QueryRender;
}

export interface QueryResultItem {
  path: string;
  title: string;
  frontmatter: Record<string, any>;
  excerpt: string;
}

export interface QueryResult {
  ok: boolean;
  query: AgenticQuery;
  total: number;
  limited: boolean;
  render: QueryRender;
  columns: string[];
  items: QueryResultItem[];
  errors?: string[];
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

function listFilesUnder(root: string, fromPath: string): string[] {
  const cleanFrom = fromPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleanFrom) {
    const out: string[] = [];
    for (const dir of SCAN_ROOTS) {
      const abs = join(root, dir);
      if (!existsSync(abs)) continue;
      out.push(...safeWalk(abs).map((rel) => `${dir}/${rel}`));
    }
    return out;
  }
  const parts = cleanFrom.split('/');
  const topLevel = parts[0] as (typeof SCAN_ROOTS)[number];
  if (!(SCAN_ROOTS as readonly string[]).includes(topLevel)) return [];
  const abs = join(root, ...parts);
  if (!existsSync(abs)) return [];
  try {
    const realAbs = realpathSync(abs);
    const realRoot = realpathSync(root);
    if (!realAbs.startsWith(realRoot)) return [];
  } catch {
    return [];
  }
  return safeWalk(abs).map((rel) => `${cleanFrom}/${rel}`);
}

export function parseQuerySource(source: string): { query: AgenticQuery; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = YAML.parse(source);
  } catch (err) {
    errors.push(`Invalid YAML: ${(err as Error).message}`);
    return { query: {}, errors };
  }
  if (!parsed || typeof parsed !== 'object') {
    errors.push('Query body must be a YAML object.');
    return { query: {}, errors };
  }
  const obj = parsed as Record<string, unknown>;
  const query: AgenticQuery = {};
  if (typeof obj.version === 'number') query.version = obj.version;
  if (typeof obj.from === 'string') query.from = obj.from.trim();
  if (obj.where && typeof obj.where === 'object' && !Array.isArray(obj.where)) {
    const where: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(obj.where as Record<string, unknown>)) {
      if (Array.isArray(v)) where[k] = v.map(String);
      else where[k] = String(v);
    }
    query.where = where;
  }
  if (typeof obj.sort === 'string') query.sort = obj.sort.trim();
  if (typeof obj.limit === 'number') query.limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(obj.limit)));
  if (Array.isArray(obj.columns)) query.columns = obj.columns.map(String);
  if (obj.render === 'table' || obj.render === 'list') query.render = obj.render;
  return { query, errors };
}

function matchesWhere(frontmatter: Record<string, any>, where: Record<string, string | string[]>): boolean {
  for (const [key, expected] of Object.entries(where)) {
    const actual = frontmatter[key];
    if (Array.isArray(expected)) {
      if (!expected.some((value) => matchesSingle(actual, value))) return false;
      continue;
    }
    if (!matchesSingle(actual, expected)) return false;
  }
  return true;
}

function matchesSingle(actual: unknown, expected: string): boolean {
  // Negation: prefix with !
  if (expected.startsWith('!')) {
    const positive = expected.slice(1);
    return !valueEquals(actual, positive);
  }
  return valueEquals(actual, expected);
}

function valueEquals(actual: unknown, expected: string): boolean {
  if (actual == null) return expected === '';
  if (Array.isArray(actual)) return actual.map(String).includes(expected);
  return String(actual) === expected;
}

function applySort(items: QueryResultItem[], sort: string): QueryResultItem[] {
  const match = sort.match(/^([\w_-]+)(?:\s+(asc|desc))?$/i);
  if (!match) return items;
  const field = match[1];
  const dir: SortDir = (match[2]?.toLowerCase() as SortDir) || 'asc';
  return [...items].sort((a, b) => {
    const av = String(a.frontmatter[field] ?? '');
    const bv = String(b.frontmatter[field] ?? '');
    const cmp = av.localeCompare(bv, 'pt-BR');
    return dir === 'desc' ? -cmp : cmp;
  });
}

function defaultColumns(items: QueryResultItem[]): string[] {
  const seen = new Set<string>(['title']);
  for (const item of items.slice(0, 5)) {
    for (const key of Object.keys(item.frontmatter)) seen.add(key);
  }
  return ['title', ...Array.from(seen).filter((k) => k !== 'title').slice(0, 4)];
}

export function executeQuery(source: string, projectRoot?: string | null): QueryResult {
  const { query, errors } = parseQuerySource(source);
  if (errors.length) {
    return {
      ok: false,
      query,
      total: 0,
      limited: false,
      render: query.render || 'table',
      columns: query.columns || [],
      items: [],
      errors,
    };
  }

  const root = normalizeRoot(projectRoot);
  const files = listFilesUnder(root, query.from || '');
  const items: QueryResultItem[] = [];
  for (const rel of files) {
    const abs = join(root, rel);
    let raw: string;
    try {
      raw = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const { data: frontmatter, body } = parseFrontmatter(raw);
    if (query.where && !matchesWhere(frontmatter, query.where)) continue;
    items.push({
      path: rel,
      title:
        String(frontmatter.title || '').replace(/^["']|["']$/g, '').trim() ||
        rel.split('/').pop()!.replace(/\.md$/, ''),
      frontmatter,
      excerpt: body.replace(/\s+/g, ' ').trim().slice(0, 140),
    });
  }

  const sorted = query.sort ? applySort(items, query.sort) : items;
  const limit = query.limit || DEFAULT_LIMIT;
  const limited = sorted.length > limit;
  const final = sorted.slice(0, limit);

  return {
    ok: true,
    query,
    total: sorted.length,
    limited,
    render: query.render || 'table',
    columns: query.columns?.length ? query.columns : defaultColumns(final),
    items: final,
  };
}
