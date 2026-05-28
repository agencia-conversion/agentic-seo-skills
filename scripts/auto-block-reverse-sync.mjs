#!/usr/bin/env node
// Reverse-sync: para cada arquivo .md (passado via argv), detecta auto-block
// fences, compara materialized contra canonical, propaga edits para fontes
// canônicas (cluster.yaml/frontmatter) via columns[].write declarado.
// Idempotente: rodar 2x = mesmo estado.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FENCE_RE = /^(```)(agentic-[a-z0-9-]+)\n([\s\S]*?)\n```/gm;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function detectProjectRoot(filePath) {
  let dir = dirname(resolve(filePath));
  while (dir !== '/') {
    if (existsSync(join(dir, '.agentic-seo', 'project.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function loadModules() {
  const autoBlocks = await import(join(ROOT, 'dist', 'lib', 'auto-blocks', 'index.js'));
  const registry = await import(join(ROOT, 'dist', 'lib', 'auto-block-registry.js'));
  const mutateLib = await import(join(ROOT, 'dist', 'lib', 'auto-block-mutate.js'));
  const diffLib = await import(join(ROOT, 'dist', 'lib', 'auto-block-diff.js'));
  const io = await import(join(ROOT, 'dist', 'lib', 'cluster-io.js'));
  const labelsLib = await import(join(ROOT, 'dist', 'lib', 'cluster-labels.js'));
  autoBlocks.registerBuiltinAutoBlocks();
  return { registry, mutateLib, diffLib, io, labelsLib };
}

function buildInputs(io, labelsLib, projectRoot) {
  const clusters = io.loadClusters(projectRoot);
  const clusterBySlug = new Map(clusters.map((c) => [c.slug, c]));
  const contents = io.loadContents(projectRoot);
  const contentsByCluster = new Map();
  const orphanContents = [];
  for (const content of contents) {
    const cs = content.fm.clusters || [];
    if (cs.length === 0) {
      orphanContents.push(content);
      continue;
    }
    for (const slug of cs) {
      if (!contentsByCluster.has(slug)) contentsByCluster.set(slug, []);
      contentsByCluster.get(slug).push(content);
    }
  }
  const language = labelsLib.resolveLanguage(io.readProjectLanguage(projectRoot));
  return {
    clusters,
    clusterBySlug,
    contents,
    contentsByCluster,
    orphanContents,
    labels: labelsLib.getLabels(language),
    language,
    projectRoot,
    pluginRoot: ROOT,
    now: new Date().toISOString().slice(0, 10),
  };
}

async function processFile(filePath, mods) {
  const projectRoot = detectProjectRoot(filePath);
  if (!projectRoot) return { filePath, skipped: true, reason: 'project-not-found' };
  if (!existsSync(filePath)) return { filePath, skipped: true, reason: 'file-not-found' };
  const text = readFileSync(filePath, 'utf8');
  if (!/^```agentic-/m.test(text)) return { filePath, skipped: true, reason: 'no-auto-blocks' };

  const inputs = buildInputs(mods.io, mods.labelsLib, projectRoot);
  const applied = [];
  const rejected = [];
  let updatedText = text;
  let blocksTouched = 0;

  // Process each fence; collect mutations; apply sequentially under lock.
  const matches = [...text.matchAll(FENCE_RE)];
  for (const match of matches) {
    const [, , typeName, body] = match;
    const type = mods.registry.getAutoBlockType(typeName);
    if (!type) continue;
    let parsedBody;
    try {
      parsedBody = YAML.parse(body) || {};
    } catch {
      continue;
    }
    const paramsResult = type.parseParams(parsedBody);
    if (paramsResult && 'error' in paramsResult) continue;
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
        source: 'reverse-sync',
        toolName: process.env.CLAUDE_TOOL_NAME || 'Edit',
      });
      if (result.ok) {
        applied.push({ filePath: result.filePath, fieldPath: result.fieldPath, before: result.before, after: result.after });
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

  // After applying source mutations, regenerate materialized in the file.
  if (blocksTouched > 0) {
    const newInputs = buildInputs(mods.io, mods.labelsLib, projectRoot);
    updatedText = updatedText.replace(FENCE_RE, (match, _mark, typeName, body) => {
      const type = mods.registry.getAutoBlockType(typeName);
      if (!type) return match;
      let parsed;
      try { parsed = YAML.parse(body) || {}; } catch { return match; }
      const paramsResult = type.parseParams(parsed);
      if (paramsResult && 'error' in paramsResult) return match;
      const rendered = type.render(paramsResult, newInputs);
      if (parsed.materialized_fingerprint === rendered.fingerprint) return match;
      const nextPayload = {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        ...paramsResult,
        materialized: rendered.materialized,
        materialized_at: newInputs.now,
        materialized_fingerprint: rendered.fingerprint,
      };
      const nextBody = YAML.stringify(nextPayload, { lineWidth: 0 }).replace(/\n$/, '');
      return `\`\`\`${typeName}\n${nextBody}\n\`\`\``;
    });
    if (updatedText !== text) writeFileSync(filePath, updatedText, 'utf8');
  }

  return { filePath, projectRoot, applied, rejected, blocksTouched };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    emit({ ok: true, files: [] });
    return;
  }
  const mods = await loadModules();
  const results = [];
  for (const arg of argv) {
    const paths = arg.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
    for (const filePath of paths) {
      if (!filePath.endsWith('.md')) continue;
      try {
        const r = await processFile(filePath, mods);
        results.push(r);
      } catch (err) {
        results.push({ filePath, error: err.message });
      }
    }
  }
  emit({ ok: true, files: results });
}

main().catch((err) => {
  emit({ ok: false, error: err.stack || err.message });
  process.exit(1);
});
