import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "agentic-seo");
const TMP = mkdtempSync(path.join(tmpdir(), "agentic-seo-cluster-"));
const PROJECT_DIR = path.join(TMP, "project");

function run(...args) {
  const result = spawnSync(BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: PROJECT_DIR } });
  if (result.status !== 0) throw new Error(`Command failed: agentic-seo ${args.join(" ")}\n${result.stderr}`);
  try { return JSON.parse(result.stdout); } catch { return { stdout: result.stdout }; }
}

try {
  run("project-init", "Topic cluster e2e");
  const cluster = run("topic-cluster", "--seed", "agentic seo", "--hypothesis-only");
  // Contract v1 draft assertions
  assert.equal(cluster.slug, "agentic-seo");
  assert.equal(cluster.name, "agentic seo");
  assert.equal(cluster.status, "draft");
  assert.equal(cluster.contract_version, 1);
  assert.equal(cluster.browser_prompt.recommended, true);
  assert.equal(cluster.browser_prompt.message, "Posso abrir o Web Companion para você ver a análise?");
  assert.equal(cluster.report_md, path.join("analyses", "topic-cluster", "agentic-seo", "report.md"));
  assert.equal(cluster.companion_path, "analyses-topic-cluster-agentic-seo-report");
  assert.ok(existsSync(path.join(PROJECT_DIR, cluster.report_md)));
  assert.equal(existsSync(path.join(PROJECT_DIR, "clusters", "agentic-seo", "report.html")), false);
  assert.equal(cluster.provenance.hypothesis_only, true);
  assert.equal(cluster.evidence.provider_bypass.approver, "agent");
  assert.match(cluster.evidence.provider_bypass.confirmation_text, /DataForSEO/);
  assert.equal(cluster.evidence.suggestions, null);
  assert.equal(cluster.evidence.serp, null);
  assert.equal(cluster.pillar.slug, "agentic-seo");
  assert.equal(cluster.pillar.keyword, "agentic seo");
  assert.equal(cluster.pillar.volume, null);
  assert.equal(Array.isArray(cluster.planned_satellites), true);
  assert.equal(cluster.planned_satellites.length, 0, "hypothesis-only emits empty supports until agent fills");
  assert.deepEqual(cluster.legacy_cluster.keyword_pool, []);

  // Files persisted
  const clusterFile = path.join(PROJECT_DIR, "clusters", "agentic-seo", "draft.yaml");
  assert.ok(existsSync(clusterFile));
  assert.ok(existsSync(path.join(PROJECT_DIR, "clusters", "agentic-seo", "planejamento.md")));
  assert.equal(existsSync(path.join(PROJECT_DIR, "clusters", "agentic-seo", "cluster.json")), false);
  assert.equal(existsSync(path.join(PROJECT_DIR, "clusters", "agentic-seo", "cluster.yaml")), false);
  const draftYaml = YAML.parse(readFileSync(clusterFile, "utf8"));
  assert.equal(draftYaml.contract_version, 1);
  assert.equal(draftYaml.provenance.hypothesis_only, true);
  const brainFile = path.join(PROJECT_DIR, "brain", "topic-clusters.md");
  assert.ok(existsSync(brainFile));
  const brainContent = readFileSync(brainFile, "utf8");
  assert.doesNotMatch(brainContent, /## Cluster: agentic seo/);

  // Log entry written
  const log = readFileSync(path.join(PROJECT_DIR, "brain", "log.md"), "utf8");
  assert.match(log, /agentic seo/);
  assert.match(log, /proposta salva como draft\.yaml|Proposta de Topic Cluster/);
  assert.match(log, new RegExp(cluster.report_md.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  // Hypothesis-only promotion blocks without explicit human approver
  const blocked = spawnSync(BIN, ["topic-cluster", "--seed", "agentic seo", "--phase", "promote"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: PROJECT_DIR } });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /requires an approver/);

  const stillBlocked = spawnSync(BIN, ["topic-cluster", "--seed", "agentic seo", "--phase", "promote", "--approved-by", "Diego Ivo"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: PROJECT_DIR } });
  assert.notEqual(stillBlocked.status, 0);
  assert.match(stillBlocked.stderr, /human_data_bypass_confirmed/);

  const draftForPromotion = YAML.parse(readFileSync(clusterFile, "utf8"));
  draftForPromotion.provenance.human_data_bypass_confirmed = "Diego Ivo confirmou promover cluster hipótese em 2026-05-28.";
  writeFileSync(clusterFile, YAML.stringify(draftForPromotion, { lineWidth: 0 }), "utf8");
  const promoted = run("topic-cluster", "--seed", "agentic seo", "--phase", "promote", "--approved-by", "Diego Ivo");
  assert.equal(promoted.ok, true);
  assert.equal(promoted.companion_path, "brain-topic-clusters-agentic-seo");
  assert.ok(existsSync(path.join(PROJECT_DIR, "clusters", "agentic-seo", "cluster.yaml")));
  assert.ok(existsSync(path.join(PROJECT_DIR, "brain", "topic-clusters", "agentic-seo.md")));

  // --render-only path: don't refetch, just rerender
  const rendered = run("topic-cluster", "--seed", "agentic seo", "--render-only");
  assert.equal(rendered.ok, true);
  assert.equal(rendered.rendered, true);

  console.log("topic cluster hypothesis e2e ok");
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
