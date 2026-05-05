import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ASCII_FOLD = {
  á: "a", à: "a", ã: "a", â: "a", ä: "a", å: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", õ: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
};

export function slugify(text, maxLen = 32) {
  const folded = text.toLowerCase().replace(/./g, (ch) => ASCII_FOLD[ch] ?? ch);
  const kebab = folded
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return kebab.slice(0, maxLen).replace(/-+$/, "");
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

export function resolveRunDir(cwd, runId, projectSlug) {
  if (projectSlug) {
    const projectMarker = join(cwd, "projects", projectSlug, ".seo-brain");
    if (existsSync(projectMarker)) {
      return join(cwd, "projects", projectSlug, ".context", "autoresearch", runId);
    }
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

export function createRun({ cwd, problem, mode = "general", maxIter = 8, threshold = 8, plateauWindow = 3, projectSlug = null }) {
  const now = new Date();
  const runId = generateRunId(problem, now);
  const runDir = resolveRunDir(cwd, runId, projectSlug);
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
    project_slug: projectSlug,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  atomicWriteJson(join(runDir, "state.json"), state);
  return { runId, runDir, state };
}

export function findRunDir(cwd, runId) {
  const rootDir = join(cwd, ".context", "autoresearch", runId);
  if (existsSync(rootDir)) return rootDir;
  const projectsRoot = join(cwd, "projects");
  if (!existsSync(projectsRoot)) return null;
  for (const slug of readdirSync(projectsRoot)) {
    const candidate = join(projectsRoot, slug, ".context", "autoresearch", runId);
    if (existsSync(candidate)) return candidate;
  }
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
