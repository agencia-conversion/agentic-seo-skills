#!/usr/bin/env node
/* SPDX-License-Identifier: MIT
 * Agentic SEO site-import CLI.
 * Discovers URLs in a target sitemap, extracts each page via tools/clis/extract.js,
 * classifies by URL pattern, and writes project/contents/<origin>/<slug>.md with
 * frontmatter contract_version: 1. Idempotent: skips files already present.
 * Implementation lives in scripts/import-site.mjs; this wrapper provides the
 * stable tools/clis/ entry point and the JSON envelope used by other tools.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "import-site.mjs");

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { result._.push(arg); continue; }
    const key = arg.slice(2).replaceAll("-", "_");
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) result[key] = true;
    else { result[key] = next; i++; }
  }
  return result;
}

function fail(message, code = 1, extra = {}) {
  console.error(JSON.stringify({ ok: false, provider: "site-import", error: message, ...extra }, null, 2));
  process.exit(code);
}

function ok(payload) {
  console.log(JSON.stringify({ ok: true, provider: "site-import", ...payload }, null, 2));
}

function help() {
  ok({
    usage: "node tools/clis/site-import.js [--base <url>] [--dry-run] [--limit <n>]",
    notes: [
      "Default base: https://agenticseo.sh",
      "Discovers <url>/sitemap.xml, classifies URLs (blog → contents/blog/; tools/cursos/ai-metrics → contents/other/), extracts each via extract.js, writes Markdown with frontmatter contract_version: 1.",
      "Output: stable JSON envelope when invoked with --json; otherwise streams human progress.",
    ],
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return help();
  const cli = ["--no-warnings", SCRIPT];
  if (args.dry_run) cli.push("--dry-run");
  if (args.base) cli.push("--base", args.base);
  if (args.limit) cli.push("--limit", String(args.limit));
  const res = spawnSync(process.execPath, cli, { cwd: ROOT, encoding: "utf8" });
  if (res.error) return fail(`spawn failed: ${res.error.message}`, 2);
  const stdout = (res.stdout || "").trim();
  const stderr = (res.stderr || "").trim();
  if (res.status !== 0) return fail(`import-site failed (exit ${res.status})`, res.status || 1, { stderr });
  const summaryLine = stdout.split(/\r?\n/).reverse().find((l) => l.startsWith("Summary: "));
  let summary = null;
  if (summaryLine) {
    try { summary = JSON.parse(summaryLine.replace(/^Summary:\s*/, "")); } catch {}
  }
  if (args.json) return ok({ summary, stdout, stderr });
  process.stdout.write(stdout + (stdout.endsWith("\n") ? "" : "\n"));
  if (stderr) process.stderr.write(stderr + "\n");
}

main();
