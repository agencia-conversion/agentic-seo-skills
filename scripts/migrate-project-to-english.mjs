#!/usr/bin/env node
// One-off migration: legacy Portuguese-schema project → English schema.
// Idempotent. Re-running on a migrated project is a noop.
// Usage: node scripts/migrate-project-to-english.mjs --root <path> [--dry-run] [--verbose]

import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { renamePlan, applyRenames } from "./lib/migrate-project-to-english/renames.mjs";
import { rewriteClusterYamls } from "./lib/migrate-project-to-english/cluster-yaml.mjs";
import { rewriteBrainLog } from "./lib/migrate-project-to-english/log.mjs";
import { rewriteContentFrontmatter } from "./lib/migrate-project-to-english/frontmatter.mjs";
import { rewriteBrainWikilinks } from "./lib/migrate-project-to-english/wikilinks.mjs";
import { appendAuditEntry } from "./lib/migrate-project-to-english/audit.mjs";

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const root = autoDetectRoot(opts.root);
  const ctx = { root, dryRun: opts.dryRun, verbose: opts.verbose, log: [] };

  const renames = renamePlan(root);
  applyRenames(renames, ctx);
  rewriteClusterYamls(ctx);
  rewriteBrainLog(ctx);
  rewriteContentFrontmatter(ctx);
  rewriteBrainWikilinks(ctx);

  const summary = buildSummary(ctx);
  if (!ctx.dryRun && summary.renamed + summary.rewritten > 0) {
    appendAuditEntry(ctx, summary);
  }
  printSummary(summary, ctx);
  return summary;
}

function parseArgs(argv) {
  const opts = { root: null, dryRun: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") opts.root = argv[++i];
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--verbose") opts.verbose = true;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (!opts.root) {
    console.error("Missing --root <path>");
    process.exit(2);
  }
  opts.root = resolve(opts.root);
  if (!existsSync(opts.root) || !statSync(opts.root).isDirectory()) {
    console.error(`Root not found or not a directory: ${opts.root}`);
    process.exit(2);
  }
  return opts;
}

function autoDetectRoot(root) {
  if (existsSync(join(root, "brain", "index.md"))) return root;
  // Single-project layout: descend into the only sub-folder that has brain/index.md.
  const fs = (() => {
    try {
      return statSync(root);
    } catch {
      return null;
    }
  })();
  if (!fs || !fs.isDirectory()) return root;
  // Best-effort: try common single-project pattern <root>/<name>/brain/index.md.
  const candidates = [];
  for (const name of safeReaddir(root)) {
    const sub = join(root, name);
    if (statSync(sub).isDirectory() && existsSync(join(sub, "brain", "index.md"))) {
      candidates.push(sub);
    }
  }
  if (candidates.length === 1) return candidates[0];
  return root;
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function buildSummary(ctx) {
  const renamed = ctx.log.filter((e) => e.kind === "rename").length;
  const rewritten = ctx.log.filter((e) => e.kind === "rewrite").length;
  return { renamed, rewritten, noop: renamed + rewritten === 0, root: ctx.root, dryRun: ctx.dryRun };
}

function printSummary(summary, ctx) {
  const prefix = summary.dryRun ? "[dry-run] " : "";
  if (ctx.verbose) {
    for (const entry of ctx.log) {
      console.log(`${prefix}${entry.kind}: ${entry.detail}`);
    }
  }
  console.log(
    `${prefix}migration summary: renamed=${summary.renamed} rewritten=${summary.rewritten} noop=${summary.noop}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
