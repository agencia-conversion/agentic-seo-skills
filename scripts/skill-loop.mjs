#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVAL_ROOT = path.join(ROOT, ".context", "skill-evals");
const RUBRIC = path.join(ROOT, "skills", "seo-skills-creator", "references", "approval-rubric.md");
const TEMPLATE = path.join(ROOT, "skills", "seo-skills-creator", "references", "template-skill.md");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) out._.push(token);
    else out[token.slice(2).replaceAll("-", "_")] = argv[i + 1]?.startsWith("--") ? true : argv[++i] ?? true;
  }
  return out;
}

function fail(message) { console.error(JSON.stringify({ ok: false, error: message }, null, 2)); process.exit(1); }
function ok(payload) { console.log(JSON.stringify({ ok: true, ...payload }, null, 2)); }

function runAutoresearch(args) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "autoresearch.mjs"), ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) fail(result.stderr || result.stdout || `autoresearch failed: ${args.join(" ")}`);
  return JSON.parse(result.stdout);
}

function requireSkill(skill) {
  if (!skill || !/^[a-z0-9-]+$/.test(skill)) fail("skill name required, kebab-case only");
  const dir = path.join(ROOT, "skills", skill);
  const fixture = path.join(dir, "evals", "fixture.md");
  if (!fs.existsSync(fixture)) fail(`fixture missing: ${path.relative(ROOT, fixture)}`);
  return { dir, fixture };
}

function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); }
function writeText(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }

function init(skill, args) {
  const { dir, fixture } = requireSkill(skill);
  const created = runAutoresearch([
    "init",
    "--problem", `Refactor SEO Brain skill: ${skill}`,
    "--mode", "skill-loop",
    "--threshold", args.threshold ?? "90",
    "--max-iter", args.max_iter ?? "5",
    "--plateau", args.plateau ?? "5",
  ]);
  const loopDir = path.join(EVAL_ROOT, skill, created.run_id);
  fs.mkdirSync(loopDir, { recursive: true });
  const metricsFile = path.join(loopDir, "metrics.json");
  writeJson(metricsFile, {
    aggregation: "weighted_mean",
    scale: "0_to_100",
    metrics: [
      { id: "task_clarity", weight: 20, scoring: "continuous" },
      { id: "self_sufficiency", weight: 15, scoring: "binary" },
      { id: "examples", weight: 15, scoring: "binary" },
      { id: "output_format", weight: 15, scoring: "continuous" },
      { id: "critical_points", weight: 10, scoring: "continuous" },
      { id: "behavioral_parity", weight: 15, scoring: "continuous" },
      { id: "length_within_budget", weight: 10, scoring: "binary" },
    ],
  });
  runAutoresearch(["frame-metrics", "--run", created.run_id, "--candidates", metricsFile]);
  runAutoresearch(["commit-metrics", "--run", created.run_id]);
  const state = {
    skill,
    run_id: created.run_id,
    run_dir: created.run_dir,
    loop_dir: path.relative(ROOT, loopDir),
    status: "initialized",
    iteration: 0,
    threshold: Number(args.threshold ?? 90),
    max_iter: Number(args.max_iter ?? 5),
    fixture: path.relative(ROOT, fixture),
    skill_dir: path.relative(ROOT, dir),
    rubric: path.relative(ROOT, RUBRIC),
    template: path.relative(ROOT, TEMPLATE),
    roles: {
      developer: "writes or revises skills/<skill>/SKILL.md",
      executor: "uses only SKILL.md plus eval fixture and writes output/",
      approver: "grades SKILL.md and executor output with approval-rubric.md",
    },
  };
  writeJson(path.join(loopDir, "state.json"), state);
  writeText(path.join(loopDir, "developer-brief.md"), developerBrief(state));
  writeText(path.join(loopDir, "executor-brief.md"), executorBrief(state));
  writeText(path.join(loopDir, "approver-brief.md"), approverBrief(state));
  ok({ status: "initialized", skill, run_id: created.run_id, loop_dir: state.loop_dir });
}

function developerBrief(s) {
  return `# Developer Brief: ${s.skill}\n\nWrite or revise \`${s.skill_dir}/SKILL.md\` using \`${s.template}\`, \`${s.rubric}\`, and \`${s.fixture}\`.\n\nDo not read \`_legacy/\` unless assigned. Do not change unrelated skill directories.\n`;
}

function executorBrief(s) {
  return `# Executor Brief: ${s.skill}\n\nUse only \`${s.skill_dir}/SKILL.md\` and \`${s.fixture}\`.\n\nProduce the deliverable under \`${s.loop_dir}/iter-N/output/\`. Do not consult the rubric, prior iterations, or \`_legacy/\`.\n`;
}

function approverBrief(s) {
  return `# Approver Brief: ${s.skill}\n\nEvaluate \`${s.skill_dir}/SKILL.md\`, \`${s.fixture}\`, \`${s.loop_dir}/iter-N/output/\`, and \`${s.rubric}\`.\n\nWrite \`approval.json\` with score, breakdown, decision, defects, and notes. Threshold: ${s.threshold}.\n`;
}

function record(skill, args) {
  if (!args.approval) fail("--approval required");
  const approval = JSON.parse(fs.readFileSync(args.approval, "utf8"));
  const runId = args.run ?? approval.run_id;
  if (!runId) fail("--run required unless approval.json has run_id");
  const runDir = path.join(EVAL_ROOT, skill, runId);
  const statePath = path.join(runDir, "state.json");
  if (!fs.existsSync(statePath)) fail(`state not found: ${path.relative(ROOT, statePath)}`);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const iter = Number(args.iteration ?? state.iteration + 1);
  const iterDir = path.join(runDir, `iter-${iter}`);
  fs.mkdirSync(iterDir, { recursive: true });
  fs.copyFileSync(args.approval, path.join(iterDir, "approval.json"));
  const artifact = args.artifact ?? path.join(ROOT, "skills", skill, "SKILL.md");
  const scores = JSON.stringify(approval.breakdown ?? {});
  const decision = runAutoresearch([
    "record",
    "--run", runId,
    "--variation", artifact,
    "--rationale", approval.rationale ?? `skill-loop iteration ${iter}`,
    "--scores", scores,
    "--keep", approval.decision === "keep" ? "true" : "false",
  ]);
  const next = { ...state, iteration: iter, last_score: approval.score, last_decision: approval.decision, status: decision.decision };
  writeJson(statePath, next);
  ok({ status: "recorded", skill, run_id: runId, iteration: iter, score: approval.score, decision: decision.decision });
}

function status(skill, args) {
  const runId = args.run;
  if (!runId) {
    const dir = path.join(EVAL_ROOT, skill);
    if (!fs.existsSync(dir)) return ok({ status: "not_started", skill });
    return ok({ skill, runs: fs.readdirSync(dir).sort() });
  }
  const file = path.join(EVAL_ROOT, skill, runId, "state.json");
  if (!fs.existsSync(file)) fail(`state not found: ${path.relative(ROOT, file)}`);
  ok(JSON.parse(fs.readFileSync(file, "utf8")));
}

function finalize(skill, args) {
  if (!args.run) fail("--run required");
  const statePath = path.join(EVAL_ROOT, skill, args.run, "state.json");
  if (!fs.existsSync(statePath)) fail(`state not found: ${path.relative(ROOT, statePath)}`);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const passed = state.status === "stop:threshold" || Number(state.last_score) >= Number(state.threshold);
  const escalated = args.escalate === true || args.escalate === "true";
  if (!passed && !escalated) fail(`cannot finalize ${skill}: score ${state.last_score ?? "n/a"} is below threshold ${state.threshold}; use --escalate true only after max-iteration human escalation`);
  if (escalated && state.iteration < state.max_iter) fail(`cannot escalate ${skill}: iteration ${state.iteration} is below max_iter ${state.max_iter}`);
  const result = runAutoresearch(["finalize", "--run", args.run]);
  writeJson(statePath, { ...state, status: escalated ? "max_iter_escalated" : "finalized", finalized_at: new Date().toISOString() });
  ok({ status: escalated ? "max_iter_escalated" : "finalized", skill, run_id: args.run, result });
}

const args = parseArgs(process.argv.slice(2));
const [command = "init", skill] = args._;
if (!["init", "record", "status", "finalize"].includes(command)) fail("usage: skill-loop.mjs <init|record|status|finalize> <skill> [--run id]");
if (!skill) fail("skill required");
({ init, record, status, finalize })[command](skill, args);
