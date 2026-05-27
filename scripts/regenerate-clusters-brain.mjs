#!/usr/bin/env node
// Regenera brain/topic-clusters.md (índice) e brain/topic-clusters/<slug>.md (subpáginas)
// a partir dos cluster.yaml existentes em project/clusters/. Não toca cluster.yaml nem conteúdos.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as yamlParse } from "yaml";
import { updateContentsSection, writeBrainIndex } from "./lib/clusters-apply.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const PROJECT = join(ROOT, "project");

function loadClusterEntries() {
  const dir = join(PROJECT, "clusters");
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    if (name === "site-derived-agentic-seo") continue;
    const yamlPath = join(dir, name, "cluster.yaml");
    if (!existsSync(yamlPath)) continue;
    try {
      const data = yamlParse(readFileSync(yamlPath, "utf8"));
      if (data && data.slug) out.push({ slug: data.slug, target_path: `project/clusters/${data.slug}/cluster.yaml`, yaml: data });
    } catch {
      // skip malformed yaml
    }
  }
  return out;
}

function readContentTitle(slug) {
  const file = join(PROJECT, "contents", "blog", `${slug}.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const match = text.match(/^title:\s*"?([^"\n]+)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, "") : null;
}

function readContentPublishedAt(slug) {
  const file = join(PROJECT, "contents", "blog", `${slug}.md`);
  if (!existsSync(file)) return "";
  const text = readFileSync(file, "utf8");
  const match = text.match(/^published_at:\s*"?([^"\n]*)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, "") : "";
}

function buildPublishedByCluster(entries) {
  const map = new Map();
  for (const entry of entries) {
    const arr = [];
    const pillarSlug = entry.yaml.pillar?.slug;
    if (pillarSlug) {
      const title = readContentTitle(pillarSlug);
      if (title) {
        arr.push({
          slug: pillarSlug,
          title,
          origin: "blog",
          published_at: readContentPublishedAt(pillarSlug),
          intent: "informational",
          role: "pillar",
        });
      }
    }
    for (const sat of entry.yaml.satellites || []) {
      if (sat.status !== "published") continue;
      const title = readContentTitle(sat.slug);
      if (!title) continue;
      arr.push({
        slug: sat.slug,
        title,
        origin: "blog",
        published_at: readContentPublishedAt(sat.slug),
        intent: sat.intent,
        role: "satellite",
      });
    }
    map.set(entry.slug, arr);
  }
  return map;
}

const entries = loadClusterEntries();
if (entries.length === 0) {
  console.error("Nenhum cluster.yaml encontrado em project/clusters/.");
  process.exit(1);
}
const publishedByCluster = buildPublishedByCluster(entries);
const uniqueSlugs = new Set();
for (const list of publishedByCluster.values()) {
  for (const item of list) uniqueSlugs.add(item.slug);
}
const plan = {
  summary: { contents_to_update: uniqueSlugs.size },
  clusters_to_create: entries,
};
const updates = [];
for (const entry of entries) {
  const filePath = join(PROJECT, "brain", "topic-clusters", `${entry.slug}.md`);
  const result = updateContentsSection(filePath, entry, publishedByCluster);
  updates.push({ slug: entry.slug, mode: result.mode });
}
const indexPath = writeBrainIndex(ROOT, plan, publishedByCluster);
console.log(`Regerado.`);
for (const update of updates) console.log(`- ${update.slug}: ${update.mode}`);
console.log(`Índice: ${indexPath}`);
