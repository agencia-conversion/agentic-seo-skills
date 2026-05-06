import assert from "node:assert/strict";

const { aggregateScore, decideStop } = await import("../scripts/lib/autoresearch/scoring.mjs");

// --- aggregateScore: weighted_mean, scale 0_to_100 ---
const metrics = {
  metrics: [
    { id: "len", weight: 1, scoring: "binary" },
    { id: "voice", weight: 2, scoring: "0_to_100" },
  ],
  aggregation: "weighted_mean",
  scale: "0_to_100",
};
assert.equal(aggregateScore({ len: 100, voice: 100 }, metrics), 100, "all max -> 100");
assert.equal(aggregateScore({ len: 0, voice: 0 }, metrics), 0, "all zero → 0");
const partial = aggregateScore({ len: 100, voice: 50 }, metrics);
assert.equal(partial, 66.67, "weighted: (100*1 + 50*2) / 3 = 66.67");

// --- aggregateScore rejects out-of-range ---
assert.throws(() => aggregateScore({ len: 50, voice: 50 }, metrics), /binary score out of range/);
assert.throws(() => aggregateScore({ len: 100, voice: -1 }, metrics), /out of range/);

// --- aggregateScore rejects missing metric ---
assert.throws(() => aggregateScore({ voice: 50 }, metrics), /missing score/);

// --- decideStop: max_iter ---
assert.deepEqual(
  decideStop({
    state: { max_iter: 3, threshold: 80, plateau_window: 3, iter: 3 },
    history: [{ iter: 1, score: 50 }, { iter: 2, score: 60 }, { iter: 3, score: 70 }],
  }),
  { decision: "stop:max_iter", reason: "iter 3 >= max_iter 3", best_score: 70 },
);

// --- decideStop: threshold ---
assert.deepEqual(
  decideStop({
    state: { max_iter: 8, threshold: 80, plateau_window: 3, iter: 2 },
    history: [{ iter: 1, score: 70 }, { iter: 2, score: 85 }],
  }),
  { decision: "stop:threshold", reason: "best 85 >= threshold 80", best_score: 85 },
);

// --- decideStop: plateau ---
// window=3, recent=[80,79,78] max=80, prior=[60,75,80] max=80 -> plateau
assert.deepEqual(
  decideStop({
    state: { max_iter: 10, threshold: 90, plateau_window: 3, iter: 6 },
    history: [
      { iter: 1, score: 60 }, { iter: 2, score: 75 }, { iter: 3, score: 80 },
      { iter: 4, score: 80 }, { iter: 5, score: 79 }, { iter: 6, score: 78 },
    ],
  }),
  { decision: "stop:plateau", reason: "no improvement in last 3 (max 80 <= prior max 80)", best_score: 80 },
);

// --- decideStop: continue (still improving) ---
assert.equal(
  decideStop({
    state: { max_iter: 10, threshold: 90, plateau_window: 3, iter: 4 },
    history: [{ iter: 1, score: 50 }, { iter: 2, score: 60 }, { iter: 3, score: 70 }, { iter: 4, score: 80 }],
  }).decision,
  "continue",
);

// --- decideStop: not enough history for plateau, but below threshold/max_iter ---
assert.equal(
  decideStop({
    state: { max_iter: 10, threshold: 90, plateau_window: 3, iter: 2 },
    history: [{ iter: 1, score: 50 }, { iter: 2, score: 60 }],
  }).decision,
  "continue",
);

// --- decideStop: priority is threshold > plateau > max_iter ---
// Threshold + plateau both true → threshold wins
assert.equal(
  decideStop({
    state: { max_iter: 6, threshold: 80, plateau_window: 3, iter: 6 },
    history: [
      { iter: 1, score: 60 }, { iter: 2, score: 80 }, { iter: 3, score: 80 },
      { iter: 4, score: 80 }, { iter: 5, score: 80 }, { iter: 6, score: 80 },
    ],
  }).decision,
  "stop:threshold",
);

console.log("autoresearch_stop ok");
