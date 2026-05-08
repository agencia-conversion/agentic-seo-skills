import assert from "node:assert/strict";
import { scoreRater, normalizeRaterOutput, pillarRatio } from "../scripts/lib/eeat/scoring.mjs";
import { buildRater, statesAllPresent, statesAllAbsent } from "./fixtures/eeat/rater-builder.mjs";

const allPresent = scoreRater(buildRater({ raterId: "rater-1", states: statesAllPresent() }), { mode: "brain" });
assert.equal(allPresent.score, 100, "all-present must score 100");
assert.equal(allPresent.page_quality, "Highest");
for (const p of ["experience","expertise","authoritativeness","trust"]) assert.equal(allPresent.numeric_scores[p], 100);

const allAbsent = scoreRater(buildRater({ raterId: "rater-2", states: statesAllAbsent() }), { mode: "brain" });
assert.equal(allAbsent.score, 0);
assert.equal(allAbsent.page_quality, "Lowest");
assert.ok(allAbsent.gate_flags.includes("trust_gate_triggered"));

// fine-grained pillar score, not bucketed: 3.5 of 5 points → 70
const partialExp = statesAllAbsent();
partialExp.ex1 = "present";
partialExp.ex2 = "present";
partialExp.ex3 = "present";
partialExp.ex4 = "partial";
const partial = scoreRater(buildRater({ raterId: "rater-1", states: partialExp }), { mode: "brain" });
assert.equal(partial.numeric_scores.experience, 70);

const notApplicableExp = statesAllAbsent();
notApplicableExp.ex1 = "present";
for (const id of ["ex2","ex3","ex4","ex5"]) notApplicableExp[id] = "not_applicable";
const naScore = scoreRater(buildRater({ raterId: "rater-1", states: notApplicableExp }), { mode: "brain" });
assert.equal(naScore.numeric_scores.experience, 100, "not_applicable items must be excluded from denominator");

const trustOnly = statesAllAbsent();
for (const id of ["tr1","tr2","tr3","tr4","tr5"]) trustOnly[id] = "present";
const trustGood = scoreRater(buildRater({ raterId: "rater-1", states: trustOnly }), { mode: "brain" });
assert.equal(trustGood.numeric_scores.trust, 100);
assert.equal(trustGood.numeric_scores.experience, 0);
assert.ok(!trustGood.gate_flags.includes("trust_gate_triggered"));

const reputationCap = scoreRater(buildRater({ raterId: "rater-1", states: statesAllPresent(), reputation: [] }), { mode: "url" });
assert.equal(reputationCap.numeric_scores.authoritativeness, 50, "url mode without reputation caps Authoritativeness numeric at 50");
assert.ok(reputationCap.gate_flags.includes("reputation_only_self_published"));

const reputationOk = scoreRater(buildRater({ raterId: "rater-1", states: statesAllPresent(), reputation: [{ source_url: "https://x", claim: "y", stance: "positive" }] }), { mode: "url" });
assert.equal(reputationOk.numeric_scores.authoritativeness, 100);

const ymylBad = statesAllAbsent();
for (const id of ["tr1","tr2","tr3","tr4","tr5"]) ymylBad[id] = "present";
for (const id of ["eq1","eq2"]) ymylBad[id] = "present";
const ymyl = scoreRater(buildRater({ raterId: "rater-1", states: ymylBad, ymyl: true }), { mode: "brain" });
assert.ok(ymyl.gate_flags.includes("ymyl_below_floor"));

const noEvidence = buildRater({ raterId: "rater-1", states: statesAllPresent() });
delete noEvidence.ratings.experience.items[0].evidence_quote;
const { rater, adjustments } = normalizeRaterOutput(noEvidence);
assert.equal(rater.ratings.experience.items[0].state, "unclear");
assert.equal(adjustments.length, 1);

const ratio = pillarRatio("experience", buildRater({ raterId: "rater-1", states: statesAllPresent() }).ratings.experience.items);
assert.equal(ratio, 1);

console.log("eeat scoring ok");
