import assert from "node:assert/strict";

const { aggregateScore, decideStop } = await import("../scripts/lib/autoresearch/scoring.mjs");

// --- aggregateScore: weighted_mean, scale 0_to_10 ---
const metrics = {
  metrics: [
    { id: "len", weight: 1, scoring: "binary" },
    { id: "voice", weight: 2, scoring: "0_to_1" },
  ],
  aggregation: "weighted_mean",
  scale: "0_to_10",
};
assert.equal(aggregateScore({ len: 1, voice: 1 }, metrics), 10, "all max → 10");
assert.equal(aggregateScore({ len: 0, voice: 0 }, metrics), 0, "all zero → 0");
const partial = aggregateScore({ len: 1, voice: 0.5 }, metrics);
assert.equal(partial, 6.67, "weighted: (1*1 + 0.5*2) / 3 = 0.667 → 6.67");

// --- aggregateScore rejects out-of-range ---
assert.throws(() => aggregateScore({ len: 1.5, voice: 0.5 }, metrics), /out of range/);
assert.throws(() => aggregateScore({ len: 1, voice: -0.1 }, metrics), /out of range/);

// --- aggregateScore rejects missing metric ---
assert.throws(() => aggregateScore({ len: 1 }, metrics), /missing score/);

// --- decideStop: max_iter ---
assert.deepEqual(
  decideStop({
    state: { max_iter: 3, threshold: 8, plateau_window: 3, iter: 3 },
    history: [{ iter: 1, score: 5 }, { iter: 2, score: 6 }, { iter: 3, score: 7 }],
  }),
  { decision: "stop:max_iter", reason: "iter 3 >= max_iter 3", best_score: 7 },
);

// --- decideStop: threshold ---
assert.deepEqual(
  decideStop({
    state: { max_iter: 8, threshold: 8, plateau_window: 3, iter: 2 },
    history: [{ iter: 1, score: 7 }, { iter: 2, score: 8.5 }],
  }),
  { decision: "stop:threshold", reason: "best 8.5 >= threshold 8", best_score: 8.5 },
);

// --- decideStop: plateau ---
// window=3, recent=[8,7.9,7.8] max=8, prior=[6,7.5,8] max=8 → plateau
assert.deepEqual(
  decideStop({
    state: { max_iter: 10, threshold: 9, plateau_window: 3, iter: 6 },
    history: [
      { iter: 1, score: 6 }, { iter: 2, score: 7.5 }, { iter: 3, score: 8 },
      { iter: 4, score: 8 }, { iter: 5, score: 7.9 }, { iter: 6, score: 7.8 },
    ],
  }),
  { decision: "stop:plateau", reason: "no improvement in last 3 (max 8 <= prior max 8)", best_score: 8 },
);

// --- decideStop: continue (still improving) ---
assert.equal(
  decideStop({
    state: { max_iter: 10, threshold: 9, plateau_window: 3, iter: 4 },
    history: [{ iter: 1, score: 5 }, { iter: 2, score: 6 }, { iter: 3, score: 7 }, { iter: 4, score: 8 }],
  }).decision,
  "continue",
);

// --- decideStop: not enough history for plateau, but below threshold/max_iter ---
assert.equal(
  decideStop({
    state: { max_iter: 10, threshold: 9, plateau_window: 3, iter: 2 },
    history: [{ iter: 1, score: 5 }, { iter: 2, score: 6 }],
  }).decision,
  "continue",
);

// --- decideStop: priority is threshold > plateau > max_iter ---
// Threshold + plateau both true → threshold wins
assert.equal(
  decideStop({
    state: { max_iter: 6, threshold: 8, plateau_window: 3, iter: 6 },
    history: [
      { iter: 1, score: 6 }, { iter: 2, score: 8 }, { iter: 3, score: 8 },
      { iter: 4, score: 8 }, { iter: 5, score: 8 }, { iter: 6, score: 8 },
    ],
  }).decision,
  "stop:threshold",
);

console.log("autoresearch_stop ok");
