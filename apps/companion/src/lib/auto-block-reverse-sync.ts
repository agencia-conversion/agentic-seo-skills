// In-process reverse-sync ported from scripts/auto-block-reverse-sync.mjs.
// Loads the compiled CommonJS modules from dist/lib via createRequire so we
// avoid duplicating the algorithm. Called by auto-block-watcher when an
// external edit lands on a brain `.md` with `agentic-*` fences.
//
// Idempotent: a second invocation on the same file yields the same state.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import YAML from 'yaml';

const FENCE_RE = /^(```)(agentic-[a-z0-9-]+)\n([\s\S]*?)\n```/gm;

function pluginRootOrThrow(): string {
  const explicit = process.env.AGENTIC_SEO_PLUGIN_ROOT || process.env.SEO_BRAIN_PLUGIN_ROOT;
  if (explicit && existsSync(join(explicit, 'dist', 'lib', 'auto-block-mutate.js'))) {
    return explicit;
  }
  const candidates = [resolve(process.cwd(), '..', '..'), process.cwd()];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'dist', 'lib', 'auto-block-mutate.js'))) return candidate;
  }
  throw new Error('auto-block-reverse-sync: plugin root not found (dist/lib missing)');
}

function detectProjectRoot(filePath: string): string | null {
  let dir = dirname(resolve(filePath));
  while (dir !== '/' && dir.length > 1) {
    if (existsSync(join(dir, '.agentic-seo', 'project.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

interface DistModules {
  registry: any;
  mutateLib: any;
  diffLib: any;
  io: any;
  labelsLib: any;
}

let cachedModules: DistModules | null = null;

function loadModules(): DistModules {
  if (cachedModules) return cachedModules;
  const pluginRoot = pluginRootOrThrow();
  // Use createRequire so we can load CommonJS dist modules from anywhere.
  const require = createRequire(join(pluginRoot, 'package.json'));
  const autoBlocks = require(join(pluginRoot, 'dist', 'lib', 'auto-blocks', 'index.js'));
  const registry = require(join(pluginRoot, 'dist', 'lib', 'auto-block-registry.js'));
  const mutateLib = require(join(pluginRoot, 'dist', 'lib', 'auto-block-mutate.js'));
  const diffLib = require(join(pluginRoot, 'dist', 'lib', 'auto-block-diff.js'));
  const io = require(join(pluginRoot, 'dist', 'lib', 'cluster-io.js'));
  const labelsLib = require(join(pluginRoot, 'dist', 'lib', 'cluster-labels.js'));
  autoBlocks.registerBuiltinAutoBlocks();
  cachedModules = { registry, mutateLib, diffLib, io, labelsLib };
  return cachedModules;
}

interface ReverseSyncInputs {
  clusters: unknown[];
  clusterBySlug: Map<string, unknown>;
  contents: { fm: { clusters?: string[] } }[];
  contentsByCluster: Map<string, unknown[]>;
  orphanContents: unknown[];
  labels: unknown;
  language: string;
  projectRoot: string;
  pluginRoot: string;
  now: string;
}

function buildInputs(
  mods: DistModules,
  projectRoot: string,
  pluginRoot: string,
): ReverseSyncInputs {
  const clusters = mods.io.loadClusters(projectRoot) as { slug: string }[];
  const clusterBySlug = new Map<string, unknown>(
    clusters.map((c) => [c.slug, c] as [string, unknown]),
  );
  const contents = mods.io.loadContents(projectRoot);
  const contentsByCluster = new Map<string, unknown[]>();
  const orphanContents: unknown[] = [];
  for (const content of contents) {
    const cs = (content as { fm: { clusters?: string[] } }).fm.clusters || [];
    if (cs.length === 0) {
      orphanContents.push(content);
      continue;
    }
    for (const slug of cs) {
      if (!contentsByCluster.has(slug)) contentsByCluster.set(slug, []);
      contentsByCluster.get(slug)!.push(content);
    }
  }
  const language = mods.labelsLib.resolveLanguage(mods.io.readProjectLanguage(projectRoot));
  return {
    clusters,
    clusterBySlug,
    contents,
    contentsByCluster,
    orphanContents,
    labels: mods.labelsLib.getLabels(language),
    language,
    projectRoot,
    pluginRoot,
    now: new Date().toISOString().slice(0, 10),
  };
}

export interface ReverseSyncResult {
  ok: boolean;
  filePath: string;
  skipped?: boolean;
  reason?: string;
  projectRoot?: string;
  applied?: { filePath: string; fieldPath: string; before: unknown; after: unknown }[];
  rejected?: unknown[];
  blocksTouched?: number;
  error?: string;
}

export async function runReverseSyncForFile(filePath: string): Promise<ReverseSyncResult> {
  const projectRoot = detectProjectRoot(filePath);
  if (!projectRoot) return { ok: true, filePath, skipped: true, reason: 'project-not-found' };
  if (!existsSync(filePath)) return { ok: true, filePath, skipped: true, reason: 'file-not-found' };
  const text = readFileSync(filePath, 'utf8');
  if (!/^```agentic-/m.test(text)) {
    return { ok: true, filePath, skipped: true, reason: 'no-auto-blocks' };
  }

  const mods = loadModules();
  const pluginRoot = pluginRootOrThrow();
  const inputs = buildInputs(mods, projectRoot, pluginRoot);
  const applied: { filePath: string; fieldPath: string; before: unknown; after: unknown }[] = [];
  const rejected: unknown[] = [];
  let blocksTouched = 0;
  let updatedText = text;

  try {
    const matches = [...text.matchAll(FENCE_RE)];
    for (const match of matches) {
      const [, , typeName, body] = match;
      const type = mods.registry.getAutoBlockType(typeName);
      if (!type) continue;
      let parsedBody: { materialized?: unknown } & Record<string, unknown>;
      try {
        parsedBody = (YAML.parse(body) as Record<string, unknown>) || {};
      } catch {
        continue;
      }
      const paramsResult = type.parseParams(parsedBody);
      if (paramsResult && typeof paramsResult === 'object' && 'error' in paramsResult) continue;
      const fileMaterialized = typeof parsedBody.materialized === 'string' ? parsedBody.materialized : '';
      if (!fileMaterialized) continue;
      const canonical = type.render(paramsResult, inputs);
      const diff = mods.diffLib.diffMaterialized(
        fileMaterialized,
        canonical.materialized,
        type,
        paramsResult,
        inputs,
      );
      rejected.push(...diff.rejected);
      for (const descriptor of diff.applied) {
        const result = mods.mutateLib.applyMutation(descriptor, {
          projectRoot,
          actor: 'agent',
          source: 'watcher',
          toolName: 'chokidar',
        });
        if (result.ok) {
          applied.push({
            filePath: result.filePath,
            fieldPath: result.fieldPath,
            before: result.before,
            after: result.after,
          });
          blocksTouched++;
        } else {
          rejected.push({
            code: 'auto-block.mutate-failed',
            severity: 'warn',
            message: result.error || 'mutate failed',
            context: { fieldPath: descriptor.fieldPath },
          });
        }
      }
    }

    if (blocksTouched > 0) {
      const newInputs = buildInputs(mods, projectRoot, pluginRoot);
      updatedText = updatedText.replace(FENCE_RE, (mat, _mark, typeName, body) => {
        const type = mods.registry.getAutoBlockType(typeName);
        if (!type) return mat;
        let parsed: Record<string, unknown>;
        try {
          parsed = (YAML.parse(body) as Record<string, unknown>) || {};
        } catch {
          return mat;
        }
        const paramsResult = type.parseParams(parsed);
        if (paramsResult && typeof paramsResult === 'object' && 'error' in paramsResult) return mat;
        const rendered = type.render(paramsResult, newInputs);
        if (parsed.materialized_fingerprint === rendered.fingerprint) return mat;
        const nextPayload = {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          ...paramsResult,
          materialized: rendered.materialized,
          materialized_at: newInputs.now,
          materialized_fingerprint: rendered.fingerprint,
        };
        const nextBody = YAML.stringify(nextPayload, { lineWidth: 0 }).replace(/\n$/, '');
        return '```' + typeName + '\n' + nextBody + '\n```';
      });
      if (updatedText !== text) writeFileSync(filePath, updatedText, 'utf8');
    }
    return { ok: true, filePath, projectRoot, applied, rejected, blocksTouched };
  } catch (err) {
    return {
      ok: false,
      filePath,
      projectRoot,
      applied,
      rejected,
      blocksTouched,
      error: (err as Error).message,
    };
  }
}
