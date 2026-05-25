#!/usr/bin/env node
// Install pre-commit hook that runs `cluster-sync --check`. Idempotent and
// preserves existing hook contents. Specified in topic-clusters-contract.md § 13.

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = args.includes("--dry-run") || !apply;

let gitDir;
try {
  gitDir = execSync("git rev-parse --git-dir", { encoding: "utf8" }).trim();
} catch {
  console.error("Not inside a git repository.");
  process.exit(2);
}
const hookPath = join(gitDir, "hooks", "pre-commit");
const marker = "# >>> agentic-seo cluster-sync hook";
const endMarker = "# <<< agentic-seo cluster-sync hook";
const block = [
  marker,
  `cd "${pluginRoot}" || exit 0`,
  "if [ -f scripts/cluster-sync.mjs ] && [ -f dist/commands/cluster-sync.js ]; then",
  "  node scripts/cluster-sync.mjs --check || { echo 'cluster-sync --check failed' >&2; exit 1; }",
  "fi",
  endMarker,
].join("\n");

let existing = "";
if (existsSync(hookPath)) existing = readFileSync(hookPath, "utf8");

let next;
if (existing.includes(marker) && existing.includes(endMarker)) {
  const re = new RegExp(`${marker}[\\s\\S]*?${endMarker}`, "m");
  next = existing.replace(re, block);
} else if (existing.trim().length === 0) {
  next = `#!/bin/sh\n\n${block}\n`;
} else {
  next = `${existing.replace(/\s*$/, "")}\n\n${block}\n`;
}

console.log(`Hook path: ${hookPath}`);
if (dryRun) {
  console.log("(dry-run) Conteúdo proposto:");
  console.log(next);
  console.log("Rode novamente com --apply para gravar.");
  process.exit(0);
}

mkdirSync(dirname(hookPath), { recursive: true });
writeFileSync(hookPath, next, "utf8");
chmodSync(hookPath, 0o755);
console.log("Hook instalado. Pre-commit roda `cluster-sync --check`.");
