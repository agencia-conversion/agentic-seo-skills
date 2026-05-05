import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const {
  slugify,
  generateRunId,
  resolveRunDir,
  resolveProjectRoot,
  createRun,
  loadState,
  saveState,
  loadMetrics,
  saveMetrics,
} = await import("../scripts/lib/autoresearch/state.mjs");

const tmp = mkdtempSync(join(tmpdir(), "autoresearch-state-"));

// --- slugify ---
assert.equal(slugify("Quero melhorar o briefing X! Já!", 32), "quero-melhorar-o-briefing-x-ja");
assert.equal(slugify("UPPER lower 123", 32), "upper-lower-123");
assert.equal(slugify("a".repeat(50), 10), "a".repeat(10));
assert.equal(slugify("--leading and trailing--", 32), "leading-and-trailing");
assert.equal(slugify("àéîõü", 32), "aeiou");

// --- generateRunId ---
const runId = generateRunId("Improve hero headline");
assert.match(runId, /^\d{8}-\d{6}-improve-hero-headline$/);

// --- resolveRunDir ---
const projectRoot = join(tmp, "repo");
mkdirSync(join(projectRoot, "project", ".seo-brain"), { recursive: true });
assert.equal(resolveProjectRoot(projectRoot), join(projectRoot, "project"));
const dirWithProject = resolveRunDir(projectRoot, runId);
assert.equal(dirWithProject, join(projectRoot, "project", ".context", "autoresearch", runId));
rmSync(join(projectRoot, "project"), { recursive: true, force: true });
const dirFreeUse = resolveRunDir(projectRoot, runId);
assert.equal(dirFreeUse, join(projectRoot, ".context", "autoresearch", runId));
mkdirSync(join(projectRoot, "project", ".seo-brain"), { recursive: true });

// --- createRun ---
const created = createRun({
  cwd: projectRoot,
  problem: "Improve hero headline",
  mode: "general",
  maxIter: 8,
  threshold: 8,
  plateauWindow: 3,
});
assert.ok(existsSync(created.runDir), "runDir created");
assert.ok(existsSync(join(created.runDir, "state.json")), "state.json written");
assert.equal(created.state.problem, "Improve hero headline");
assert.equal(created.state.phase, "framing");
assert.equal(created.state.iter, 0);
assert.deepEqual(created.state.history, []);
assert.equal(created.state.project_root, join(projectRoot, "project"));

// --- saveState / loadState round-trip ---
const mutated = { ...created.state, iter: 2, phase: "looping", history: [{ iter: 1, score: 6.5 }, { iter: 2, score: 7.2 }] };
saveState(created.runDir, mutated);
const loaded = loadState(created.runDir);
assert.equal(loaded.iter, 2);
assert.equal(loaded.phase, "looping");
assert.equal(loaded.history.length, 2);
assert.equal(loaded.history[1].score, 7.2);
assert.notEqual(loaded.updated_at, created.state.updated_at, "updated_at refreshed on save");

// --- atomic write does not leave stray .tmp ---
const stray = join(created.runDir, "state.json.tmp");
assert.ok(!existsSync(stray), "no leftover .tmp file");

// --- metrics round-trip ---
const metrics = {
  metrics: [
    { id: "title-length", type: "executable", source: "title.length <= 60", weight: 1, scoring: "binary" },
    { id: "brand-voice", type: "judge", source: "alinhamento com tom-de-voz", weight: 2, scoring: "0_to_1" },
  ],
  aggregation: "weighted_mean",
  scale: "0_to_10",
};
saveMetrics(created.runDir, metrics);
const loadedMetrics = loadMetrics(created.runDir);
assert.equal(loadedMetrics.metrics.length, 2);
assert.equal(loadedMetrics.metrics[0].id, "title-length");
assert.equal(loadedMetrics.aggregation, "weighted_mean");

// --- loadMetrics returns null when file missing ---
const emptyDir = mkdtempSync(join(tmp, "empty-"));
assert.equal(loadMetrics(emptyDir), null);

rmSync(tmp, { recursive: true, force: true });
console.log("autoresearch_state ok");
