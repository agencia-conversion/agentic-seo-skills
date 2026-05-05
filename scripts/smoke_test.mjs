#!/usr/bin/env node
// Offline smoke test for SEO Brain v0.1.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "seo-brain");
const TMP = mkdtempSync(path.join(tmpdir(), "seo-brain-smoke-"));
const PROJECT_DIR = path.join(TMP, "project");

function run(...args) {
  const result = spawnSync(BIN, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, SEO_BRAIN_PROJECT_DIR: PROJECT_DIR } });
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
  run("keyword-research", "--keyword", "seo agentico", "--mode", "offline");
  run("serp-extract", "--keyword", "seo agentico", "--mode", "offline");
  run("seo-analysis", "--keyword", "seo agentico");
  run("topic-cluster", "--seed", "seo agentico");
  run("eeat", "--claim", "Metodologia propria de SEO Agentico", "--status", "gap");
  const content = run("content-seo", "--topic", "O que e SEO agentico", "--keyword", "seo agentico", "--brief-approval", "auto");
  if (!Array.isArray(content.brief?.outline) || content.brief.outline.length < 3) throw new Error("content-seo did not generate an outline");
  run("backlink-analysis", "--target", "example.com", "--mode", "offline");
  run("next-website-creator");
  run("payload-cms");
  run("ux-web");
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
