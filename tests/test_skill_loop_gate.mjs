import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const script = resolve(root, "scripts", "skill-loop.mjs");

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

const init = run(["init", "seo-tools-creator", "--threshold", "90", "--max-iter", "5"]);
assert.equal(init.status, 0, init.stderr);
const initJson = JSON.parse(init.stdout);

const approval = resolve(root, ".context", "skill-evals", "seo-tools-creator", initJson.run_id, "low-approval.json");
mkdirSync(resolve(root, ".context", "skill-evals", "seo-tools-creator", initJson.run_id), { recursive: true });
writeFileSync(approval, JSON.stringify({
  run_id: initJson.run_id,
  score: 50,
  decision: "revise",
  breakdown: {
    task_clarity: 50,
    self_sufficiency: 0,
    examples: 100,
    output_format: 50,
    critical_points: 50,
    behavioral_parity: 50,
    length_within_budget: 100,
  },
}, null, 2));

const record = run(["record", "seo-tools-creator", "--run", initJson.run_id, "--approval", approval, "--artifact", "skills/seo-tools-creator/SKILL.md"]);
assert.equal(record.status, 0, record.stderr);

const finalize = run(["finalize", "seo-tools-creator", "--run", initJson.run_id]);
assert.notEqual(finalize.status, 0);
assert.match(finalize.stderr, /below threshold/);

console.log("skill-loop gate ok");
