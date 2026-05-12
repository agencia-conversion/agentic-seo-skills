#!/usr/bin/env node
// CLI dispatcher for the /agentic-seo:autoresearch skill engine.
// See program.md and seo-skills-creator references for the current contract.

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {
  createRun, loadState, saveState, loadMetrics, saveMetrics, findRunDir,
} from "./lib/autoresearch/state.mjs";
import { aggregateScore, decideStop } from "./lib/autoresearch/scoring.mjs";
import { appendEvent, readJournal } from "./lib/autoresearch/journal.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) { out[key] = true; }
    else { out[key] = next; i++; }
  }
  return out;
}

function fail(msg, code = 1) {
  process.stderr.write(JSON.stringify({ error: msg }) + "\n");
  process.exit(code);
}

function ok(payload) {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}

function requireRun(cwd, runId) {
  if (!runId) fail("--run required");
  const dir = findRunDir(cwd, runId);
  if (!dir) fail(`run not found: ${runId}`);
  return dir;
}

const SUBCOMMANDS = {
  init(args, cwd) {
    if (!args.problem) fail("--problem required");
    const legacyProjectFlag = ["project", "slug"].join("-");
    if (args[legacyProjectFlag]) fail("The legacy project selector is no longer supported; Agentic SEO uses the single project at project/.");
    const created = createRun({
      cwd,
      problem: args.problem,
      mode: args.mode ?? "general",
      maxIter: args["max-iter"] ? Number(args["max-iter"]) : 8,
      threshold: args.threshold ? Number(args.threshold) : 80,
      plateauWindow: args.plateau ? Number(args.plateau) : 3,
    });
    ok({ run_id: created.runId, run_dir: created.runDir, phase: created.state.phase });
  },

  "frame-metrics"(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    if (!args.candidates) fail("--candidates required (path to JSON file)");
    const draft = JSON.parse(fs.readFileSync(args.candidates, "utf8"));
    if (!Array.isArray(draft.metrics) || draft.metrics.length === 0) fail("candidates must have non-empty metrics array");
    fs.writeFileSync(path.join(runDir, "metrics-draft.json"), JSON.stringify(draft, null, 2) + "\n");
    ok({ status: "framed", count: draft.metrics.length });
  },

  "commit-metrics"(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    const draftPath = path.join(runDir, "metrics-draft.json");
    if (!fs.existsSync(draftPath)) fail("no draft metrics; run frame-metrics first");
    const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
    let committed;
    if (args.selected !== undefined && args.selected !== true) {
      const indices = String(args.selected).split(",").map(Number);
      committed = { ...draft, metrics: indices.map((i) => draft.metrics[i]).filter(Boolean) };
    } else {
      committed = draft;
    }
    if (committed.metrics.length === 0) fail("no metrics selected");
    saveMetrics(runDir, committed);
    const state = loadState(runDir);
    saveState(runDir, { ...state, phase: "baselined" });
    appendEvent(runDir, { event: "metrics_committed", metrics_count: committed.metrics.length });
    ok({ status: "committed", count: committed.metrics.length });
  },

  "set-baseline"(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    const metrics = loadMetrics(runDir);
    if (!metrics) fail("commit metrics before setting baseline");
    if (!args.artifact) fail("--artifact required");
    if (!args.scores) fail("--scores required (JSON)");
    const text = fs.readFileSync(args.artifact, "utf8");
    fs.writeFileSync(path.join(runDir, "baseline.md"), text);
    const scores = JSON.parse(args.scores);
    const agg = aggregateScore(scores, metrics);
    appendEvent(runDir, { event: "baseline", artifact_path: "baseline.md", scores, agg });
    const state = loadState(runDir);
    saveState(runDir, { ...state, phase: "looping" });
    ok({ status: "baseline_set", agg });
  },

  record(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    const metrics = loadMetrics(runDir);
    if (!metrics) fail("metrics not committed");
    if (!args.variation || !args.rationale || !args.scores) {
      fail("--variation, --rationale, --scores required");
    }
    const variationText = fs.readFileSync(args.variation, "utf8");
    const sizeKB = Buffer.byteLength(variationText, "utf8") / 1024;
    if (sizeKB > 50) fail(`variation too large: ${sizeKB.toFixed(1)} KB (hard reject >50)`);
    const warning = sizeKB > 5 ? `variation size ${sizeKB.toFixed(1)} KB (soft warn >5)` : null;
    const hash = createHash("sha256").update(variationText).digest("hex");
    const priorHashes = new Set(readJournal(runDir).filter((e) => e.event === "iteration").map((e) => e.hash));
    if (priorHashes.has(hash)) fail("variation byte-identical to a prior iteration");

    const state = loadState(runDir);
    const iter = state.iter + 1;
    const variationName = `iter-${iter}.md`;
    fs.writeFileSync(path.join(runDir, variationName), variationText);
    const scores = JSON.parse(args.scores);
    const agg = aggregateScore(scores, metrics);
    const keep = args.keep === undefined || args.keep === true ? true : args.keep === "true";

    appendEvent(runDir, {
      event: "iteration", iter, variation_path: variationName,
      rationale: args.rationale, scores, agg, keep, hash,
    });

    const history = [...state.history, { iter, score: agg }];
    const best = agg > (state.best.score ?? -Infinity)
      ? { iter, score: agg, path: variationName }
      : state.best;
    const decision = decideStop({ state: { ...state, iter }, history });

    appendEvent(runDir, {
      event: "decision", iter,
      decision: decision.decision, best_score: decision.best_score, reason: decision.reason,
    });
    saveState(runDir, { ...state, iter, history, best });
    ok({ ...decision, iter, best, warning });
  },

  finalize(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    const state = loadState(runDir);
    if (!state.best.path) fail("no iterations recorded; nothing to finalize");
    const journal = readJournal(runDir);
    const lastDecision = [...journal].reverse().find((e) => e.event === "decision");
    const reason = lastDecision?.decision ?? "manual";
    const winnerText = fs.readFileSync(path.join(runDir, state.best.path), "utf8");
    fs.writeFileSync(path.join(runDir, "winner.md"), winnerText);
    const summary = [
      `# Autoresearch Summary`, ``,
      `- Run: ${state.run_id}`,
      `- Problem: ${state.problem}`,
      `- Mode: ${state.mode}`,
      `- Iterations: ${state.iter}`,
      `- Best score: ${state.best.score} (iter ${state.best.iter})`,
      `- Stop reason: ${reason}`, ``,
      `## Trajectory`, ``,
      ...state.history.map((h) => `- iter ${h.iter}: ${h.score}`),
    ].join("\n") + "\n";
    fs.writeFileSync(path.join(runDir, "summary.md"), summary);
    appendEvent(runDir, { event: "finalize", best: state.best, reason });
    saveState(runDir, { ...state, phase: "finalized" });
    ok({ winner: path.join(runDir, "winner.md"), summary: path.join(runDir, "summary.md"), best: state.best, reason });
  },

  resume(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    ok({ run_dir: runDir, state: loadState(runDir), metrics: loadMetrics(runDir) });
  },

  report(args, cwd) {
    const runDir = requireRun(cwd, args.run);
    const state = loadState(runDir);
    const lines = [
      `# Run ${state.run_id}`,
      `Problem: ${state.problem}`,
      `Phase: ${state.phase} | Iter: ${state.iter} | Best: ${state.best.score ?? "n/a"}`,
      ``, `| iter | score |`, `|---|---|`,
      ...state.history.map((h) => `| ${h.iter} | ${h.score} |`),
    ];
    process.stdout.write(lines.join("\n") + "\n");
  },
};

const [, , sub, ...rest] = process.argv;
if (!sub || !(sub in SUBCOMMANDS)) {
  fail(`unknown subcommand: ${sub ?? "<none>"}. valid: ${Object.keys(SUBCOMMANDS).join(", ")}`);
}
SUBCOMMANDS[sub](parseArgs(rest), process.cwd());
