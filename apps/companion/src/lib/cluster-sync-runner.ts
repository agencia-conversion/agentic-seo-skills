import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

function findPluginRoot(): string | null {
  const candidates = [
    process.env.AGENTIC_SEO_PLUGIN_ROOT,
    process.env.SEO_BRAIN_PLUGIN_ROOT,
    resolve(process.cwd(), '..', '..'),
    process.cwd(),
  ].filter((p): p is string => Boolean(p));
  for (const p of candidates) {
    if (existsSync(join(p, 'scripts', 'cluster-sync.mjs'))) return p;
  }
  return null;
}

function inferAffectedClusterSlug(fileRel: string): string | undefined {
  const m = fileRel.match(/^clusters\/([^/]+)\/cluster\.yaml$/);
  if (m) return m[1];
  return undefined;
}

function shouldRunFor(fileRel: string): boolean {
  if (fileRel.startsWith('conteudos/')) return fileRel.endsWith('.md');
  if (fileRel.startsWith('clusters/') && fileRel.endsWith('/cluster.yaml')) return true;
  if (fileRel === 'brain/topic-clusters.md') return true;
  if (fileRel.startsWith('brain/topic-clusters/') && fileRel.endsWith('.md')) return true;
  return false;
}

export interface ClusterSyncHookResult {
  ran: boolean;
  ok?: boolean;
  noop?: boolean;
  changedFiles?: string[];
  lints?: { code: string; severity: 'warn' | 'block'; message: string }[];
  durationMs?: number;
  reason?: string;
}

export async function runClusterSyncHook(
  projectRoot: string,
  fileRel: string,
): Promise<ClusterSyncHookResult> {
  if (!shouldRunFor(fileRel)) {
    return { ran: false, reason: 'not-applicable' };
  }
  const pluginRoot = findPluginRoot();
  if (!pluginRoot) {
    return { ran: false, reason: 'plugin-root-not-found' };
  }
  const scriptPath = join(pluginRoot, 'scripts', 'cluster-sync.mjs');
  const absProjectRoot = resolve(projectRoot);
  const cluster = inferAffectedClusterSlug(fileRel);
  const args = [scriptPath, `--root=${absProjectRoot}`];
  if (cluster) args.push(`--cluster=${cluster}`);

  return new Promise((resolveFn) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      resolveFn({ ran: false, reason: `spawn-error:${err.message}` });
    });
    child.on('close', () => {
      try {
        const data = JSON.parse(stdout);
        resolveFn({
          ran: true,
          ok: data.ok,
          noop: data.noop,
          changedFiles: data.changedFiles,
          lints: data.lints,
          durationMs: data.stats?.durationMs,
        });
      } catch {
        resolveFn({ ran: false, reason: stderr.slice(0, 200) || 'parse-error' });
      }
    });
  });
}
