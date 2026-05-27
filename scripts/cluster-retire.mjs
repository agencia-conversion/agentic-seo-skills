#!/usr/bin/env node
// Retire a cluster: optionally reassign all contents to another cluster, then archive.
// Specified in topic-clusters-contract.md § 12.

import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");

const args = process.argv.slice(2);
let slug = "";
let reassignTo = "";
let root = pluginRoot;
let force = false;
for (const a of args) {
  if (a.startsWith("--slug=")) slug = a.slice(7);
  else if (a.startsWith("--reassign-to=")) reassignTo = a.slice(14);
  else if (a.startsWith("--root=")) root = a.slice(7);
  else if (a === "--force") force = true;
}

if (!slug) {
  console.error("Usage: cluster-retire --slug=<X> [--reassign-to=<Y>] [--force]");
  process.exit(2);
}

const project = existsSync(join(root, ".agentic-seo", "project.json"))
  ? root
  : join(root, "project");
const clusterDir = join(project, "clusters", slug);
if (!existsSync(clusterDir)) {
  console.error(`Cluster not found: ${slug}`);
  process.exit(2);
}

const orphans = [];
let touched = 0;
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
    if (!text.includes(slug)) continue;
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;
    let fm;
    try {
      fm = yamlParse(match[1]);
    } catch {
      continue;
    }
    if (!Array.isArray(fm?.clusters) || !fm.clusters.includes(slug)) continue;
    let next = fm.clusters.filter((c) => c !== slug);
    if (reassignTo && !next.includes(reassignTo)) next.push(reassignTo);
    if (next.length === 0) {
      orphans.push(fp);
      continue;
    }
    fm.clusters = next;
    if (fm.role && typeof fm.role === "object") {
      const role = { ...fm.role };
      delete role[slug];
      if (reassignTo && !role[reassignTo]) role[reassignTo] = "satellite";
      fm.role = role;
    }
    const yaml = yamlStringify(fm, { lineWidth: 0 }).trimEnd();
    writeFileSync(fp, text.replace(match[0], `---\n${yaml}\n---`), "utf8");
    touched++;
  }
}
visit(join(project, "contents"));

if (orphans.length > 0 && !force) {
  console.error(`Bloqueado: ${orphans.length} conteúdos ficariam com clusters:[] vazio.`);
  for (const fp of orphans) console.error(`  ${fp}`);
  console.error("Use --reassign-to=<Y> ou --force.");
  process.exit(1);
}

rmSync(clusterDir, { recursive: true, force: true });
const subpage = join(project, "brain", "topic-clusters", `${slug}.md`);
if (existsSync(subpage)) rmSync(subpage, { force: true });

const require = createRequire(import.meta.url);
const distEntry = resolve(pluginRoot, "dist", "commands", "cluster-sync.js");
if (existsSync(distEntry)) {
  const mod = require(distEntry);
  await mod.clusterSync({ root: project });
}

console.log(`Cluster ${slug} aposentado. ${touched} conteúdos ${reassignTo ? `migrados para ${reassignTo}` : "desvinculados"}.`);
