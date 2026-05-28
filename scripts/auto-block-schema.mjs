#!/usr/bin/env node
// Auto-block schema CLI. Reads JSON from stdin: { kind, projectRoot }
// Returns metadata about a block type's columns: { ok, columns: [{key,label,derived,editable}] }

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
  if (!raw.trim()) return emit({ ok: false, error: 'empty stdin' });
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return emit({ ok: false, error: `invalid json: ${err.message}` });
  }
  const { kind, projectRoot } = payload;
  if (!kind) return emit({ ok: false, error: 'missing kind' });

  const autoBlocks = await import(join(ROOT, 'dist', 'lib', 'auto-blocks', 'index.js'));
  const registry = await import(join(ROOT, 'dist', 'lib', 'auto-block-registry.js'));
  const labelsLib = await import(join(ROOT, 'dist', 'lib', 'cluster-labels.js'));
  const io = await import(join(ROOT, 'dist', 'lib', 'cluster-io.js'));

  autoBlocks.registerBuiltinAutoBlocks();
  const type = registry.getAutoBlockType(kind);
  if (!type) return emit({ ok: false, error: `unknown kind: ${kind}` });

  const language = projectRoot
    ? labelsLib.resolveLanguage(io.readProjectLanguage(projectRoot))
    : 'pt-BR';
  const labels = labelsLib.getLabels(language);
  const columns = (type.columns || []).map((c) => ({
    key: c.key,
    label: c.label(labels),
    derived: !!c.derived,
    editable: !!c.write,
  }));
  emit({
    ok: true,
    kind,
    version: type.version,
    rowMutationPolicy: type.rowMutationPolicy || 'reject',
    supportsRowMutation: !!type.rowMutation,
    columns,
  });
}

main().catch((err) => emit({ ok: false, error: err.stack || err.message }));
