#!/usr/bin/env node
// One-off migration of the Belo Horizonte brain to the EN-canonical domain
// vocabulary (contract_version 2). Idempotent: running twice is a no-op.
//
// Renames pt-BR brain filenames to EN; rewrites wikilinks, cluster.yaml keys,
// content frontmatter, log entries; moves conteudos/ to content/.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, relative, dirname } from "node:path";

const ROOT = resolve(process.cwd(), "project");

const BRAIN_FILE_RENAMES = [
  ["identidade.md", "identity.md"],
  ["voz.md", "voice.md"],
  ["tecnologia.md", "technology.md"],
  ["revisao.md", "review.md"],
  ["produtos.md", "products.md"],
];

const WIKILINK_REPLACEMENTS = {
  identidade: "identity",
  voz: "voice",
  tecnologia: "technology",
  revisao: "review",
  produtos: "products",
};

const LOG_KEY_RENAMES = {
  "- tipo:": "- type:",
  "- escopo:": "- scope:",
  "- decisao:": "- decision:",
  "- evidencia:": "- evidence:",
  "- aprovador:": "- approver:",
  "- aprovado_em:": "- approved_at:",
  "- notas:": "- notes:",
};

const LOG_TYPE_ENUM = {
  "type: aprovacao": "type: approval",
  "type: decisao": "type: decision",
  "type: errata": "type: erratum",
  "type: ingestao": "type: ingestion",
  "type: publicacao": "type: publication",
  "type: prova": "type: proof",
};

const CLUSTER_YAML_KEY_RENAMES = [
  [/^nome:/m, "name:"],
  [/^tese:/m, "thesis:"],
];

const CLUSTER_YAML_ENUM_RENAMES = [
  [/papel:\s+pilar\b/g, "role: pillar"],
  [/papel:\s+satelite\b/g, "role: satellite"],
];

const STATS_RENAMES = [
  [/^( *)publicados:/gm, "$1published:"],
  [/^( *)planejados:/gm, "$1planned:"],
];

function walkFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else if (st.isFile()) out.push(full);
  }
  return out;
}

function renameBrainFiles() {
  let renamed = 0;
  for (const [src, dst] of BRAIN_FILE_RENAMES) {
    const srcPath = join(ROOT, "brain", src);
    const dstPath = join(ROOT, "brain", dst);
    if (existsSync(srcPath) && !existsSync(dstPath)) {
      renameSync(srcPath, dstPath);
      renamed++;
      console.log(`  brain/${src} -> brain/${dst}`);
    }
  }
  return renamed;
}

function rewriteWikilinks() {
  let touched = 0;
  for (const file of walkFiles(join(ROOT, "brain"))) {
    if (!file.endsWith(".md")) continue;
    let text = readFileSync(file, "utf8");
    let next = text;
    for (const [pt, en] of Object.entries(WIKILINK_REPLACEMENTS)) {
      next = next.replace(new RegExp(`\\[\\[${pt}(?=[\\]#|])`, "g"), `[[${en}`);
    }
    if (next !== text) {
      writeFileSync(file, next, "utf8");
      touched++;
    }
  }
  return touched;
}

function migrateLogFile() {
  const logPath = join(ROOT, "brain", "log.md");
  if (!existsSync(logPath)) return 0;
  let text = readFileSync(logPath, "utf8");
  let next = text;
  for (const [from, to] of Object.entries(LOG_KEY_RENAMES)) {
    next = next.split(from).join(to);
  }
  for (const [from, to] of Object.entries(LOG_TYPE_ENUM)) {
    next = next.split(from).join(to);
  }
  if (next !== text) {
    writeFileSync(logPath, next, "utf8");
    return 1;
  }
  return 0;
}

function migrateClusterYamls() {
  const clustersDir = join(ROOT, "clusters");
  if (!existsSync(clustersDir)) return 0;
  let touched = 0;
  for (const slug of readdirSync(clustersDir)) {
    const yamlPath = join(clustersDir, slug, "cluster.yaml");
    if (!existsSync(yamlPath)) continue;
    let text = readFileSync(yamlPath, "utf8");
    let next = text;
    for (const [re, replacement] of CLUSTER_YAML_KEY_RENAMES) next = next.replace(re, replacement);
    for (const [re, replacement] of CLUSTER_YAML_ENUM_RENAMES) next = next.replace(re, replacement);
    for (const [re, replacement] of STATS_RENAMES) next = next.replace(re, replacement);
    if (!/^contract_version:\s*2\b/m.test(next)) {
      if (/^contract_version:\s*1\b/m.test(next)) {
        next = next.replace(/^contract_version:\s*1\b/m, "contract_version: 2");
      } else if (!/^contract_version:/m.test(next)) {
        next = `contract_version: 2\n${next}`;
      }
    }
    if (next !== text) {
      writeFileSync(yamlPath, next, "utf8");
      touched++;
      console.log(`  clusters/${slug}/cluster.yaml`);
    }
    const planejamentoPath = join(clustersDir, slug, "planejamento.md");
    const planningPath = join(clustersDir, slug, "planning.md");
    if (existsSync(planejamentoPath) && !existsSync(planningPath)) {
      renameSync(planejamentoPath, planningPath);
      console.log(`  clusters/${slug}/planejamento.md -> planning.md`);
    }
  }
  return touched;
}

function migrateContentFolder() {
  const fromRoot = join(ROOT, "conteudos");
  const toRoot = join(ROOT, "content");
  if (!existsSync(fromRoot)) return 0;
  if (existsSync(toRoot)) {
    console.warn("  content/ already exists; skipping move");
    return 0;
  }
  let touched = 0;
  for (const origin of readdirSync(fromRoot)) {
    const srcDir = join(fromRoot, origin);
    if (!statSync(srcDir).isDirectory()) continue;
    const dstOrigin = origin === "outros" ? "other" : origin;
    const dstDir = join(toRoot, dstOrigin);
    mkdirSync(dstDir, { recursive: true });
    for (const name of readdirSync(srcDir)) {
      const srcFile = join(srcDir, name);
      const dstFile = join(dstDir, name);
      renameSync(srcFile, dstFile);
      touched++;
    }
    rmSync(srcDir, { recursive: true, force: true });
  }
  rmSync(fromRoot, { recursive: true, force: true });
  console.log(`  conteudos/ -> content/ (${touched} files moved)`);
  return touched;
}

function migrateContentFrontmatter() {
  const contentRoot = join(ROOT, "content");
  if (!existsSync(contentRoot)) return 0;
  let touched = 0;
  for (const file of walkFiles(contentRoot)) {
    if (!file.endsWith(".md")) continue;
    let text = readFileSync(file, "utf8");
    if (!text.startsWith("---\n")) continue;
    let next = text;
    next = next.replace(/^origem:\s*"?(blog|linkedin|podcast|outros)"?$/m, (_m, v) => `origin: ${v === "outros" ? "other" : v}`);
    next = next.replace(/^papel:/m, "role:");
    next = next.replace(/^(\s+\S+:)\s*pilar\b/gm, "$1 pillar");
    next = next.replace(/^(\s+\S+:)\s*satelite\b/gm, "$1 satellite");
    if (next !== text) {
      writeFileSync(file, next, "utf8");
      touched++;
    }
  }
  return touched;
}

function updateProjectJson() {
  const projectJsonPath = join(ROOT, ".agentic-seo", "project.json");
  if (!existsSync(projectJsonPath)) return 0;
  const data = JSON.parse(readFileSync(projectJsonPath, "utf8"));
  if (data.schema_version === "3.0.0") return 0;
  data.schema_version = "3.0.0";
  data.updated_at = new Date().toISOString();
  writeFileSync(projectJsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return 1;
}

function appendMigrationLog() {
  const logPath = join(ROOT, "brain", "log.md");
  if (!existsSync(logPath)) return;
  const today = new Date().toISOString().slice(0, 10);
  const heading = `## ${today} - bilingual rename to EN`;
  let text = readFileSync(logPath, "utf8");
  if (text.includes(heading)) return;
  const block = [
    "",
    "",
    heading,
    "",
    "- type: migration",
    "- scope: brain/, clusters/, content/, log.md",
    "- decision: Renamed pt-BR domain identifiers to EN per docs/specs/en-rename-map.md (contract_version 2).",
    "- evidence: docs/specs/en-rename-map.md, docs/specs/topic-clusters-contract.md",
    "- approver: agent",
    "- notes: Authorial content preserved in pt-BR. File names, YAML keys, and log fields migrated to EN.",
    "",
  ].join("\n");
  writeFileSync(logPath, text.replace(/\s+$/, "") + block, "utf8");
}

console.log("Migrating Belo Horizonte brain to EN-canonical vocabulary...");
const renamed = renameBrainFiles();
const wikilinks = rewriteWikilinks();
const logTouched = migrateLogFile();
const yamls = migrateClusterYamls();
const moved = migrateContentFolder();
const fm = migrateContentFrontmatter();
const projectJson = updateProjectJson();
appendMigrationLog();
console.log(`Done. Brain files renamed: ${renamed}. Wikilink files touched: ${wikilinks}. Log: ${logTouched}. Cluster YAMLs: ${yamls}. Content files moved: ${moved}. Frontmatter rewrites: ${fm}. project.json: ${projectJson}.`);
