#!/usr/bin/env node
// Offline smoke test for SEO Brain v0.1.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "seo-brain");

function run(...args) {
  const result = spawnSync(BIN, args, { cwd: ROOT, encoding: "utf8" });
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
  const project = `smoke-${Math.floor(Date.now() / 1000)}`;
  run("project-init", project);
  const lint = run("wiki-lint", "--project", project);
  if (!lint.ok) throw new Error("Wiki lint failed");
  run("data-setup");
  run("keyword-research", "--project", project, "--keyword", "seo agentico", "--mode", "offline");
  run("serp-extract", "--project", project, "--keyword", "seo agentico", "--mode", "offline");
  run("seo-analysis", "--project", project, "--keyword", "seo agentico");
  run("topic-cluster", "--project", project, "--seed", "seo agentico");
  run("eeat", "--project", project, "--claim", "Metodologia propria de SEO Agentico", "--status", "gap");
  run("content-seo", "--project", project, "--topic", "O que e SEO agentico", "--keyword", "seo agentico");
  run("backlink-analysis", "--project", project, "--target", "example.com", "--mode", "offline");
  run("next-website-creator", "--project", project);
  run("payload-cms", "--project", project);
  run("ux-web", "--project", project);
  const technical = run(
    "technical-seo",
    "--html-file",
    path.join(ROOT, "tests", "fixtures", "technical-seo-valid.html"),
    "--page-type",
    "blog-post",
  );
  if (!technical.ok) throw new Error("Technical SEO valid fixture failed");
  const autoresearch = run("autoresearch");
  if (!autoresearch.ok) throw new Error("Autoresearch failed");
  process.stdout.write(JSON.stringify({ ok: true, project }) + "\n");
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}
