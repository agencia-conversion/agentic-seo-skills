#!/usr/bin/env node
// Reset destrutivo dos clusters do projeto: apaga estrutura atual e cria 4 novos
// (SEO Agêntico, GEO, SEO, Inteligência Artificial) com mapeamento N:N dos conteúdos
// publicados. Tag git `pre-reset-clusters` e backup tarball obrigatórios antes.

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  writeClusterYaml,
  applyContentFrontmatter,
  writeBrainSubpages,
  writeBrainIndex,
  logMigrationEntry,
} from "./lib/clusters-apply.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const PROJECT = join(ROOT, "project");
const TAG = "pre-reset-clusters";

const NEW_CLUSTERS = [
  {
    slug: "seo-agentico",
    nome: "SEO Agêntico",
    icon: "🧭",
    area: "fundamentos-do-seo-agentico",
    area_nome: "Fundamentos do SEO Agêntico",
    context:
      "Cluster guarda-chuva do método. Define o SEO Agêntico como disciplina que combina IA agêntica, GEO e operação por agentes, e contrasta a operação com SEO clássico, estratégia e julgamento humano.",
    pilar: { slug: "o-que-e-seo-agentico", keyword: "SEO Agêntico" },
    satelites_keywords: {
      "seo-agentico-vs-seo-classico": "SEO Agêntico vs SEO clássico",
      "seo-estrategico": "SEO estratégico",
      "inteligencia-vs-julgamento": "Inteligência vs julgamento",
      "agente-de-seo": "Agente de SEO",
      "skills-para-seo": "Skills para SEO",
      "prompts-para-seo": "Prompts para SEO",
      "wiki-llm": "Wiki LLM",
      "payload-cms-seo-agentico": "Payload CMS para SEO Agêntico",
    },
  },
  {
    slug: "geo",
    nome: "GEO",
    icon: "📊",
    area: "geo-branding-e-metricas",
    area_nome: "GEO, Branding e Métricas",
    context:
      "Cluster sobre presença em motores generativos, branding semântico e mensuração de marca em ChatGPT, Gemini, Perplexity e AI Overview. GEO trata a busca distribuída como disciplina autônoma.",
    pilar: { slug: "geo-generative-engine-optimization", keyword: "GEO Generative Engine Optimization" },
    satelites_keywords: {
      "branding-semantico": "Branding semântico",
      autoatribuicao: "Autoatribuição",
    },
  },
  {
    slug: "seo",
    nome: "SEO",
    icon: "🔍",
    area: "conteudo-eeat-e-voz",
    area_nome: "Conteúdo, EEAT e Voz",
    context:
      "Cluster do SEO orientado a conteúdo, EEAT e voz autoral. Mantém disciplina clássica (intent, autoridade, links internos) enquanto integra ferramentas e métricas modernas.",
    pilar: { slug: "seo-estrategico", keyword: "SEO estratégico" },
    satelites_keywords: {
      "o-que-e-eeat": "O que é EEAT",
      "eeat-na-era-da-ia": "EEAT na era da IA",
      "seo-agentico-vs-seo-classico": "SEO Agêntico vs SEO clássico",
    },
  },
  {
    slug: "inteligencia-artificial",
    nome: "Inteligência Artificial",
    icon: "🤖",
    area: "ia-agentica-e-operacao",
    area_nome: "IA Agêntica e Operação",
    context:
      "Cluster sobre agentes de IA como infraestrutura operacional: definição de agente, workflows, skills, prompts e governança editorial contra AI Slop.",
    pilar: { slug: "o-que-e-um-agente-de-ia", keyword: "O que é um agente de IA" },
    satelites_keywords: {
      "workflows-agenticos": "Workflows agênticos",
      "agente-de-seo": "Agente de SEO",
      "skills-para-seo": "Skills para SEO",
      "prompts-para-seo": "Prompts para SEO",
      "inteligencia-vs-julgamento": "Inteligência vs julgamento",
      "wiki-llm": "Wiki LLM",
      "eeat-na-era-da-ia": "EEAT na era da IA",
      "payload-cms-seo-agentico": "Payload CMS para SEO Agêntico",
    },
  },
];

function ensureTag() {
  try {
    const out = execSync(`git tag --list ${TAG}`, { encoding: "utf8" }).trim();
    if (!out) throw new Error("not-found");
  } catch {
    console.error(`Tag git \`${TAG}\` ausente. Crie com \`git tag ${TAG}\` antes de rodar.`);
    process.exit(2);
  }
}

function listBlogSlugs() {
  const dir = join(PROJECT, "conteudos", "blog");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => name.replace(/\.md$/, ""));
}

function readContentTitle(slug) {
  const filePath = join(PROJECT, "conteudos", "blog", `${slug}.md`);
  if (!existsSync(filePath)) return slug;
  const text = readFileSync(filePath, "utf8");
  const match = text.match(/^title:\s*"?([^"\n]+)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, "") : slug;
}

function buildClusterEntries(blogSlugs) {
  return NEW_CLUSTERS.map((cluster) => {
    const satelites = Object.entries(cluster.satelites_keywords).map(([slug, keyword]) => {
      const published = blogSlugs.includes(slug);
      return {
        slug,
        papel: "satelite",
        status: published ? "published" : "planned",
        acao: published ? "manter" : "criar",
        intent: "informational",
        keyword,
        volume: null,
        volume_source: null,
        note: null,
      };
    });
    const pilarPublished = blogSlugs.includes(cluster.pilar.slug);
    const totalPublished = (pilarPublished ? 1 : 0) + satelites.filter((s) => s.status === "published").length;
    const totalPlanned = (pilarPublished ? 0 : 1) + satelites.filter((s) => s.status === "planned").length;
    return {
      slug: cluster.slug,
      target_path: `project/clusters/${cluster.slug}/cluster.yaml`,
      yaml: {
        slug: cluster.slug,
        nome: cluster.nome,
        icon: cluster.icon,
        area: cluster.area,
        area_nome: cluster.area_nome,
        status: "active",
        context: cluster.context,
        pilar: { ...cluster.pilar, volume: null, volume_source: null },
        satelites,
        stats: {
          total_keywords: 1 + satelites.length,
          publicados: totalPublished,
          planejados: totalPlanned,
        },
        provenance: {
          origem: "reset-clusters-2026-05-25",
          drafted_at: new Date().toISOString().slice(0, 10),
          source_refs: [],
        },
      },
    };
  });
}

function buildContentUpdates(blogSlugs, clusterEntries) {
  const updates = [];
  for (const slug of blogSlugs) {
    const clusters = [];
    const papel = {};
    for (const entry of clusterEntries) {
      if (entry.yaml.pilar?.slug === slug) {
        clusters.push(entry.slug);
        papel[entry.slug] = "pilar";
        continue;
      }
      if (entry.yaml.satelites.some((s) => s.slug === slug)) {
        clusters.push(entry.slug);
        papel[entry.slug] = "satelite";
      }
    }
    if (clusters.length === 0) continue;
    updates.push({
      path: `project/conteudos/blog/${slug}.md`,
      add_clusters: clusters,
      papel,
    });
  }
  return updates;
}

function removeOldClusters(newSlugs) {
  const clustersDir = join(PROJECT, "clusters");
  if (existsSync(clustersDir)) {
    for (const name of readdirSync(clustersDir)) {
      if (name.startsWith(".")) continue;
      if (name === "site-derived-agentic-seo") continue;
      if (newSlugs.has(name)) continue;
      rmSync(join(clustersDir, name), { recursive: true, force: true });
    }
  }
  const subpagesDir = join(PROJECT, "brain", "topic-clusters");
  if (existsSync(subpagesDir)) {
    for (const name of readdirSync(subpagesDir)) {
      if (!name.endsWith(".md")) continue;
      const slugFromName = name.replace(/\.md$/, "");
      if (newSlugs.has(slugFromName)) continue;
      rmSync(join(subpagesDir, name), { force: true });
    }
  }
}

function buildPublishedByCluster(clusterEntries, blogSlugs) {
  const map = new Map();
  for (const entry of clusterEntries) {
    const arr = [];
    if (entry.yaml.pilar && blogSlugs.includes(entry.yaml.pilar.slug)) {
      arr.push({
        slug: entry.yaml.pilar.slug,
        title: readContentTitle(entry.yaml.pilar.slug),
        origin: "blog",
        published_at: "",
        intent: "informational",
        papel: "pilar",
      });
    }
    for (const sat of entry.yaml.satelites) {
      if (sat.status === "published") {
        arr.push({
          slug: sat.slug,
          title: readContentTitle(sat.slug),
          origin: "blog",
          published_at: "",
          intent: sat.intent,
          papel: "satelite",
        });
      }
    }
    map.set(entry.slug, arr);
  }
  return map;
}

ensureTag();

const blogSlugs = listBlogSlugs();
const clusterEntries = buildClusterEntries(blogSlugs);
const contentUpdates = buildContentUpdates(blogSlugs, clusterEntries);
const publishedByCluster = buildPublishedByCluster(clusterEntries, blogSlugs);

const newSlugs = new Set(NEW_CLUSTERS.map((c) => c.slug));
removeOldClusters(newSlugs);

const touched = { clusters: [], contents: [], subpages: [] };
for (const entry of clusterEntries) touched.clusters.push(writeClusterYaml(ROOT, entry));
for (const update of contentUpdates) {
  const applied = applyContentFrontmatter(ROOT, update);
  if (applied) touched.contents.push(applied);
}
const plan = {
  summary: { contents_to_update: touched.contents.length },
  clusters_to_create: clusterEntries,
};
touched.subpages = writeBrainSubpages(ROOT, plan, publishedByCluster);
writeBrainIndex(ROOT, plan, publishedByCluster);

logMigrationEntry(ROOT, touched);

console.log("Reset aplicado.");
console.log(`Clusters criados: ${touched.clusters.length}`);
console.log(`Conteúdos atualizados: ${touched.contents.length}`);
console.log(`Subpáginas brain criadas: ${touched.subpages.length}`);
console.log(`Tag git: ${TAG}.`);
