#!/usr/bin/env node
// Rename a cluster slug atomically across cluster.yaml, conteudos frontmatter,
// brain subpage, and brain index. Specified in topic-clusters-contract.md § 12.

import { existsSync, readFileSync, writeFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");

const args = process.argv.slice(2);
let from = "";
let to = "";
let root = pluginRoot;
for (const a of args) {
  if (a.startsWith("--from=")) from = a.slice(7);
  else if (a.startsWith("--to=")) to = a.slice(5);
  else if (a.startsWith("--root=")) root = a.slice(7);
}

if (!from || !to) {
  console.error("Usage: cluster-rename --from=<old-slug> --to=<new-slug> [--root=<project-root>]");
  process.exit(2);
}

const project = existsSync(join(root, ".agentic-seo", "project.json"))
  ? root
  : join(root, "project");

const fromDir = join(project, "clusters", from);
const toDir = join(project, "clusters", to);
if (!existsSync(fromDir)) {
  console.error(`Cluster source not found: ${fromDir}`);
  process.exit(2);
}
if (existsSync(toDir)) {
  console.error(`Cluster target already exists: ${toDir}`);
  process.exit(2);
}

// 1. Rename folder
renameSync(fromDir, toDir);

// 2. Update slug field in cluster.yaml
const yamlPath = join(toDir, "cluster.yaml");
const yaml = yamlParse(readFileSync(yamlPath, "utf8"));
yaml.slug = to;
writeFileSync(yamlPath, yamlStringify(yaml, { lineWidth: 0 }), "utf8");

// 3. Update frontmatter clusters[] of every content
const conteudosDir = join(project, "conteudos");
let touchedContents = 0;
function visit(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    if (statSync(fp).isDirectory()) {
      visit(fp);
      continue;
    }
    if (!name.endsWith(".md")) continue;
    const text = readFileSync(fp, "utf8");
    if (!text.includes(from)) continue;
    const updated = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
    if (updated !== text) {
      writeFileSync(fp, updated, "utf8");
      touchedContents++;
    }
  }
}
visit(conteudosDir);

// 4. Rename brain subpage and clear old fingerprint
const oldSubpage = join(project, "brain", "topic-clusters", `${from}.md`);
const newSubpage = join(project, "brain", "topic-clusters", `${to}.md`);
if (existsSync(oldSubpage)) {
  if (existsSync(newSubpage)) rmSync(newSubpage, { force: true });
  renameSync(oldSubpage, newSubpage);
}

// 5. Resync via engine
const require = createRequire(import.meta.url);
const distEntry = resolve(pluginRoot, "dist", "commands", "cluster-sync.js");
if (existsSync(distEntry)) {
  const mod = require(distEntry);
  await mod.clusterSync({ root: project });
}

console.log(`Renamed ${from} -> ${to}. ${touchedContents} content files updated.`);
