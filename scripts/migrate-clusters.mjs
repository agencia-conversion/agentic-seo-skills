#!/usr/bin/env node
// Migração clusters-as-spine. Modos: --dry-run (default) escreve plan.yaml; --apply aplica o cutover.
// `--apply` requer a tag git `pre-cluster-migration` antes (segurança).

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { stringify } from "yaml";
import { buildPlan, readContents } from "./lib/clusters-migration.mjs";
import {
  writeClusterYaml,
  applyContentFrontmatter,
  writeBrainSubpages,
  writeBrainIndex,
  simplifyEditorial,
  logMigrationEntry,
} from "./lib/clusters-apply.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const PROJECT = join(ROOT, "project");
const SEED_CLUSTER = join(PROJECT, "clusters", "site-derived-agentic-seo", "cluster.json");
const BLOG_DIR = join(PROJECT, "conteudos", "blog");
const OUT_DIR = join(PROJECT, "workbench", "migrations", "clusters-spine");
const OUT_FILE = join(OUT_DIR, "plan.yaml");
const TAG = "pre-cluster-migration";

function args() {
  const a = process.argv.slice(2);
  if (a.includes("--apply")) return "apply";
  if (a.includes("--dry-run") || a.length === 0) return "dry-run";
  console.error(`Argumento desconhecido: ${a.join(" ")}. Use --dry-run ou --apply.`);
  process.exit(2);
}

function ensureTag() {
  try {
    execSync(`git tag --list ${TAG}`, { encoding: "utf8" }).trim() ||
      (() => {
        throw new Error("not-found");
      })();
  } catch {
    console.error(`Git tag \`${TAG}\` does not exist. Create it with \`git tag ${TAG}\` before running --apply.`);
    process.exit(2);
  }
}

function buildPublishedByCluster(plan) {
  const map = new Map();
  for (const update of plan.contents_to_update) {
    if (!update.add_clusters || update.add_clusters.length === 0) continue;
    const contentSlug = basename(update.path, ".md");
    const fullPath = join(ROOT, update.path);
    if (!existsSync(fullPath)) continue;
    const text = readFileSync(fullPath, "utf8");
    const titleMatch = text.match(/^title:\s*"?([^"\n]+)"?/m);
    const publishedMatch = text.match(/^published_at:\s*"?([^"\n]*)"?/m);
    const segments = update.path.split("/");
    const origin = segments.includes("conteudos") ? segments[segments.indexOf("conteudos") + 1] || "blog" : "blog";
    for (const slug of update.add_clusters) {
      const arr = map.get(slug) || [];
      arr.push({
        slug: contentSlug,
        title: titleMatch ? titleMatch[1].trim().replace(/^"|"$/g, "") : contentSlug,
        origin,
        published_at: publishedMatch ? publishedMatch[1].trim().replace(/^"|"$/g, "") : "",
        intent: "informational",
        papel: update.papel?.[slug] || "satelite",
      });
      map.set(slug, arr);
    }
  }
  return map;
}

function writePlan(plan) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, stringify(plan, { lineWidth: 0 }), "utf8");
  return OUT_FILE;
}

function runDryRun() {
  const plan = buildPlan({ mode: "dry-run", seedPath: SEED_CLUSTER, blogDir: BLOG_DIR });
  const out = writePlan(plan);
  console.log(`Plan written to ${out}`);
  console.log(`Clusters to create: ${plan.summary.clusters_to_create}`);
  console.log(`Content files to update: ${plan.summary.contents_to_update}`);
  console.log(`Brain subpages to create: ${plan.summary.brain_subpages_to_create}`);
  console.log(`Brain pages to rewrite: ${plan.summary.brain_pages_to_rewrite}`);
  if (plan.summary.blockers > 0) {
    console.log(`\nBLOCKERS (${plan.summary.blockers}):`);
    plan.blockers.forEach((b) => console.log(`  - ${b}`));
    process.exit(1);
  }
  console.log(`\nNo blockers. Review ${out} before proceeding to Phase 4.`);
}

function runApply() {
  ensureTag();
  const plan = buildPlan({ mode: "apply", seedPath: SEED_CLUSTER, blogDir: BLOG_DIR });
  if (plan.summary.blockers > 0) {
    console.error(`Apply abortado: ${plan.summary.blockers} blockers no plano.`);
    plan.blockers.forEach((b) => console.error(`  - ${b}`));
    process.exit(1);
  }
  const touched = { clusters: [], contents: [], subpages: [] };
  for (const entry of plan.clusters_to_create) {
    touched.clusters.push(writeClusterYaml(ROOT, entry));
  }
  for (const update of plan.contents_to_update) {
    const applied = applyContentFrontmatter(ROOT, update);
    if (applied) touched.contents.push(applied);
  }
  const publishedByCluster = buildPublishedByCluster(plan);
  touched.subpages = writeBrainSubpages(ROOT, plan, publishedByCluster);
  writeBrainIndex(ROOT, plan, publishedByCluster);
  simplifyEditorial(ROOT);
  logMigrationEntry(ROOT, touched);
  console.log(`Cutover aplicado.`);
  console.log(`Clusters: ${touched.clusters.length}`);
  console.log(`Content files: ${touched.contents.length}`);
  console.log(`Brain subpages: ${touched.subpages.length}`);
  console.log(`brain/topic-clusters.md index rewritten.`);
  console.log(`brain/editorial.md simplificado.`);
  console.log(`Log mestra gravada. Tag git: ${TAG}.`);
}

const mode = args();
try {
  if (mode === "apply") runApply();
  else runDryRun();
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
