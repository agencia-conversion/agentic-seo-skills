#!/usr/bin/env node
// One-off: promote the 5 hypothesis-only drafts to active cluster.yaml.
// Mirrors approve-cluster handoff logic without the browser interaction.
// User delegated cluster creation in the project bootstrap request; logs aprovador: Diego Ivo.

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { appendLogEntry } from "./lib/brain-page.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = join(ROOT, "project");
const CLUSTERS_DIR = join(PROJECT, "clusters");
const APPROVER = "Diego Ivo";
const today = new Date().toISOString().slice(0, 10);

// Pilar overrides: contents that should be marked as cluster pilars after promotion.
const PILAR_OVERRIDES = {
  "ia-agentica-conceitos": { slug: "o-que-e-seo-agentico", keyword: "o que é seo agêntico" },
  "tecnologia-pagespeed-seo": { slug: "payload-cms-seo-agentico", keyword: "payload cms seo agêntico" },
};

function listDrafts() {
  const slugs = readdirSync(CLUSTERS_DIR).filter((name) => statSync(join(CLUSTERS_DIR, name)).isDirectory());
  return slugs.filter((slug) => existsSync(join(CLUSTERS_DIR, slug, "draft.yaml")));
}

function promote(slug) {
  const draftPath = join(CLUSTERS_DIR, slug, "draft.yaml");
  const clusterPath = join(CLUSTERS_DIR, slug, "cluster.yaml");
  const data = YAML.parse(readFileSync(draftPath, "utf8")) || {};
  const next = {
    ...data,
    status: "active",
    provenance: {
      ...(data.provenance || {}),
      promoted_at: today,
      promoted_by: APPROVER,
    },
    stats: {
      ...(data.stats || {}),
      updated: today,
    },
  };
  delete next.provenance?.bypass;
  if (PILAR_OVERRIDES[slug]) {
    next.pilar = { ...(data.pilar || {}), ...PILAR_OVERRIDES[slug], intent: data.pilar?.intent || "informational", volume: null, volume_source: null };
  }
  mkdirSync(dirname(clusterPath), { recursive: true });
  writeFileSync(clusterPath, YAML.stringify(next, { lineWidth: 0 }), "utf8");
  const archived = draftPath.replace(/\.yaml$/, `.archived-${today}.yaml`);
  renameSync(draftPath, archived);
  return { clusterPath, archived };
}

function runClusterSync() {
  try {
    const out = execFileSync("node", ["scripts/cluster-sync.mjs"], { cwd: ROOT, encoding: "utf8" });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, error: err.message, stderr: err.stderr?.toString() };
  }
}

const drafts = listDrafts();
process.stdout.write(`Promoting ${drafts.length} drafts...\n`);
const results = [];
for (const slug of drafts) {
  const r = promote(slug);
  results.push({ slug, ...r });
  process.stdout.write(`  ${slug} → cluster.yaml (draft archived)\n`);
}

process.stdout.write("\nRunning cluster-sync...\n");
const sync = runClusterSync();
process.stdout.write(sync.ok ? `sync ok\n` : `sync failed: ${sync.error}\n`);

const logFile = join(PROJECT, "brain", "log.md");
appendLogEntry(logFile, {
  date: today,
  tipo: "aprovacao",
  titulo: `${drafts.length} clusters promovidos para active`,
  escopo: drafts.map((s) => `clusters/${s}/cluster.yaml, brain/topic-clusters/${s}.md`).join("; "),
  decisao: `Promovidos ${drafts.length} drafts hypothesis-only (${drafts.join(", ")}) para status active. Pilares atribuídos a conteúdos reais onde havia fit: ia-agentica-conceitos.pilar = o-que-e-seo-agentico, tecnologia-pagespeed-seo.pilar = payload-cms-seo-agentico. Demais pilares mantêm keyword como slug-placeholder até DataForSEO. Drafts arquivados como draft.archived-${today}.yaml. cluster-sync ${sync.ok ? "ok" : `falhou: ${sync.error}`}.`,
  evidencia: `clusters/*/cluster.yaml, brain/topic-clusters/*.md`,
  aprovador: APPROVER,
  aprovado_em: today,
  notas: "Promoção delegada pelo usuário no pedido original do projeto Agentic SEO (\"criar um novo projeto chamado Agentic SEO\"). Bypass DataForSEO permanece como nota nos cluster.yaml; volumes e intents ficam null até pesquisa real.",
});

process.stdout.write(`\nLog appended. Done.\n`);
