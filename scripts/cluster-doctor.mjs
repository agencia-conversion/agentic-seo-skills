#!/usr/bin/env node
// Read-only diagnostic — prints lints and drift without writing.
// Implements `brain-keeper cluster-doctor` per topic-clusters-contract v1.

import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const distEntry = resolve(pluginRoot, "dist", "commands", "cluster-sync.js");

if (!existsSync(distEntry)) {
  console.error("Build artifact missing: dist/commands/cluster-sync.js. Run `npm run build` first.");
  process.exit(2);
}

const require = createRequire(import.meta.url);
const mod = require(distEntry);

const args = process.argv.slice(2);
let root = process.cwd();
for (const a of args) {
  if (a.startsWith("--root=")) root = a.slice(7);
}

const projectRoot = existsSync(join(root, ".agentic-seo", "project.json"))
  ? root
  : existsSync(join(root, "project", ".agentic-seo", "project.json"))
    ? join(root, "project")
    : join(root, "project");

const result = await mod.clusterSync({ root: projectRoot, dryRun: true });

const blocks = result.lints.filter((l) => l.severity === "block");
const warns = result.lints.filter((l) => l.severity === "warn");

console.log(`cluster-doctor — ${projectRoot}`);
console.log(`  Clusters: ${result.stats.clustersConsidered}`);
console.log(`  Conteúdos: ${result.stats.contentsConsidered}`);
console.log(`  Tempo: ${result.stats.durationMs}ms`);
console.log("");
if (blocks.length === 0 && warns.length === 0) {
  console.log("Sem lints. Tudo limpo.");
  process.exit(0);
}
if (blocks.length > 0) {
  console.log(`Lints BLOCK (${blocks.length}):`);
  for (const lint of blocks) console.log(`  [${lint.code}] ${lint.message}`);
  console.log("");
}
if (warns.length > 0) {
  console.log(`Lints WARN (${warns.length}):`);
  for (const lint of warns) console.log(`  [${lint.code}] ${lint.message}`);
}
process.exit(blocks.length > 0 ? 1 : 0);
