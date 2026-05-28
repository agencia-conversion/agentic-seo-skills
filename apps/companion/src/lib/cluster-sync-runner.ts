import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { silenceWrite, beginCompanionSync, endCompanionSync } from './write-silencer';

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
  if (fileRel.startsWith('contents/')) return fileRel.endsWith('.md');
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

function silenceExpectedClusterSyncOutputs(absProjectRoot: string, cluster?: string) {
  // cluster-sync writes brain/topic-clusters/<slug>.md, brain/topic-clusters.md,
  // and clusters/<slug>/cluster.yaml. Pre-silence these so the chokidar watcher
  // does not bounce back through cluster-sync again on its own output.
  silenceWrite(join(absProjectRoot, 'brain', 'topic-clusters.md'));
  const targetSlugs: string[] = [];
  if (cluster) {
    targetSlugs.push(cluster);
  } else {
    const clustersDir = join(absProjectRoot, 'clusters');
    if (existsSync(clustersDir)) {
      for (const name of readdirSync(clustersDir)) {
        if (name.startsWith('.') || name.startsWith('_')) continue;
        if (existsSync(join(clustersDir, name, 'cluster.yaml'))) targetSlugs.push(name);
      }
    }
  }
  for (const slug of targetSlugs) {
    silenceWrite(join(absProjectRoot, 'brain', 'topic-clusters', `${slug}.md`));
    silenceWrite(join(absProjectRoot, 'clusters', slug, 'cluster.yaml'));
  }
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
  silenceExpectedClusterSyncOutputs(absProjectRoot, cluster);
  const args = [scriptPath, `--root=${absProjectRoot}`];
  if (cluster) args.push(`--cluster=${cluster}`);

  beginCompanionSync();
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
      endCompanionSync();
      resolveFn({ ran: false, reason: `spawn-error:${err.message}` });
    });
    child.on('close', () => {
      // Re-silence the expected outputs because cluster-sync may have written
      // them just before close and chokidar reports the event after that.
      silenceExpectedClusterSyncOutputs(absProjectRoot, cluster);
      endCompanionSync();
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
