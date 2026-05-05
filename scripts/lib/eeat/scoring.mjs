// Score a single rater's output: continuous numeric scores per pillar + gates.
// Pillar score = ratio(checklist items) × 100. Total = mean of 4 pillars.
// Rating labels (Lowest..Highest) are kept for page_quality only.

import {
  CHECKLIST, PILLARS, STATE_VALUES,
  ratioToRating, scoreToPageQuality,
} from "./checklist.mjs";

export function normalizeRaterOutput(rater) {
  const out = { ...rater, ratings: { ...rater.ratings } };
  const adjustments = [];
  for (const pillar of PILLARS) {
    const block = out.ratings[pillar];
    if (!block) continue;
    const items = block.items.map((item) => {
      if ((item.state === "present" || item.state === "partial") && !item.evidence_quote) {
        adjustments.push({ pillar, id: item.id, from: item.state, to: "unclear", reason: "missing_evidence_quote" });
        return { ...item, state: "unclear" };
      }
      return item;
    });
    out.ratings[pillar] = { ...block, items };
  }
  return { rater: out, adjustments };
}

export function pillarRatio(pillar, items) {
  const byId = new Map(items.map((it) => [it.id, it]));
  let num = 0;
  let den = 0;
  for (const spec of CHECKLIST[pillar]) {
    if (!byId.has(spec.id)) continue;
    const value = STATE_VALUES[byId.get(spec.id).state] ?? 0;
    num += value * spec.weight;
    den += spec.weight;
  }
  return den === 0 ? 0 : num / den;
}

export function scoreRater(rater, options) {
  const { mode } = options;
  const ymyl = Boolean(rater.ymyl?.value);
  const reputationCount = Array.isArray(rater.reputation_research) ? rater.reputation_research.length : 0;
  const numericScores = {};
  const ratings = {};
  for (const pillar of PILLARS) {
    const block = rater.ratings[pillar];
    const ratio = pillarRatio(pillar, block.items);
    let pillarScore = ratio * 100;
    if (pillar === "authoritativeness" && mode === "url" && reputationCount === 0) {
      pillarScore = Math.min(pillarScore, 50);
    }
    numericScores[pillar] = round1(pillarScore);
    ratings[pillar] = ratioToRating(pillarScore / 100);
  }
  let score = (numericScores.experience + numericScores.expertise + numericScores.authoritativeness + numericScores.trust) / 4;
  const gateFlags = [];
  if (ratings.trust === "Lowest") gateFlags.push("trust_gate_triggered");
  if (mode === "url" && reputationCount === 0) gateFlags.push("reputation_only_self_published");
  if (ymyl) {
    const anyBelowMedium = PILLARS.some((p) => numericScores[p] < 40);
    if (anyBelowMedium) {
      score = Math.max(0, score - 15);
      gateFlags.push("ymyl_below_floor");
    }
  }
  let pageQuality = scoreToPageQuality(score);
  if (gateFlags.includes("trust_gate_triggered")) pageQuality = "Lowest";
  return { ratings, numeric_scores: numericScores, score: round1(score), page_quality: pageQuality, gate_flags: gateFlags, ymyl };
}

function round1(n) { return Math.round(n * 10) / 10; }
