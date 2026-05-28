#!/usr/bin/env node
// One-off migration: substitui sub-seções manuais `### Clusters nesta área` em
// project/brain/topic-clusters.md por fences `agentic-clusters-by-area` (auto-blocks).
// Idempotente: detecta sub-seções já migradas e ignora.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "project", "brain", "topic-clusters.md");

const HEADING = /^### Clusters nesta área$/m;
const AREA_SLUGS = new Map([
  ["IA Agêntica", "ia-agentica"],
  ["Estratégia", "estrategia"],
  ["Conteúdo", "conteudo"],
  ["Tecnologia", "tecnologia"],
]);

function buildFence(area) {
  const payload = { version: 1, area };
  const body = YAML.stringify(payload, { lineWidth: 0 }).replace(/\n$/, "");
  return `\`\`\`agentic-clusters-by-area\n${body}\n\`\`\``;
}

function migrate(text) {
  const lines = text.split("\n");
  const out = [];
  let currentArea = null;
  let inClusterSection = false;
  let migrated = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^## /.test(line)) {
      const title = line.slice(3).trim();
      currentArea = AREA_SLUGS.get(title) || null;
      inClusterSection = false;
      out.push(line);
      continue;
    }

    if (HEADING.test(line)) {
      if (!currentArea) {
        out.push(line);
        continue;
      }
      inClusterSection = true;
      out.push(line);
      out.push("");
      out.push(buildFence(currentArea));
      migrated++;
      continue;
    }

    if (inClusterSection) {
      if (/^## /.test(line) || /^### /.test(line)) {
        inClusterSection = false;
        out.push(line);
        continue;
      }
      // Skip old bullet list content
      continue;
    }

    out.push(line);
  }

  return { text: out.join("\n"), migrated };
}

const original = readFileSync(FILE, "utf8");

// Skip if already migrated (fence already present)
if (original.includes("agentic-clusters-by-area")) {
  process.stdout.write(
    "topic-clusters.md já contém fences agentic-clusters-by-area; nada a migrar.\n",
  );
  process.exit(0);
}

const result = migrate(original);
if (result.text === original) {
  process.stdout.write("Nenhuma sub-seção '### Clusters nesta área' encontrada.\n");
  process.exit(0);
}

writeFileSync(FILE, result.text, "utf8");
process.stdout.write(
  `Migrado ${result.migrated} sub-seção(ões) para fences agentic-clusters-by-area.\n` +
    "Próximo passo: rodar `node scripts/cluster-sync.mjs` para popular o campo materialized.\n",
);
