import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

export interface SourceResult {
  ok: true;
  body: Buffer;
  contentType: string;
}

export type SourceError =
  | { ok: false; status: 400; reason: 'missing-path' }
  | { ok: false; status: 403; reason: 'invalid-path' | 'not-a-source' | 'unsupported-extension' | 'outside-project' }
  | { ok: false; status: 404; reason: 'not-found' }
  | { ok: false; status: 413; reason: 'too-large' };

export function readProjectSource(projectRoot: string, requested: string | null): SourceResult | SourceError {
  if (!requested) return { ok: false, status: 400, reason: 'missing-path' };
  const trimmed = requested.replace(/^\/+/, '');
  if (!trimmed) return { ok: false, status: 400, reason: 'missing-path' };
  if (trimmed.includes('..') || trimmed.includes('\0')) {
    return { ok: false, status: 403, reason: 'invalid-path' };
  }
  if (!trimmed.startsWith('sources/')) {
    return { ok: false, status: 403, reason: 'not-a-source' };
  }
  const normalized = normalize(trimmed);
  if (normalized.startsWith('..') || normalized.includes(`${sep}..${sep}`)) {
    return { ok: false, status: 403, reason: 'invalid-path' };
  }
  const ext = (normalized.match(/\.[^./\\]+$/) || [''])[0].toLowerCase();
  const contentType = ALLOWED_EXT[ext];
  if (!contentType) return { ok: false, status: 403, reason: 'unsupported-extension' };
  const root = resolve(projectRoot);
  const target = resolve(join(root, normalized));
  if (!target.startsWith(root + sep) && target !== root) {
    return { ok: false, status: 403, reason: 'outside-project' };
  }
  if (!existsSync(target)) return { ok: false, status: 404, reason: 'not-found' };
  const stats = statSync(target);
  if (!stats.isFile()) return { ok: false, status: 404, reason: 'not-found' };
  if (stats.size > MAX_BYTES) return { ok: false, status: 413, reason: 'too-large' };
  return { ok: true, body: readFileSync(target), contentType };
}

export const SOURCE_CSP =
  "sandbox; default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline' https: data:; font-src data: https:; frame-ancestors 'self'";
