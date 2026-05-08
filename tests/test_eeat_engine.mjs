import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { buildRater, statesAllPresent, statesAllAbsent } from "./fixtures/eeat/rater-builder.mjs";

const root = resolve(import.meta.dirname, "..");
const engine = resolve(root, "scripts", "eeat.mjs");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-eeat-"));
const projectDir = join(tmp, "project");
const env = { ...process.env, SEO_BRAIN_PROJECT_DIR: projectDir };

mkdirSync(join(projectDir, "brain"), { recursive: true });
writeFileSync(join(projectDir, "brain", "identidade.md"), "# Identidade\n", "utf8");

function runEngine(args) {
  const stdout = execFileSync("node", [engine, ...args], { cwd: root, encoding: "utf8", env });
  return JSON.parse(stdout);
}

const init = runEngine(["init", "--mode", "brain", "--slug", "test"]);
assert.ok(init.run_id);
assert.ok(existsSync(resolve(root, init.manifest_path)));
assert.equal(init.rater_output_paths.length, 3);

for (const [i, outPath] of init.rater_output_paths.entries()) {
  const rater = buildRater({ raterId: `rater-${i + 1}`, states: statesAllPresent() });
  mkdirSync(resolve(root, outPath, ".."), { recursive: true });
  writeFileSync(resolve(root, outPath), JSON.stringify(rater, null, 2), "utf8");
}

const validation = runEngine(["validate", "--rater-output", init.rater_output_paths[0]]);
assert.equal(validation.ok, true);

const consensus = runEngine(["consensus", "--run", init.run_id]);
assert.equal(consensus.ok, true);
assert.equal(consensus.score, 100);
assert.equal(consensus.page_quality, "Highest");
assert.equal(consensus.narrative_pending, true);
const reportJson = JSON.parse(readFileSync(resolve(root, consensus.report_json), "utf8"));
assert.ok(reportJson.checklist_consensus.experience.length > 0);
assert.ok(reportJson._audit.rater_narratives.length === 3, "rater narratives preserved in _audit");
assert.equal(reportJson.consolidated_narrative, null);
assert.ok(reportJson.numeric_scores);
assert.equal(reportJson.numeric_scores.trust, 100);

const mdBeforeSynth = readFileSync(resolve(root, consensus.report_md), "utf8");
assert.ok(mdBeforeSynth.includes("Score por pilar"));
assert.ok(mdBeforeSynth.includes("Tipo de página"));
assert.ok(mdBeforeSynth.includes("Issues priorizadas"));
assert.ok(mdBeforeSynth.includes("Critério"));
assert.ok(mdBeforeSynth.includes("| Item | Critério | Aplicabilidade | Estado | Score | Evidência |"));
assert.ok(!mdBeforeSynth.includes("Scores por rater"), "per-rater divergence block removed");
assert.ok(!mdBeforeSynth.includes("rater-1"), "individual rater ids not surfaced in md");
assert.ok(mdBeforeSynth.includes("Narrativa consolidada ainda não foi sintetizada"));

const synth = runEngine(["synthesize", "--run", init.run_id, "--narrative", "Análise consolidada de teste com mais de oitenta caracteres para passar a validação mínima do engine."]);
assert.equal(synth.ok, true);
const mdAfterSynth = readFileSync(resolve(root, consensus.report_md), "utf8");
assert.ok(mdAfterSynth.includes("Análise consolidada de teste"));
assert.ok(!mdAfterSynth.includes("Narrativa consolidada ainda não foi sintetizada"));

let synthRejected = false;
try { runEngine(["synthesize", "--run", init.run_id, "--narrative", "muito curto"]); } catch { synthRejected = true; }
assert.ok(synthRejected, "synthesize must reject short narratives");

const init2 = runEngine(["init", "--mode", "brain", "--slug", "trust-gate"]);
for (const [i, outPath] of init2.rater_output_paths.entries()) {
  const rater = buildRater({ raterId: `rater-${i + 1}`, states: statesAllAbsent() });
  writeFileSync(resolve(root, outPath), JSON.stringify(rater, null, 2), "utf8");
}
const consensus2 = runEngine(["consensus", "--run", init2.run_id]);
assert.equal(consensus2.score, 0);
assert.equal(consensus2.page_quality, "Lowest");
const report2 = JSON.parse(readFileSync(resolve(root, consensus2.report_json), "utf8"));
assert.ok(report2.gate_flags.includes("trust_gate_triggered"));
assert.equal(report2.page_type, "homepage");
assert.equal(reportJson.checklist_consensus.experience.find((i) => i.id === "ex1").criterion_score, 100);

let invalidThrew = false;
try {
  const bad = buildRater({ raterId: "rater-1", states: statesAllPresent() });
  delete bad.ratings.experience;
  const tmpFile = join(tmp, "bad.json");
  writeFileSync(tmpFile, JSON.stringify(bad), "utf8");
  runEngine(["validate", "--rater-output", tmpFile]);
} catch {
  invalidThrew = true;
}
assert.ok(invalidThrew, "validate must fail on missing pillar");

rmSync(tmp, { recursive: true, force: true });
console.log("eeat engine ok");
