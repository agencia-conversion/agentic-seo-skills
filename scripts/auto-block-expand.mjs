#!/usr/bin/env node
// Auto-block expander CLI. Reads JSON payload from stdin:
//   { kind, params, projectRoot }
// Returns JSON: { ok, materialized, materialized_at, materialized_fingerprint }
// Used by the Companion API to expand auto-blocks server-side.

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function fail(message) {
  process.stdout.write(JSON.stringify({ ok: false, error: message }) + '\n');
  process.exit(1);
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) return fail('empty stdin');
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return fail(`invalid json: ${err.message}`);
  }
  const kind = typeof payload.kind === 'string' ? payload.kind : '';
  const params = payload.params && typeof payload.params === 'object' ? payload.params : {};
  const projectRoot = typeof payload.projectRoot === 'string' ? payload.projectRoot : '';
  if (!kind || !projectRoot) return fail('missing kind or projectRoot');

  const autoBlocks = await import(join(ROOT, 'dist', 'lib', 'auto-blocks', 'index.js'));
  const registry = await import(join(ROOT, 'dist', 'lib', 'auto-block-registry.js'));
  const io = await import(join(ROOT, 'dist', 'lib', 'cluster-io.js'));
  const labels = await import(join(ROOT, 'dist', 'lib', 'cluster-labels.js'));

  autoBlocks.registerBuiltinAutoBlocks();
  const type = registry.getAutoBlockType(kind);
  if (!type) return fail(`unknown kind: ${kind}`);

  const parseResult = type.parseParams(params);
  if (parseResult && typeof parseResult === 'object' && 'error' in parseResult) {
    return fail(`invalid params: ${parseResult.error}`);
  }

  const clusters = io.loadClusters(projectRoot);
  const clusterBySlug = new Map(clusters.map((c) => [c.slug, c]));
  const contents = io.loadContents(projectRoot);
  const map = new Map();
  const orphans = [];
  for (const content of contents) {
    const cs = content.fm.clusters || [];
    if (cs.length === 0) {
      orphans.push(content);
      continue;
    }
    for (const slug of cs) {
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug).push(content);
    }
  }
  const language = labels.resolveLanguage(io.readProjectLanguage(projectRoot));
  const lbl = labels.getLabels(language);
  const now = new Date().toISOString().slice(0, 10);

  const inputs = {
    clusters,
    clusterBySlug,
    contents,
    contentsByCluster: map,
    orphanContents: orphans,
    labels: lbl,
    language,
    projectRoot,
    pluginRoot: ROOT,
    now,
  };

  try {
    const result = type.render(parseResult, inputs);
    process.stdout.write(
      JSON.stringify({
        ok: true,
        materialized: result.materialized,
        materialized_at: now,
        materialized_fingerprint: result.fingerprint,
      }) + '\n',
    );
  } catch (err) {
    return fail(`render failed: ${err.message}`);
  }
}

main().catch((err) => fail(err.message));
