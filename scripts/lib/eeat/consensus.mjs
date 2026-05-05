// Combine 3 scored raters into a consensus report.
// Strategy: median of numeric scores per pillar, mode of ratings (for page_quality only),
// vocab-filtered risk_flags, engine-recomputed gate_flags, clustered remediation.

import { PILLARS } from "./checklist.mjs";

const RISK_VOCAB = new Set([
  "anonymous_authorship",
  "no_about_page",
  "outdated_content",
  "unverifiable_credentials",
  "fabrication_risk",
]);

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
  const validFlags = new Set();
  const observations = [];
  for (let i = 0; i < rawRaters.length; i += 1) {
    const raterId = rawRaters[i].rater_id ?? `rater-${i + 1}`;
    for (const flag of rawRaters[i].risk_flags ?? []) {
      const text = String(flag).trim();
      if (RISK_VOCAB.has(text)) validFlags.add(text);
      else if (GATE_VOCAB.has(text)) continue;
      else observations.push({ rater_id: raterId, observation: text });
    }
  }
  return { risk_flags: [...validFlags], rater_observations: observations };
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
      const evidenceQuotes = [];
      for (const it of found) {
        if (it?.evidence_quote) evidenceQuotes.push({ quote: it.evidence_quote, locator: it.evidence_locator ?? null });
      }
      out[pillar].push({ id, consensus_state: consensus, agreement, states, evidence_quotes: evidenceQuotes.slice(0, 3) });
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

function scoreToPageQualityFallback(score) {
  if (score >= 85) return "Highest";
  if (score >= 65) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Lowest";
}
