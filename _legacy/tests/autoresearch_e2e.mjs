// End-to-end smoke: init → frame → commit → baseline → 4× record → finalize.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "scripts/autoresearch.mjs");
const sandbox = mkdtempSync(join(tmpdir(), "autoresearch-e2e-"));

function run(...args) {
  const res = spawnSync("node", [cli, ...args], { cwd: sandbox, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`CLI failed: ${args.join(" ")}\nstderr: ${res.stderr}`);
  return res.stdout.trim().startsWith("{") ? JSON.parse(res.stdout) : res.stdout;
}

// 1) init
const init = run("init", "--problem", "Improve hero headline", "--max-iter", "4", "--threshold", "90", "--plateau", "2");
assert.match(init.run_id, /^\d{8}-\d{6}-improve-hero-headline$/);
assert.equal(init.phase, "framing");
const runId = init.run_id;

// 2) frame-metrics
const candidatesPath = join(sandbox, "candidates.json");
writeFileSync(candidatesPath, JSON.stringify({
  metrics: [
    { id: "len", type: "executable", source: "title.length <= 60", weight: 1, scoring: "binary" },
    { id: "voice", type: "judge", source: "alinhamento com tom de voz", weight: 2, scoring: "0_to_100" },
  ],
  aggregation: "weighted_mean",
  scale: "0_to_100",
}));
const framed = run("frame-metrics", "--run", runId, "--candidates", candidatesPath);
assert.equal(framed.status, "framed");

// 3) commit-metrics
const committed = run("commit-metrics", "--run", runId);
assert.equal(committed.count, 2);

// 4) set-baseline
const baselinePath = join(sandbox, "baseline.md");
writeFileSync(baselinePath, "# baseline headline (long, off-voice)\n");
const baseline = run("set-baseline", "--run", runId, "--artifact", baselinePath, "--scores", JSON.stringify({ len: 0, voice: 30 }));
assert.equal(baseline.status, "baseline_set");
assert.equal(baseline.agg, 20);

// 5) record 3 iterations with rising scores; threshold=90 should stop us at iter 3
const iter1 = join(sandbox, "iter-1.md");
writeFileSync(iter1, "# headline v1\n");
const r1 = run("record", "--run", runId, "--variation", iter1, "--rationale", "shortens to fit length budget", "--scores", JSON.stringify({ len: 100, voice: 50 }));
assert.equal(r1.decision, "continue");
assert.equal(r1.iter, 1);

const iter2 = join(sandbox, "iter-2.md");
writeFileSync(iter2, "# headline v2 with brand voice\n");
const r2 = run("record", "--run", runId, "--variation", iter2, "--rationale", "iter 1 was on length but flat; this adds brand voice cue", "--scores", JSON.stringify({ len: 100, voice: 80 }));
assert.equal(r2.decision, "continue");
assert.equal(r2.iter, 2);
assert.equal(r2.best.iter, 2);

const iter3 = join(sandbox, "iter-3.md");
writeFileSync(iter3, "# headline v3 sharper\n");
const r3 = run("record", "--run", runId, "--variation", iter3, "--rationale", "iter 2 hit voice but lacks specificity; this adds the proof", "--scores", JSON.stringify({ len: 100, voice: 100 }));
assert.equal(r3.decision, "stop:threshold", "should stop on threshold (100 >= 90)");
assert.equal(r3.best.iter, 3);
assert.equal(r3.best.score, 100);

// 6) finalize
const fin = run("finalize", "--run", runId);
assert.ok(existsSync(fin.winner));
assert.ok(existsSync(fin.summary));
assert.equal(fin.reason, "stop:threshold");

const summaryText = readFileSync(fin.summary, "utf8");
assert.match(summaryText, /Iterations: 3/);
assert.match(summaryText, /Best score: 100/);
assert.match(summaryText, /Stop reason: stop:threshold/);

// 7) journal coherence
const runDir = init.run_dir;
const journalLines = readFileSync(join(runDir, "journal.jsonl"), "utf8").trim().split("\n");
const events = journalLines.map((l) => JSON.parse(l));
assert.equal(events.filter((e) => e.event === "metrics_committed").length, 1);
assert.equal(events.filter((e) => e.event === "baseline").length, 1);
assert.equal(events.filter((e) => e.event === "iteration").length, 3);
assert.equal(events.filter((e) => e.event === "decision").length, 3);
assert.equal(events.filter((e) => e.event === "finalize").length, 1);

// 8) resume returns coherent state
const resumed = run("resume", "--run", runId);
assert.equal(resumed.state.phase, "finalized");
assert.equal(resumed.state.iter, 3);

// 9) anti-duplicate: re-recording iter-3 byte-identical should fail
const dupRes = spawnSync("node", [cli, "record", "--run", runId, "--variation", iter3, "--rationale", "dup", "--scores", JSON.stringify({ len: 100, voice: 100 })], { cwd: sandbox, encoding: "utf8" });
assert.notEqual(dupRes.status, 0);
assert.match(dupRes.stderr, /byte-identical/);

rmSync(sandbox, { recursive: true, force: true });
console.log("autoresearch_e2e ok");
