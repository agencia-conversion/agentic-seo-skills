import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { silenceWrite } from './auto-block-watcher';
import { findContentBySlug } from './content-mutations';

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const TRASH_DIR_NAME = 'Trash';

function pad2(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function trashStamp(now: Date = new Date()) {
  return [
    now.getFullYear(),
    pad2(now.getMonth() + 1),
    pad2(now.getDate()),
    '-',
    pad2(now.getHours()),
    pad2(now.getMinutes()),
    pad2(now.getSeconds()),
  ].join('');
}

function parseContent(text: string): { fm: Record<string, unknown>; body: string } {
  const match = text.match(FM_RE);
  if (!match) return { fm: {}, body: text };
  try {
    const parsed = parseYaml(match[1]);
    return {
      fm: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {},
      body: match[2] || '',
    };
  } catch {
    return { fm: {}, body: match[2] || '' };
  }
}

function uniqueTrashFile(trashDir: string, baseName: string) {
  let candidate = join(trashDir, `${baseName}.md`);
  let i = 2;
  while (existsSync(candidate)) {
    candidate = join(trashDir, `${baseName}-${i}.md`);
    i += 1;
  }
  return candidate;
}

export interface TrashResult {
  ok: true;
  slug: string;
  origin: string;
  originalPath: string;
  trashedPath: string;
}

export interface TrashFailure {
  ok: false;
  reason: string;
}

// Moves a published content from contents/<origin>/<slug>.md to
// project/Trash/<YYYY-MM-DD-HHMMSS>-<origin>-<slug>.md so the file can be
// recovered later. Stores trashed_from + trashed_at in the frontmatter for
// transparent restore (manual or via scripts/restore-from-trash.mjs).
export function trashContent(projectRoot: string, contentSlug: string): TrashResult | TrashFailure {
  const located = findContentBySlug(projectRoot, contentSlug);
  if (!located) return { ok: false, reason: 'content-not-found' };
  const absRoot = resolve(projectRoot);
  const trashDir = join(absRoot, TRASH_DIR_NAME);
  mkdirSync(trashDir, { recursive: true });
  const stamp = trashStamp();
  const trashFile = uniqueTrashFile(trashDir, `${stamp}-${located.origin}-${located.slug}`);
  const text = readFileSync(located.filePath, 'utf8');
  const { fm, body } = parseContent(text);
  const enriched = {
    ...fm,
    trashed_from: located.relPath,
    trashed_at: new Date().toISOString(),
  };
  const yaml = stringifyYaml(enriched, { lineWidth: 0 }).trimEnd();
  const final = `---\n${yaml}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
  // Write the enriched copy into Trash first so a crash mid-flight never
  // loses content. Only after the copy is on disk do we remove the source.
  silenceWrite(trashFile);
  writeFileSync(trashFile, final, 'utf8');
  silenceWrite(located.filePath);
  unlinkSync(located.filePath);
  const trashedRel = `${TRASH_DIR_NAME}/${stamp}-${located.origin}-${located.slug}.md`;
  return {
    ok: true,
    slug: located.slug,
    origin: located.origin,
    originalPath: located.relPath,
    trashedPath: trashedRel,
  };
}

export interface DuplicateResult {
  ok: true;
  newSlug: string;
  newPath: string;
}

export interface DuplicateFailure {
  ok: false;
  reason: string;
}

// Duplicates a published content. The new file lives next to the original
// (same origin) with slug `<slug>-copia[-N]` so the canonical slug stays
// available for the source. Title gets " (cópia)" appended once. Cluster
// affiliation is preserved verbatim.
export function duplicateContent(projectRoot: string, contentSlug: string): DuplicateResult | DuplicateFailure {
  const located = findContentBySlug(projectRoot, contentSlug);
  if (!located) return { ok: false, reason: 'content-not-found' };
  const dir = dirname(located.filePath);
  let suffix = 'copia';
  let newSlug = `${located.slug}-${suffix}`;
  let candidate = join(dir, `${newSlug}.md`);
  let i = 2;
  while (existsSync(candidate)) {
    suffix = `copia-${i}`;
    newSlug = `${located.slug}-${suffix}`;
    candidate = join(dir, `${newSlug}.md`);
    i += 1;
  }
  const text = readFileSync(located.filePath, 'utf8');
  const { fm, body } = parseContent(text);
  const nextTitle = typeof fm.title === 'string' ? `${fm.title} (cópia)` : `${located.slug} (cópia)`;
  const next = { ...fm, title: nextTitle, slug: newSlug };
  const yaml = stringifyYaml(next, { lineWidth: 0 }).trimEnd();
  const final = `---\n${yaml}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
  silenceWrite(candidate);
  writeFileSync(candidate, final, 'utf8');
  return {
    ok: true,
    newSlug,
    newPath: `contents/${located.origin}/${newSlug}.md`,
  };
}
