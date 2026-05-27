#!/usr/bin/env node
// Auto-block mutation CLI. Reads JSON payload from stdin:
//   { block_id, kind, params, expected_fingerprint, mutation: {type, ...}, actor, projectRoot }
// Validates fingerprint, applies mutation via registry write/rowMutation,
// returns updated materialized + fingerprint. Conflict → ok:false + conflict payload.

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    emit({ ok: false, error: 'empty stdin' });
    process.exit(1);
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    emit({ ok: false, error: `invalid json: ${err.message}` });
    process.exit(1);
  }
  const { kind, params, expected_fingerprint, mutation, actor, projectRoot } = payload;
  if (!kind || !params || !mutation || !projectRoot) {
    emit({ ok: false, error: 'missing kind/params/mutation/projectRoot' });
    process.exit(1);
  }

  const autoBlocks = await import(join(ROOT, 'dist', 'lib', 'auto-blocks', 'index.js'));
  const registry = await import(join(ROOT, 'dist', 'lib', 'auto-block-registry.js'));
  const mutateLib = await import(join(ROOT, 'dist', 'lib', 'auto-block-mutate.js'));
  const io = await import(join(ROOT, 'dist', 'lib', 'cluster-io.js'));
  const labelsLib = await import(join(ROOT, 'dist', 'lib', 'cluster-labels.js'));

  autoBlocks.registerBuiltinAutoBlocks();
  const type = registry.getAutoBlockType(kind);
  if (!type) {
    emit({ ok: false, error: `unknown kind: ${kind}` });
    process.exit(1);
  }

  const parseResult = type.parseParams(params);
  if (parseResult && typeof parseResult === 'object' && 'error' in parseResult) {
    emit({ ok: false, error: `invalid params: ${parseResult.error}` });
    process.exit(1);
  }

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
  const labels = labelsLib.getLabels(language);
  const now = new Date().toISOString().slice(0, 10);
  const inputs = {
    clusters,
    clusterBySlug,
    contents,
    contentsByCluster,
    orphanContents,
    labels,
    language,
    projectRoot,
    pluginRoot: ROOT,
    now,
  };

  const currentRender = type.render(parseResult, inputs);
  if (expected_fingerprint && expected_fingerprint !== currentRender.fingerprint) {
    emit({
      ok: false,
      conflict: {
        current_fingerprint: currentRender.fingerprint,
        current_materialized: currentRender.materialized,
        expected_fingerprint,
      },
      error: 'fingerprint mismatch — source changed since last render',
    });
    process.exit(0);
  }

  let descriptor = null;
  if (mutation.type === 'cell') {
    if (!type.columns || !type.rows || !type.rowKey) {
      emit({ ok: false, error: `type ${kind} is read-only (no columns declared)` });
      process.exit(1);
    }
    const col = type.columns.find((c) => c.key === mutation.column);
    if (!col) {
      emit({ ok: false, error: `unknown column: ${mutation.column}` });
      process.exit(1);
    }
    if (col.derived || !col.write) {
      emit({ ok: false, error: `column ${mutation.column} is read-only` });
      process.exit(1);
    }
    const rows = type.rows(parseResult, inputs);
    const row = rows.find((r) => type.rowKey(r, parseResult, inputs) === mutation.row);
    if (!row) {
      emit({ ok: false, error: `row not found: ${mutation.row}` });
      process.exit(1);
    }
    descriptor = col.write(row, mutation.value, parseResult, inputs);
    if (!descriptor) {
      emit({ ok: false, error: 'write returned null' });
      process.exit(1);
    }
  } else if (mutation.type === 'row') {
    if (!type.rowMutation) {
      emit({ ok: false, error: `type ${kind} does not support row mutations` });
      process.exit(1);
    }
    if (type.rowMutationPolicy === 'reject' && (mutation.action === 'add' || mutation.action === 'remove')) {
      emit({ ok: false, error: `row ${mutation.action} not allowed by policy` });
      process.exit(1);
    }
    descriptor = type.rowMutation(parseResult, {
      rowKey: mutation.row,
      action: mutation.action,
      targetBlockId: mutation.targetBlockId,
      targetParams: mutation.targetParams,
      newValues: mutation.newValues,
    }, inputs);
    if (!descriptor) {
      emit({ ok: false, error: 'rowMutation returned null' });
      process.exit(1);
    }
    // Special-case: agentic-clusters-by-area move-to-block emits a descriptor with
    // fieldPath="clusters.<slug>.area"; rewrite to target the actual cluster.yaml.
    if (mutation.action === 'move-to-block' && descriptor.fieldPath.startsWith('clusters.')) {
      const segments = descriptor.fieldPath.split('.');
      const slug = segments[1];
      const subpath = segments.slice(2).join('.');
      const cluster = clusterBySlug.get(slug);
      if (!cluster) {
        emit({ ok: false, error: `cluster not found: ${slug}` });
        process.exit(1);
      }
      descriptor = { ...descriptor, filePath: cluster.filePath, fieldPath: subpath };
    }
  }

  const result = mutateLib.applyMutation(descriptor, {
    projectRoot,
    actor: actor || 'agent',
    source: 'api',
  });
  if (!result.ok) {
    emit({ ok: false, error: result.error });
    process.exit(1);
  }

  // Re-resolve inputs (cluster.yaml may have changed) and re-render.
  const clustersAfter = io.loadClusters(projectRoot);
  const clusterBySlugAfter = new Map(clustersAfter.map((c) => [c.slug, c]));
  const contentsAfter = io.loadContents(projectRoot);
  const contentsByClusterAfter = new Map();
  const orphansAfter = [];
  for (const content of contentsAfter) {
    const cs = content.fm.clusters || [];
    if (cs.length === 0) {
      orphansAfter.push(content);
      continue;
    }
    for (const slug of cs) {
      if (!contentsByClusterAfter.has(slug)) contentsByClusterAfter.set(slug, []);
      contentsByClusterAfter.get(slug).push(content);
    }
  }
  const inputsAfter = {
    ...inputs,
    clusters: clustersAfter,
    clusterBySlug: clusterBySlugAfter,
    contents: contentsAfter,
    contentsByCluster: contentsByClusterAfter,
    orphanContents: orphansAfter,
  };
  const renderAfter = type.render(parseResult, inputsAfter);
  emit({
    ok: true,
    new_fingerprint: renderAfter.fingerprint,
    materialized: renderAfter.materialized,
    materialized_at: now,
    descriptor: {
      filePath: result.filePath,
      fieldPath: result.fieldPath,
      before: result.before,
      after: result.after,
    },
  });
}

main().catch((err) => {
  emit({ ok: false, error: err.stack || err.message });
  process.exit(1);
});
