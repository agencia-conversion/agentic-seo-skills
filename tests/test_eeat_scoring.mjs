import assert from "node:assert/strict";
import { scoreRater, normalizeRaterOutput, pillarRatio } from "../scripts/lib/eeat/scoring.mjs";
import { buildRater, statesAllPresent, statesAllAbsent } from "./fixtures/eeat/rater-builder.mjs";

const allPresent = scoreRater(buildRater({ raterId: "rater-1", states: statesAllPresent() }), { mode: "wiki" });
assert.equal(allPresent.score, 100, "all-present must score 100");
assert.equal(allPresent.page_quality, "Highest");
for (const p of ["experience","expertise","authoritativeness","trust"]) assert.equal(allPresent.numeric_scores[p], 100);

const allAbsent = scoreRater(buildRater({ raterId: "rater-2", states: statesAllAbsent() }), { mode: "wiki" });
assert.equal(allAbsent.score, 0);
assert.equal(allAbsent.page_quality, "Lowest");
assert.ok(allAbsent.gate_flags.includes("trust_gate_triggered"));

// fine-grained pillar score, not bucketed: 5 of 11 weighted points → 5/11 ≈ 45.5
const partialExp = statesAllAbsent();
partialExp.ex1 = "present"; // weight 2
partialExp.ex3 = "present"; // weight 1
partialExp.ex4 = "partial"; // weight 1, value 0.5
const partial = scoreRater(buildRater({ raterId: "rater-1", states: partialExp }), { mode: "wiki" });
assert.ok(partial.numeric_scores.experience > 30 && partial.numeric_scores.experience < 40, `expected ~35.7, got ${partial.numeric_scores.experience}`);

const trustOnly = statesAllAbsent();
for (const id of ["tr1","tr2","tr3","tr4","tr5","tr6","tr7","tr8","tr9","tr10"]) trustOnly[id] = "present";
const trustGood = scoreRater(buildRater({ raterId: "rater-1", states: trustOnly }), { mode: "wiki" });
assert.equal(trustGood.numeric_scores.trust, 100);
assert.equal(trustGood.numeric_scores.experience, 0);
assert.ok(!trustGood.gate_flags.includes("trust_gate_triggered"));

const reputationCap = scoreRater(buildRater({ raterId: "rater-1", states: statesAllPresent(), reputation: [] }), { mode: "url" });
assert.equal(reputationCap.numeric_scores.authoritativeness, 50, "url mode without reputation caps Authoritativeness numeric at 50");
assert.ok(reputationCap.gate_flags.includes("reputation_only_self_published"));

const reputationOk = scoreRater(buildRater({ raterId: "rater-1", states: statesAllPresent(), reputation: [{ source_url: "https://x", claim: "y", stance: "positive" }] }), { mode: "url" });
assert.equal(reputationOk.numeric_scores.authoritativeness, 100);

const ymylBad = statesAllAbsent();
for (const id of ["tr1","tr2","tr3","tr4","tr5","tr6","tr7","tr8","tr9","tr10"]) ymylBad[id] = "present";
for (const id of ["eq1","eq2","eq3","eq4"]) ymylBad[id] = "present";
const ymyl = scoreRater(buildRater({ raterId: "rater-1", states: ymylBad, ymyl: true }), { mode: "wiki" });
assert.ok(ymyl.gate_flags.includes("ymyl_below_floor"));

const noEvidence = buildRater({ raterId: "rater-1", states: statesAllPresent() });
delete noEvidence.ratings.experience.items[0].evidence_quote;
const { rater, adjustments } = normalizeRaterOutput(noEvidence);
assert.equal(rater.ratings.experience.items[0].state, "unclear");
assert.equal(adjustments.length, 1);

const ratio = pillarRatio("experience", buildRater({ raterId: "rater-1", states: statesAllPresent() }).ratings.experience.items);
assert.equal(ratio, 1);

console.log("eeat scoring ok");
