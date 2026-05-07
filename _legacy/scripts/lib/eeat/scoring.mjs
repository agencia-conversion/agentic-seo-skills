// Score a single rater's output: continuous numeric scores per pillar + gates.
// Pillar score = ratio(checklist items) × 100. Total = mean of 4 pillars.
// Rating labels (Lowest..Highest) are kept for page_quality only.

import {
  CHECKLIST, PILLARS, STATE_VALUES, FINAL_WEIGHTS,
  applicabilityFor, applicabilityWeight,
  ratioToRating, scoreToPageQuality,
} from "./checklist.mjs";

export function normalizeRaterOutput(rater) {
  const pageType = rater.page_type || rater.target?.page_type || "homepage";
  const out = { ...rater, page_type: pageType, ratings: { ...rater.ratings } };
  const adjustments = [];
  for (const pillar of PILLARS) {
    const block = out.ratings[pillar];
    if (!block) continue;
    const items = block.items.map((item) => {
      const expectedApplicability = applicabilityFor(item.id, pageType);
      const itemApplicability = item.applicability ?? expectedApplicability;
      if (itemApplicability === "not_applicable" || item.state === "not_applicable") {
        return { ...item, state: "not_applicable", applicability: "not_applicable" };
      }
      if ((item.state === "present" || item.state === "partial") && !item.evidence_quote) {
        adjustments.push({ pillar, id: item.id, from: item.state, to: "unclear", reason: "missing_evidence_quote" });
        return { ...item, state: "unclear", applicability: itemApplicability };
      }
      return { ...item, applicability: itemApplicability };
    });
    out.ratings[pillar] = { ...block, items };
  }
  return { rater: out, adjustments };
}

export function pillarRatio(pillar, items, pageType = "homepage") {
  const byId = new Map(items.map((it) => [it.id, it]));
  let num = 0;
  let den = 0;
  for (const spec of CHECKLIST[pillar]) {
    const item = byId.get(spec.id);
    if (!item) continue;
    const itemApplicability = item.applicability ?? applicabilityFor(spec.id, pageType);
    if (itemApplicability === "not_applicable" || item.state === "not_applicable") continue;
    const value = STATE_VALUES[item.state] ?? 0;
    const weight = applicabilityWeight(itemApplicability);
    num += value * weight;
    den += weight;
  }
  return den === 0 ? 0 : num / den;
}

export function scoreRater(rater, options) {
  const { mode } = options;
  const pageType = rater.page_type || rater.target?.page_type || "homepage";
  const ymyl = Boolean(rater.ymyl?.value);
  const reputationCount = Array.isArray(rater.reputation_research) ? rater.reputation_research.length : 0;
  const numericScores = {};
  const ratings = {};
  for (const pillar of PILLARS) {
    const block = rater.ratings[pillar];
    const ratio = pillarRatio(pillar, block.items, pageType);
    let pillarScore = ratio * 100;
    if (pillar === "authoritativeness" && mode === "url" && reputationCount === 0) {
      pillarScore = Math.min(pillarScore, 50);
    }
    numericScores[pillar] = round1(pillarScore);
    ratings[pillar] = ratioToRating(pillarScore / 100);
  }
  let score = PILLARS.reduce((sum, p) => sum + numericScores[p] * FINAL_WEIGHTS[p], 0);
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
