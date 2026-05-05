// Combine 3 scored raters into a consensus report.
// Strategy: median of numeric scores per pillar, mode of ratings (for page_quality only),
// vocab-filtered risk_flags, engine-recomputed gate_flags, clustered remediation.

import { PILLARS, CRITERION_SCORES, criterionById, applicabilityFor } from "./checklist.mjs";

const GATE_VOCAB = new Set([
  "trust_gate_triggered",
  "reputation_only_self_published",
  "ymyl_below_floor",
]);

export { clusterRemediation } from "./cluster.mjs";

export function consensusFromScored(scored) {
  if (scored.length !== 3) throw new Error(`expected 3 raters, got ${scored.length}`);
  const scores = scored.map((s) => s.score).sort((a, b) => a - b);
  const score = scores[1];
  const ymylVotes = scored.filter((s) => s.ymyl).length;
  const ymyl = ymylVotes >= 2;
  const numericScores = {};
  const pillarPointsSpread = {};
  for (const pillar of PILLARS) {
    const sorted = scored.map((s) => s.numeric_scores[pillar]).sort((a, b) => a - b);
    numericScores[pillar] = sorted[1];
    pillarPointsSpread[pillar] = round1(sorted[2] - sorted[0]);
  }
  const pageQualityVotes = scored.map((s) => s.page_quality);
  const pageQuality = mode(pageQualityVotes) ?? scoreToPageQualityFallback(score);
  return {
    score, ymyl, numeric_scores: numericScores, page_quality: pageQuality,
    pillar_points_spread: pillarPointsSpread,
    rater_scores: scored.map((s) => ({ score: s.score, page_quality: s.page_quality, numeric_scores: s.numeric_scores, ratings: s.ratings, gate_flags: s.gate_flags })),
  };
}

export function recomputeGateFlags({ numeric_scores, ymyl, mode: targetMode, reputationCount }) {
  const flags = [];
  if (numeric_scores.trust < 20) flags.push("trust_gate_triggered");
  if (targetMode === "url" && reputationCount === 0) flags.push("reputation_only_self_published");
  if (ymyl) {
    const anyBelowMedium = PILLARS.some((p) => numeric_scores[p] < 40);
    if (anyBelowMedium) flags.push("ymyl_below_floor");
  }
  return flags;
}

export function partitionRiskSignals(rawRaters) {
  const observations = [];
  for (let i = 0; i < rawRaters.length; i += 1) {
    const raterId = rawRaters[i].rater_id ?? `rater-${i + 1}`;
    for (const flag of rawRaters[i].risk_flags ?? []) {
      const text = String(flag).trim();
      if (!GATE_VOCAB.has(text)) observations.push({ rater_id: raterId, observation: text });
    }
  }
  return { risk_flags: [], rater_observations: observations };
}

export function consensusIssues(rawRaters) {
  const all = [];
  for (let i = 0; i < rawRaters.length; i += 1) {
    const raterId = rawRaters[i].rater_id ?? `rater-${i + 1}`;
    for (const issue of rawRaters[i].issues ?? []) {
      all.push({ ...issue, rater_id: raterId });
    }
  }
  const buckets = new Map();
  for (const issue of all) {
    const key = [
      issue.severity ?? "medium",
      issue.issue_type ?? "issue",
      issue.criterion_id ?? "",
      issue.page_type ?? "",
      normalize(issue.recommendation ?? issue.evidence ?? ""),
    ].join("|");
    const bucket = buckets.get(key) ?? { ...issue, raters: new Set(), evidence_items: [] };
    bucket.raters.add(issue.rater_id);
    if (issue.evidence) bucket.evidence_items.push({ rater_id: issue.rater_id, evidence: issue.evidence });
    buckets.set(key, bucket);
  }
  const order = { high: 0, medium: 1, low: 2 };
  return [...buckets.values()].map((issue) => {
    const { raters, rater_id, ...rest } = issue;
    return { ...rest, agreement_count: raters.size, evidence_items: issue.evidence_items?.slice(0, 3) ?? [] };
  }).sort((a, b) => order[a.severity] - order[b.severity] || b.agreement_count - a.agreement_count);
}

export function consensusItems(rawRaters) {
  const out = {};
  for (const pillar of PILLARS) {
    out[pillar] = [];
    const itemIds = new Set();
    for (const r of rawRaters) {
      for (const it of r.ratings[pillar]?.items ?? []) itemIds.add(it.id);
    }
    for (const id of itemIds) {
      const found = rawRaters.map((r) => r.ratings[pillar].items.find((it) => it.id === id) ?? null);
      const states = found.map((it) => it?.state ?? "unclear");
      const consensus = mode(states) ?? "unclear";
      const agreement = states.filter((s) => s === consensus).length;
      const criterion = criterionById(id);
      const pageType = rawRaters.find((r) => r.page_type)?.page_type ?? rawRaters[0]?.target?.page_type ?? "homepage";
      const applicability = found.find((it) => it?.applicability)?.applicability ?? applicabilityFor(id, pageType);
      const evidenceQuotes = [];
      for (const it of found) {
        if (it?.evidence_quote) evidenceQuotes.push({ quote: it.evidence_quote, locator: it.evidence_locator ?? null });
      }
      out[pillar].push({
        id,
        label: criterion?.label ?? id,
        description: criterion?.description ?? "",
        applicability,
        consensus_state: consensus,
        criterion_score: CRITERION_SCORES[consensus],
        agreement,
        states,
        evidence_quotes: evidenceQuotes.slice(0, 3),
      });
    }
    out[pillar].sort((a, b) => a.id.localeCompare(b.id));
  }
  return out;
}

export function unionReputation(rawRaters) {
  const seen = new Map();
  for (const r of rawRaters) {
    for (const item of r.reputation_research ?? []) {
      if (!seen.has(item.source_url)) seen.set(item.source_url, item);
    }
  }
  return [...seen.values()];
}

export function divergenceFlags(consensus, items) {
  const flags = [];
  const maxSpread = Math.max(...Object.values(consensus.pillar_points_spread));
  if (maxSpread > 25) flags.push("high_rater_divergence");
  let totalItems = 0;
  let lowAgree = 0;
  for (const pillar of PILLARS) {
    for (const it of items[pillar]) {
      totalItems += 1;
      if (it.agreement === 1) lowAgree += 1;
    }
  }
  if (totalItems > 0 && lowAgree / totalItems > 0.3) flags.push("high_rater_divergence");
  return [...new Set(flags)];
}

function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
  return bestCount >= 2 ? best : null;
}

function round1(n) { return Math.round(n * 10) / 10; }

function normalize(text) {
  return String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreToPageQualityFallback(score) {
  if (score >= 85) return "Highest";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Lowest";
}
