#!/usr/bin/env node
// Offline smoke test for SEO Brain v0.1.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "seo-brain");
const TMP = mkdtempSync(path.join(tmpdir(), "seo-brain-smoke-"));
const PROJECT_DIR = path.join(TMP, "project");

function run(...args) {
  const result = spawnSync(BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, SEO_BRAIN_PROJECT_DIR: PROJECT_DIR, DATAFORSEO_LOGIN: "smoke-login", DATAFORSEO_PASSWORD: "smoke-password" } });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`Command failed: seo-brain ${args.join(" ")}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { ok: true, stdout: result.stdout };
  }
}

function main() {
  run("project-init", "Smoke test");
  const lint = run("wiki-lint");
  if (!lint.ok) throw new Error("Wiki lint failed");
  run("data-setup");
  run("keyword-research", "--keyword", "seo agêntico", "--mode", "offline");
  run("serp-extract", "--keyword", "seo agêntico", "--mode", "offline");
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
  run("seo-analysis", "--keyword", "seo agêntico");
  run("topic-cluster", "--seed", "seo agêntico", "--hypothesis-only");
  const eeatInit = spawnSync("node", [path.join(ROOT, "scripts", "eeat.mjs"), "init", "--mode", "wiki", "--slug", "smoke"], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, SEO_BRAIN_PROJECT_DIR: PROJECT_DIR },
  });
  if (eeatInit.status !== 0) throw new Error(`eeat init failed: ${eeatInit.stderr}`);
  const eeatRun = JSON.parse(eeatInit.stdout);
  if (!eeatRun.run_id) throw new Error("eeat init did not return run_id");
  const content = run("content-seo", "--topic", "O que é SEO agêntico", "--keyword", "seo agêntico", "--top3-bypass-confirmed", "--top3-bypass-reason", "smoke test offline sem fetch de concorrentes");
  if (content.status !== "approval_required") throw new Error("content-seo should stop at approval_required");
  if (!Array.isArray(content.brief?.brief?.outline) || content.brief.brief.outline.length < 3) throw new Error("content-seo did not generate an outline");
  const briefPath = path.join(PROJECT_DIR, "workbench", "content", "o-que-e-seo-agentico", "brief.yaml");
  const brief = YAML.parse(fs.readFileSync(briefPath, "utf8"));
  if (!Array.isArray(brief.brief?.outline) || brief.brief.outline.length < 3) throw new Error("content-seo did not persist a YAML outline");
  if (!fs.existsSync(path.join(PROJECT_DIR, "workbench", "content", "o-que-e-seo-agentico", "context-evidence.yaml"))) throw new Error("content-seo did not persist context evidence");
  if (fs.existsSync(path.join(PROJECT_DIR, "workbench", "content", "o-que-e-seo-agentico", "draft.md"))) throw new Error("content-seo wrote a draft during briefing phase");
  const approval = run("content-seo", "--phase", "approve", "--topic", "O que é SEO agêntico", "--approved-by", "Smoke Test", "--approval-notes", "Tom de voz em draft reconhecido.");
  if (approval.status !== "draft_created") throw new Error("content-seo approval should create artifact draft");
  if (!fs.existsSync(path.join(PROJECT_DIR, "artifacts", "contents", "o-que-e-seo-agentico", "draft.md"))) throw new Error("content-seo approval did not write artifact draft");
  run("backlink-analysis", "--target", "example.com", "--mode", "offline");
  run("next-website-creator");
  run("payload-cms");
  const technical = run(
    "technical-seo",
    "--html-file",
    path.join(ROOT, "tests", "fixtures", "technical-seo-valid.html"),
    "--page-type",
    "blog-post",
  );
  if (!technical.ok) throw new Error("Technical SEO valid fixture failed");
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
