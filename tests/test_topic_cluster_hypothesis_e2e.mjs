import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "seo-brain");
const TMP = mkdtempSync(path.join(tmpdir(), "seo-brain-cluster-"));
const PROJECT_DIR = path.join(TMP, "project");

function run(...args) {
  const result = spawnSync(BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, SEO_BRAIN_PROJECT_DIR: PROJECT_DIR } });
  if (result.status !== 0) throw new Error(`Command failed: seo-brain ${args.join(" ")}\n${result.stderr}`);
  try { return JSON.parse(result.stdout); } catch { return { stdout: result.stdout }; }
}

try {
  run("project-init", "Topic cluster e2e");
  const cluster = run("topic-cluster", "--seed", "agentic seo", "--hypothesis-only");

  // JSON schema assertions
  assert.equal(cluster.seed, "agentic seo");
  assert.equal(cluster.status, "hypothesis");
  assert.equal(cluster.data_provenance.hypothesis_only, true);
  assert.equal(cluster.data_provenance.suggestions, null);
  assert.equal(cluster.data_provenance.serp, null);
  assert.equal(cluster.pillar.role, "pillar");
  assert.equal(cluster.pillar.slug, "agentic-seo");
  assert.equal(cluster.pillar.keyword_principal.keyword, "agentic seo");
  assert.equal(cluster.pillar.keyword_principal.volume, null);
  assert.equal(cluster.pillar.entity, null);
  assert.equal(cluster.pillar.serp_intent, null);
  assert.equal(cluster.pillar.serp_evidence, null);
  assert.equal(Array.isArray(cluster.supporting_pages), true);
  assert.equal(cluster.supporting_pages.length, 0, "hypothesis-only emits empty supports until agent fills");
  assert.deepEqual(cluster.keyword_pool, []);

  // Files persisted
  const clusterFile = path.join(PROJECT_DIR, "workbench", "topic-cluster", "agentic-seo.json");
  assert.ok(existsSync(clusterFile));
  const wikiFile = path.join(PROJECT_DIR, "wiki", "conteudos", "topic-clusters.md");
  assert.ok(existsSync(wikiFile));
  const wiki = readFileSync(wikiFile, "utf8");
  assert.match(wiki, /auto_generated: true/);
  assert.match(wiki, /## Cluster: agentic seo/);
  assert.match(wiki, /\| Papel \| Entidade \| KW principal \| Volume \| KW Secundárias \| Funil \| Intenção de Busca \|/);
  assert.match(wiki, /\| Pillar \| — \| agentic seo \| — \| — \| — \| — \|/);

  // Log entry written
  const log = readFileSync(path.join(PROJECT_DIR, "wiki", "log", "index.md"), "utf8");
  assert.match(log, /topic-cluster \| agentic seo/);
  assert.match(log, /Cluster hypothesis/);

  // --render-only path: don't refetch, just rerender
  const rendered = run("topic-cluster", "--seed", "agentic seo", "--render-only");
  assert.equal(rendered.ok, true);
  assert.equal(rendered.rendered, true);

  // --render-only fails for unknown seed
  const result = spawnSync(BIN, ["topic-cluster", "--seed", "nao-existe", "--render-only"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, SEO_BRAIN_PROJECT_DIR: PROJECT_DIR } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No cluster JSON/);

  console.log("topic cluster hypothesis e2e ok");
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
