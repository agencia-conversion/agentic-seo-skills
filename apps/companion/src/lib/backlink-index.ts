import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { REPORT_DIR_NAME } from '../../../../shared/report-modules';

const SCAN_ROOTS = ['brain', 'conteudos', 'workbench', REPORT_DIR_NAME] as const;
const CONTEXT_CHARS = 80;
const WIKILINK_RE = /(!)?\[\[([^\]\n]+?)\]\]/g;
const MD_LINK_RE = /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export type LinkKind = 'wikilink' | 'embed' | 'markdown';

export interface BacklinkSource {
  source: string;
  line: number;
  context: string;
  type: LinkKind;
  alias: string | null;
  anchor: string | null;
}

export interface OutgoingLink {
  source: string;
  rawTarget: string;
  resolved: string | null;
  line: number;
  type: LinkKind;
  alias: string | null;
  anchor: string | null;
}

export interface BrokenLink {
  source: string;
  rawTarget: string;
  line: number;
  type: LinkKind;
}

export interface BacklinkIndex {
  files: Set<string>;
  backlinks: Map<string, BacklinkSource[]>;
  outgoing: Map<string, OutgoingLink[]>;
  broken: BrokenLink[];
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

function stripFrontmatter(text: string): { body: string; lineOffset: number } {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { body: text, lineOffset: 0 };
  }
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { body: text, lineOffset: 0 };
  const after = text.slice(end + 4).replace(/^\r?\n/, '');
  const fmText = text.slice(0, end + 4);
  const lineOffset = fmText.split('\n').length;
  return { body: after, lineOffset };
}

function splitTarget(raw: string): { target: string; anchor: string | null; alias: string | null } {
  let target = raw.trim();
  let alias: string | null = null;
  const pipeIdx = target.indexOf('|');
  if (pipeIdx !== -1) {
    alias = target.slice(pipeIdx + 1).trim() || null;
    target = target.slice(0, pipeIdx).trim();
  }
  let anchor: string | null = null;
  const hashIdx = target.indexOf('#');
  if (hashIdx !== -1) {
    anchor = target.slice(hashIdx + 1).trim() || null;
    target = target.slice(0, hashIdx).trim();
  }
  return { target, anchor, alias };
}

function isExternalUrl(href: string) {
  return /^(?:https?:|mailto:|tel:|ftp:|#)/i.test(href);
}

function contextSnippet(line: string, matchIndex: number, matchLength: number) {
  const start = Math.max(0, matchIndex - CONTEXT_CHARS);
  const end = Math.min(line.length, matchIndex + matchLength + CONTEXT_CHARS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < line.length ? '…' : '';
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}

export function resolveWikilinkTarget(
  rawTarget: string,
  sourceRel: string,
  fileSet: Set<string>
): string | null {
  const candidate = rawTarget.trim();
  if (!candidate) return null;
  const withExt = candidate.endsWith('.md') ? candidate : `${candidate}.md`;

  // 1. Brain-first: if source is in brain/, try brain/{name}.md
  if (sourceRel.startsWith('brain/')) {
    const brainCandidate = candidate.includes('/') ? withExt : `brain/${withExt}`;
    if (fileSet.has(brainCandidate)) return brainCandidate;
  }

  // 2. Try exact match (handles "brain/voz" or "conteudos/blog/post")
  if (fileSet.has(withExt)) return withExt;
  if (fileSet.has(candidate)) return candidate;

  // 3. Try resolving relative to source file directory
  if (candidate.includes('/') || candidate.startsWith('.')) {
    const sourceDir = dirname(sourceRel);
    const resolved = join(sourceDir, withExt).split(sep).join('/');
    if (fileSet.has(resolved)) return resolved;
  }

  // 4. Fallback: brain match for non-brain sources too
  const brainFallback = candidate.includes('/') ? withExt : `brain/${withExt}`;
  if (fileSet.has(brainFallback)) return brainFallback;

  // 5. Basename match across all files (Obsidian-style global wikilink resolution)
  const baseLower = withExt.split('/').pop()!.toLowerCase();
  for (const file of fileSet) {
    if (file.split('/').pop()!.toLowerCase() === baseLower) return file;
  }

  return null;
}

export function resolveMarkdownLinkTarget(
  rawHref: string,
  sourceRel: string,
  fileSet: Set<string>
): string | null {
  if (isExternalUrl(rawHref)) return null;
  const cleanHref = rawHref.split('#')[0].split('?')[0];
  if (!cleanHref.endsWith('.md')) return null;
  const sourceDir = dirname(sourceRel);
  const resolved = join(sourceDir, cleanHref).split(sep).join('/').replace(/^\.\//, '');
  if (fileSet.has(resolved)) return resolved;
  if (fileSet.has(cleanHref)) return cleanHref;
  return null;
}

interface ParsedLink {
  type: LinkKind;
  rawTarget: string;
  alias: string | null;
  anchor: string | null;
  matchIndex: number;
  matchLength: number;
}

function parseLinksInLine(line: string): ParsedLink[] {
  const out: ParsedLink[] = [];
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(line)) !== null) {
    const embed = m[1] === '!';
    const { target, anchor, alias } = splitTarget(m[2]);
    if (!target) continue;
    out.push({
      type: embed ? 'embed' : 'wikilink',
      rawTarget: target,
      alias,
      anchor,
      matchIndex: m.index,
      matchLength: m[0].length,
    });
  }
  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(line)) !== null) {
    const alias = m[1].trim() || null;
    const href = m[2].trim();
    if (!href) continue;
    const anchor = href.includes('#') ? href.slice(href.indexOf('#') + 1) || null : null;
    out.push({
      type: 'markdown',
      rawTarget: href,
      alias,
      anchor,
      matchIndex: m.index,
      matchLength: m[0].length,
    });
  }
  out.sort((a, b) => a.matchIndex - b.matchIndex);
  return out;
}

function parseFile(
  root: string,
  rel: string,
  fileSet: Set<string>
): { outgoing: OutgoingLink[]; broken: BrokenLink[] } {
  const abs = join(root, rel);
  let raw: string;
  try {
    raw = readFileSync(abs, 'utf8');
  } catch {
    return { outgoing: [], broken: [] };
  }
  const { body, lineOffset } = stripFrontmatter(raw);
  const lines = body.split('\n');
  const outgoing: OutgoingLink[] = [];
  const broken: BrokenLink[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const links = parseLinksInLine(line);
    for (const link of links) {
      const resolved =
        link.type === 'markdown'
          ? resolveMarkdownLinkTarget(link.rawTarget, rel, fileSet)
          : resolveWikilinkTarget(link.rawTarget, rel, fileSet);
      // Skip external markdown URLs entirely (resolved = null AND not a .md path).
      if (link.type === 'markdown' && isExternalUrl(link.rawTarget)) continue;
      outgoing.push({
        source: rel,
        rawTarget: link.rawTarget,
        resolved,
        line: lineOffset + i + 1,
        type: link.type,
        alias: link.alias,
        anchor: link.anchor,
      });
      if (!resolved) {
        // Only flag wikilink/embed as broken; markdown links may legitimately point outside the project.
        if (link.type !== 'markdown') {
          broken.push({
            source: rel,
            rawTarget: link.rawTarget,
            line: lineOffset + i + 1,
            type: link.type,
          });
        } else if (link.rawTarget.endsWith('.md')) {
          broken.push({
            source: rel,
            rawTarget: link.rawTarget,
            line: lineOffset + i + 1,
            type: link.type,
          });
        }
      }
    }
  }
  return { outgoing, broken };
}

function buildContexts(
  root: string,
  outgoing: Map<string, OutgoingLink[]>
): Map<string, BacklinkSource[]> {
  const backlinks = new Map<string, BacklinkSource[]>();
  for (const [source, links] of outgoing) {
    const abs = join(root, source);
    let bodyLines: string[] = [];
    try {
      const raw = readFileSync(abs, 'utf8');
      const { body } = stripFrontmatter(raw);
      bodyLines = body.split('\n');
    } catch {
      continue;
    }
    const fmOffset = (readFileSync(abs, 'utf8').split('\n').length) - bodyLines.length;
    for (const link of links) {
      if (!link.resolved) continue;
      const lineIdx = link.line - 1 - fmOffset;
      const lineText = bodyLines[lineIdx] ?? '';
      const matches = parseLinksInLine(lineText);
      const matchedLink = matches.find(
        (m) => m.rawTarget === link.rawTarget && m.type === link.type
      );
      const context = matchedLink
        ? contextSnippet(lineText, matchedLink.matchIndex, matchedLink.matchLength)
        : lineText.trim().slice(0, CONTEXT_CHARS * 2);
      const arr = backlinks.get(link.resolved) || [];
      arr.push({
        source,
        line: link.line,
        context,
        type: link.type,
        alias: link.alias,
        anchor: link.anchor,
      });
      backlinks.set(link.resolved, arr);
    }
  }
  return backlinks;
}

export function buildBacklinkIndex(projectRoot?: string | null): BacklinkIndex {
  const root = normalizeRoot(projectRoot);
  const files = listProjectFiles(root);
  const fileSet = new Set(files);
  const outgoing = new Map<string, OutgoingLink[]>();
  const broken: BrokenLink[] = [];
  for (const rel of files) {
    const parsed = parseFile(root, rel, fileSet);
    if (parsed.outgoing.length) outgoing.set(rel, parsed.outgoing);
    broken.push(...parsed.broken);
  }
  const backlinks = buildContexts(root, outgoing);
  return { files: fileSet, backlinks, outgoing, broken };
}

export function invalidateFile(
  index: BacklinkIndex,
  projectRoot: string | null | undefined,
  rel: string
): BacklinkIndex {
  const root = normalizeRoot(projectRoot);
  const files = listProjectFiles(root);
  const fileSet = new Set(files);
  const nextOutgoing = new Map<string, OutgoingLink[]>();
  // Remove targets pointing to old version of this file from backlinks; we will recompute.
  for (const [src, links] of index.outgoing) {
    if (src === rel) continue;
    nextOutgoing.set(src, links);
  }
  const nextBroken = index.broken.filter((b) => b.source !== rel);
  if (fileSet.has(rel)) {
    const parsed = parseFile(root, rel, fileSet);
    if (parsed.outgoing.length) nextOutgoing.set(rel, parsed.outgoing);
    nextBroken.push(...parsed.broken);
  }
  // Reparse every file that might link to or from a changed path (cheap: full rebuild on files that touch rel).
  for (const src of fileSet) {
    if (src === rel) continue;
    const links = nextOutgoing.get(src);
    if (!links || links.some((l) => l.rawTarget.includes(rel.split('/').pop()!.replace(/\.md$/, '')))) {
      const reparsed = parseFile(root, src, fileSet);
      if (reparsed.outgoing.length) nextOutgoing.set(src, reparsed.outgoing);
      else nextOutgoing.delete(src);
      // Replace broken entries for this source.
      const filtered = nextBroken.filter((b) => b.source !== src);
      filtered.push(...reparsed.broken);
      nextBroken.length = 0;
      nextBroken.push(...filtered);
    }
  }
  return {
    files: fileSet,
    backlinks: buildContexts(root, nextOutgoing),
    outgoing: nextOutgoing,
    broken: nextBroken,
  };
}

export function backlinksFor(index: BacklinkIndex, targetRel: string): BacklinkSource[] {
  return [...(index.backlinks.get(targetRel) || [])].sort(
    (a, b) => a.source.localeCompare(b.source, 'pt-BR') || a.line - b.line
  );
}

export function outgoingFor(index: BacklinkIndex, sourceRel: string): OutgoingLink[] {
  return [...(index.outgoing.get(sourceRel) || [])].sort((a, b) => a.line - b.line);
}

export function brokenList(index: BacklinkIndex): BrokenLink[] {
  return [...index.broken].sort(
    (a, b) => a.source.localeCompare(b.source, 'pt-BR') || a.line - b.line
  );
}
