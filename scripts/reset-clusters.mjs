#!/usr/bin/env node
// Reset destrutivo dos clusters do projeto. Cria 4 clusters no schema v1 do contrato
// (docs/specs/topic-clusters-contract.md). Atualiza frontmatter dos conteúdos com
// `clusters:[]`. Delega materialização das tabelas do brain para `cluster-sync`.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const PROJECT = join(ROOT, "project");
const TAG = "pre-reset-clusters";

const CLUSTERS = [
  {
    slug: "seo-agentico",
    name: "SEO Agêntico",
    icon: "🧭",
    area: "fundamentos-do-seo-agentico",
    area_name: "Fundamentos do SEO Agêntico",
    thesis: "Cluster guarda-chuva do método. Define o SEO Agêntico como disciplina que combina IA agêntica, GEO e operação por agentes, e contrasta a operação com SEO clássico, estratégia e julgamento humano.",
    pillar: { slug: "o-que-e-seo-agentico", keyword: "SEO Agêntico" },
    satellites: [
      "seo-agentico-vs-seo-classico",
      "seo-estrategico",
      "inteligencia-vs-julgamento",
      "agente-de-seo",
      "skills-para-seo",
      "prompts-para-seo",
      "wiki-llm",
      "payload-cms-seo-agentico",
    ],
  },
  {
    slug: "geo",
    name: "GEO",
    icon: "📊",
    area: "geo-branding-e-metricas",
    area_name: "GEO, Branding e Métricas",
    thesis: "Cluster sobre presença em motores generativos, branding semântico e mensuração de marca em ChatGPT, Gemini, Perplexity e AI Overview.",
    pillar: { slug: "geo-generative-engine-optimization", keyword: "GEO Generative Engine Optimization" },
    satellites: ["branding-semantico", "autoatribuicao"],
  },
  {
    slug: "seo",
    name: "SEO",
    icon: "🔍",
    area: "conteudo-eeat-e-voz",
    area_name: "Conteúdo, EEAT e Voz",
    thesis: "Cluster do SEO orientado a conteúdo, EEAT e voz autoral. Mantém disciplina clássica (intent, autoridade, links internos) enquanto integra ferramentas e métricas modernas.",
    pillar: { slug: "seo-estrategico", keyword: "SEO estratégico" },
    satellites: ["o-que-e-eeat", "eeat-na-era-da-ia", "seo-agentico-vs-seo-classico"],
  },
  {
    slug: "inteligencia-artificial",
    name: "Inteligência Artificial",
    icon: "🤖",
    area: "ia-agentica-e-operacao",
    area_name: "IA Agêntica e Operação",
    thesis: "Cluster sobre agentes de IA como infraestrutura operacional: definição de agente, workflows, skills, prompts e governança editorial contra AI Slop.",
    pillar: { slug: "o-que-e-um-agente-de-ia", keyword: "O que é um agente de IA" },
    satellites: [
      "workflows-agenticos",
      "agente-de-seo",
      "skills-para-seo",
      "prompts-para-seo",
      "inteligencia-vs-julgamento",
      "wiki-llm",
      "eeat-na-era-da-ia",
      "payload-cms-seo-agentico",
    ],
  },
];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ensureTag() {
  try {
    const out = execSync(`git tag --list ${TAG}`, { encoding: "utf8" }).trim();
    if (!out) {
      execSync(`git tag ${TAG}`, { stdio: "ignore" });
      console.log(`Tag git criada: ${TAG}`);
    }
  } catch (err) {
    console.warn(`Aviso: não foi possível criar tag ${TAG}: ${err.message}`);
  }
}

function listBlogSlugs() {
  const dir = join(PROJECT, "contents", "blog");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => name.replace(/\.md$/, ""));
}

function buildClusterYaml(cluster, blogSlugs) {
  const pillarPublished = blogSlugs.includes(cluster.pillar.slug);
  return {
    contract_version: 1,
    slug: cluster.slug,
    name: cluster.name,
    icon: cluster.icon,
    area: cluster.area,
    area_name: cluster.area_name,
    status: "active",
    thesis: cluster.thesis,
    pillar: {
      slug: cluster.pillar.slug,
      keyword: cluster.pillar.keyword,
      intent: "informational",
      volume: null,
      volume_source: null,
    },
    planned_satellites: pillarPublished
      ? []
      : [
          {
            slug: cluster.pillar.slug,
            keyword: cluster.pillar.keyword,
            intent: "informational",
            volume: null,
            volume_source: null,
            role: "pillar",
            note: "Pilar planejado — conteúdo a escrever.",
          },
        ],
    satellite_overrides: {},
    stats: {
      published: 0,
      planned: 0,
      updated: todayIso(),
    },
    provenance: {
      created_at: todayIso(),
      created_by: "agent",
      decision_log: `log.md#cluster-${cluster.slug}-${todayIso()}`,
    },
    evidence: [],
  };
}

function parseFrontmatter(text) {
  const match = text.replace(/^﻿/, "").match(FRONTMATTER_RE);
  if (!match) return { data: {}, body: text };
  let data = {};
  try {
    data = yamlParse(match[1]) || {};
  } catch {
    data = {};
  }
  return { data, body: match[2] || "" };
}

function writeFrontmatter(filePath, nextData, body) {
  const yaml = yamlStringify(nextData, { lineWidth: 0 }).trimEnd();
  const sep = body.startsWith("\n") ? "" : "\n";
  writeFileSync(filePath, `---\n${yaml}\n---\n${sep}${body}`, "utf8");
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function updateContentFrontmatter(slug, clustersForSlug, roleMap) {
  const filePath = join(PROJECT, "contents", "blog", `${slug}.md`);
  if (!existsSync(filePath)) return false;
  const text = readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(text);
  const next = {
    ...data,
    contract_version: 1,
    clusters: clustersForSlug,
  };
  delete next.area;
  if (Object.keys(roleMap).length > 0) {
    next.role = roleMap;
  } else {
    delete next.role;
  }
  writeFrontmatter(filePath, next, body);
  return true;
}

function buildContentClusterMap(blogSlugs) {
  const out = new Map();
  for (const slug of blogSlugs) {
    out.set(slug, { clusters: [], role: {} });
  }
  for (const cluster of CLUSTERS) {
    if (out.has(cluster.pillar.slug)) {
      const rec = out.get(cluster.pillar.slug);
      rec.clusters.push(cluster.slug);
      rec.role[cluster.slug] = "pillar";
    }
    for (const satSlug of cluster.satellites) {
      if (!out.has(satSlug)) continue;
      const rec = out.get(satSlug);
      if (rec.clusters.includes(cluster.slug)) continue;
      rec.clusters.push(cluster.slug);
      rec.role[cluster.slug] = "satellite";
    }
  }
  return out;
}

function writeClusterYamlFile(cluster, yaml) {
  const filePath = join(PROJECT, "clusters", cluster.slug, "cluster.yaml");
  ensureDir(filePath);
  writeFileSync(filePath, yamlStringify(yaml, { lineWidth: 0 }), "utf8");
  return filePath;
}

function cleanOldArtifacts() {
  const validSlugs = new Set(CLUSTERS.map((c) => c.slug));
  const clustersDir = join(PROJECT, "clusters");
  if (existsSync(clustersDir)) {
    for (const name of readdirSync(clustersDir)) {
      if (name.startsWith(".")) continue;
      if (validSlugs.has(name)) continue;
      rmSync(join(clustersDir, name), { recursive: true, force: true });
    }
  }
  const subpagesDir = join(PROJECT, "brain", "topic-clusters");
  if (existsSync(subpagesDir)) {
    for (const name of readdirSync(subpagesDir)) {
      if (!name.endsWith(".md")) continue;
      rmSync(join(subpagesDir, name), { force: true });
    }
  }
  for (const slug of validSlugs) {
    const fpPath = join(clustersDir, slug, ".sync-fingerprint");
    if (existsSync(fpPath)) rmSync(fpPath, { force: true });
  }
  // Remove old index so sync regenerates with sentinels from scratch.
  const indexPath = join(PROJECT, "brain", "topic-clusters.md");
  if (existsSync(indexPath)) rmSync(indexPath, { force: true });
}

async function runClusterSync() {
  const require = createRequire(import.meta.url);
  const distEntry = join(ROOT, "dist", "commands", "cluster-sync.js");
  if (!existsSync(distEntry)) {
    console.error("Build artifact missing: run `npm run build` first.");
    process.exit(2);
  }
  const mod = require(distEntry);
  const result = await mod.clusterSync({ root: PROJECT });
  return result;
}

function appendLog(touched, syncResult) {
  const logPath = join(PROJECT, "brain", "log.md");
  if (!existsSync(logPath)) return;
  const entry = `\n## ${todayIso()} - Reset clusters v1\n\n- type: decision\n- scope: project/clusters/, project/contents/blog/, project/brain/topic-clusters/, project/brain/topic-clusters.md\n- decision: Reset destrutivo dos clusters aplicado seguindo o contract v1 (docs/specs/topic-clusters-contract.md). ${touched.clusters} clusters reescritos, ${touched.contents} conteúdos com frontmatter atualizado, ${syncResult.changedFiles.length} arquivos brain materializados.\n- evidence: tag git ${TAG}\n- approver: agent\n- notes: Plugin 0.2 (pre-release). Sem suporte a migração legacy.\n`;
  const current = readFileSync(logPath, "utf8");
  writeFileSync(logPath, current.replace(/\s*$/, "") + entry, "utf8");
}

async function main() {
  ensureTag();
  const blogSlugs = listBlogSlugs();
  cleanOldArtifacts();

  const touched = { clusters: 0, contents: 0 };
  for (const cluster of CLUSTERS) {
    const yaml = buildClusterYaml(cluster, blogSlugs);
    writeClusterYamlFile(cluster, yaml);
    touched.clusters++;
  }

  const map = buildContentClusterMap(blogSlugs);
  for (const [slug, rec] of map.entries()) {
    if (rec.clusters.length === 0) continue;
    if (updateContentFrontmatter(slug, rec.clusters, rec.role)) {
      touched.contents++;
    }
  }

  console.log(`Clusters reescritos: ${touched.clusters}`);
  console.log(`Conteúdos atualizados: ${touched.contents}`);

  const syncResult = await runClusterSync();
  console.log(`Sync: ${syncResult.changedFiles.length} arquivos materializados em ${syncResult.stats.durationMs}ms`);
  if (syncResult.lints.length > 0) {
    console.log(`Lints (${syncResult.lints.length}):`);
    for (const lint of syncResult.lints) {
      console.log(`  [${lint.severity}] ${lint.code} — ${lint.message}`);
    }
  }
  appendLog(touched, syncResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
