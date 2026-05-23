#!/usr/bin/env node
// Offline smoke test for Agentic SEO v0.1.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import YAML from "yaml";
import { buildRater, statesAllPresent } from "../tests/fixtures/eeat/rater-builder.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "agentic-seo");
const TMP = mkdtempSync(path.join(tmpdir(), "agentic-seo-smoke-"));
const PROJECT_DIR = path.join(TMP, "project");

function run(...args) {
  const result = spawnSync(BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: PROJECT_DIR, DATAFORSEO_LOGIN: "smoke-login", DATAFORSEO_PASSWORD: "smoke-password" } });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`Command failed: agentic-seo ${args.join(" ")}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { ok: true, stdout: result.stdout };
  }
}

function dataforseoBypassArgs(reason) {
  return [
    "--dataforseo-bypass-confirmed",
    "--dataforseo-bypass-reason",
    reason,
    "--dataforseo-bypass-approved-by",
    "Smoke Test",
    "--dataforseo-bypass-confirmation-text",
    "Confirmo seguir sem DataForSEO neste smoke test.",
    "--dataforseo-bypass-confirmed-at",
    "2026-05-06T00:00:00+00:00",
  ];
}

function assertReportContract(result, label) {
  if (!result.report_md) throw new Error(`${label} did not return report_md`);
  if (!result.browser_prompt?.recommended) throw new Error(`${label} did not recommend browser prompt`);
  if (result.browser_prompt.message !== "Posso abrir o Web Companion para você ver o relatório?") throw new Error(`${label} returned unexpected browser prompt`);
  if (!fs.existsSync(path.join(PROJECT_DIR, result.report_md))) throw new Error(`${label} report_md file is missing`);
  if (result.report_html) throw new Error(`${label} returned legacy report_html`);
  const log = fs.readFileSync(path.join(PROJECT_DIR, "brain", "log.md"), "utf8");
  if (!log.includes(result.report_md)) throw new Error(`${label} report_md was not registered in brain log`);
}

function main() {
  run("project-init", "Smoke test");
  const lint = run("brain-lint");
  if (!lint.ok) throw new Error("Brain lint failed");
  run("data-setup");
  assertReportContract(run("keyword-research", "--keyword", "seo agêntico", "--mode", "offline"), "keyword-research");
  assertReportContract(run("serp-extract", "--keyword", "seo agêntico", "--mode", "offline"), "serp-extract");
  const serpDir = path.join(PROJECT_DIR, "sources", "serp");
  fs.mkdirSync(serpDir, { recursive: true });
  fs.writeFileSync(path.join(serpDir, "99999999-999999-seo-agentico.normalized.yaml"), YAML.stringify({
    keyword: "seo agêntico",
    provider: "dataforseo",
    mode: "offline-fixture",
    timestamp: new Date().toISOString(),
    location: "Brazil",
    language: "pt",
    device: "desktop",
    organic_results: [
      { rank_absolute: 1, rank_group: 1, title: "SEO agêntico guia", url: "https://example.com/a", domain: "example.com", snippet: "Guia de SEO agêntico." },
      { rank_absolute: 2, rank_group: 2, title: "SEO agêntico exemplos", url: "https://example.org/b", domain: "example.org", snippet: "Exemplos de SEO agêntico." },
      { rank_absolute: 3, rank_group: 3, title: "SEO agêntico tecnologia", url: "https://example.net/c", domain: "example.net", snippet: "Tecnologia para SEO agêntico." },
    ],
    serp_features: [],
  }, { lineWidth: 0 }));
  assertReportContract(run("seo-analysis", "--keyword", "seo agêntico"), "seo-analysis");
  assertReportContract(run("topic-cluster", "--seed", "seo agêntico", "--hypothesis-only", ...dataforseoBypassArgs("smoke test hypothesis-only sem DataForSEO")), "topic-cluster");
  const eeatInit = spawnSync("node", [path.join(ROOT, "scripts", "eeat.mjs"), "init", "--mode", "brain", "--slug", "smoke"], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: PROJECT_DIR },
  });
  if (eeatInit.status !== 0) throw new Error(`eeat init failed: ${eeatInit.stderr}`);
  const eeatRun = JSON.parse(eeatInit.stdout);
  if (!eeatRun.run_id) throw new Error("eeat init did not return run_id");
  for (const [i, outPath] of eeatRun.rater_output_paths.entries()) {
    const rater = buildRater({ raterId: `rater-${i + 1}`, states: statesAllPresent() });
    fs.writeFileSync(path.resolve(ROOT, outPath), JSON.stringify(rater, null, 2), "utf8");
  }
  const eeatConsensus = spawnSync("node", [path.join(ROOT, "scripts", "eeat.mjs"), "consensus", "--run", eeatRun.run_id], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: PROJECT_DIR },
  });
  if (eeatConsensus.status !== 0) throw new Error(`eeat consensus failed: ${eeatConsensus.stderr}`);
  assertReportContract(JSON.parse(eeatConsensus.stdout), "eeat");
  const content = run("content-seo", "--topic", "O que é SEO agêntico", "--keyword", "seo agêntico", "--top3-bypass-confirmed", "--top3-bypass-reason", "smoke test offline sem fetch de concorrentes");
  if (content.status !== "ready_for_writing") throw new Error("content-seo should create a write-ready briefing");
  if (!Array.isArray(content.brief?.brief?.outline) || content.brief.brief.outline.length < 3) throw new Error("content-seo did not generate an outline");
  const briefPath = path.join(PROJECT_DIR, "workbench", "content", "o-que-e-seo-agentico", "brief.yaml");
  const brief = YAML.parse(fs.readFileSync(briefPath, "utf8"));
  if (!Array.isArray(brief.brief?.outline) || brief.brief.outline.length < 3) throw new Error("content-seo did not persist a YAML outline");
  if (!fs.existsSync(path.join(PROJECT_DIR, "workbench", "content", "o-que-e-seo-agentico", "context-evidence.yaml"))) throw new Error("content-seo did not persist context evidence");
  if (fs.existsSync(path.join(PROJECT_DIR, "workbench", "content", "o-que-e-seo-agentico", "draft.md"))) throw new Error("content-seo wrote a draft during briefing phase");
  const written = run("content-seo", "--phase", "write", "--topic", "O que é SEO agêntico");
  if (!written.draft_path) throw new Error("content-seo write should create artifact draft");
  if (!fs.existsSync(path.join(PROJECT_DIR, "artifacts", "contents", "o-que-e-seo-agentico", "draft.md"))) throw new Error("content-seo write did not write artifact draft");
  assertReportContract(run("backlink-analysis", "--target", "example.com", "--mode", "offline"), "backlink-analysis");
  assertReportContract(run("internal-links", "--pages-file", path.join(ROOT, "tests", "fixtures", "internal-links-pages.json"), "--target", "/seo-agentico/", "--topic", "SEO agêntico"), "internal-links");
  const technical = run(
    "technical-seo",
    "--html-file",
    path.join(ROOT, "tests", "fixtures", "technical-seo-valid.html"),
    "--page-type",
    "blog-post",
  );
  if (!technical.ok) throw new Error("Technical SEO valid fixture failed");
  assertReportContract(technical, "technical-seo");
  const auditSkills = run("audit-skills");
  if (!auditSkills.ok) throw new Error("audit-skills failed");
  process.stdout.write(JSON.stringify({ ok: true, project_dir: PROJECT_DIR }) + "\n");
}

try {
  main();
  rmSync(TMP, { recursive: true, force: true });
} catch (err) {
  rmSync(TMP, { recursive: true, force: true });
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}
