import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { slugify as baseSlugify } from "../../../shared/locale.mjs";

export function slugify(text, maxLen = 32) {
  return baseSlugify(text).slice(0, maxLen).replace(/-+$/, "");
}

function timestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export function generateRunId(problem, now = new Date()) {
  return `${timestamp(now)}-${slugify(problem, 32)}`;
}

export function resolveProjectRoot(cwd) {
  const configured = process.env.CLAUDE_PLUGIN_OPTION_project_dir || process.env.AGENTIC_SEO_PROJECT_DIR;
  if (configured) return configured.startsWith("/") ? configured : join(cwd, configured);
  return join(cwd, "project");
}

export function resolveRunDir(cwd, runId) {
  const projectRoot = resolveProjectRoot(cwd);
  if (existsSync(join(projectRoot, ".agentic-seo"))) {
    return join(projectRoot, ".context", "autoresearch", runId);
  }
  return join(cwd, ".context", "autoresearch", runId);
}

function nowIso() {
  return new Date().toISOString();
}

function atomicWriteJson(filePath, value) {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8");
  renameSync(tmp, filePath);
}

export function createRun({ cwd, problem, mode = "general", maxIter = 8, threshold = 80, plateauWindow = 3 }) {
  const now = new Date();
  const runId = generateRunId(problem, now);
  const runDir = resolveRunDir(cwd, runId);
  const projectRoot = resolveProjectRoot(cwd);
  mkdirSync(runDir, { recursive: true });
  const state = {
    run_id: runId,
    problem,
    mode,
    max_iter: maxIter,
    threshold,
    plateau_window: plateauWindow,
    phase: "framing",
    iter: 0,
    best: { iter: null, score: null, path: null },
    history: [],
    project_root: existsSync(join(projectRoot, ".agentic-seo")) ? projectRoot : null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  atomicWriteJson(join(runDir, "state.json"), state);
  return { runId, runDir, state };
}

export function findRunDir(cwd, runId) {
  const rootDir = join(cwd, ".context", "autoresearch", runId);
  if (existsSync(rootDir)) return rootDir;
  const projectRunDir = join(resolveProjectRoot(cwd), ".context", "autoresearch", runId);
  if (existsSync(projectRunDir)) return projectRunDir;
  return null;
}

export function loadState(runDir) {
  const raw = readFileSync(join(runDir, "state.json"), "utf8");
  return JSON.parse(raw);
}

export function saveState(runDir, state) {
  const next = { ...state, updated_at: nowIso() };
  atomicWriteJson(join(runDir, "state.json"), next);
  return next;
}

export function loadMetrics(runDir) {
  const path = join(runDir, "metrics.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function saveMetrics(runDir, metrics) {
  atomicWriteJson(join(runDir, "metrics.json"), metrics);
}
