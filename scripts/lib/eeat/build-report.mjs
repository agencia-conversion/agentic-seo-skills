// Build the consolidated report shape from raw rater outputs + manifest.

import { validateRaterOutput } from "./validate.mjs";
import { normalizeRaterOutput, scoreRater } from "./scoring.mjs";
import { consensusFromScored, consensusItems, clusterRemediation, unionReputation, divergenceFlags, recomputeGateFlags, partitionRiskSignals } from "./consensus.mjs";

export function buildReport({ manifest, rawRaters, onError }) {
  const normalized = [];
  const allAdjustments = [];
  for (const raw of rawRaters) {
    const errs = validateRaterOutput(raw);
    if (errs.length) onError(`rater ${raw.rater_id || "?"} invalid: ${errs.join("; ")}`);
    const { rater, adjustments } = normalizeRaterOutput(raw);
    normalized.push(rater);
    allAdjustments.push({ rater_id: rater.rater_id, adjustments });
  }
  const scored = normalized.map((r) => scoreRater(r, { mode: manifest.target.mode }));
  const cons = consensusFromScored(scored);
  const items = consensusItems(normalized);
  const remediation = clusterRemediation(normalized);
  const reputation = unionReputation(normalized);
  const divergence = divergenceFlags(cons, items);
  const gateFlags = recomputeGateFlags({ numeric_scores: cons.numeric_scores, ymyl: cons.ymyl, mode: manifest.target.mode, reputationCount: reputation.length });
  const { risk_flags: vocabRiskFlags, rater_observations } = partitionRiskSignals(normalized);
  const riskFlags = [...new Set([...vocabRiskFlags, ...divergence])];
  return {
    run_id: manifest.run_id,
    target: manifest.target,
    generated_at: new Date().toISOString(),
    score: cons.score,
    page_quality: gateFlags.includes("trust_gate_triggered") ? "Lowest" : cons.page_quality,
    ymyl: cons.ymyl,
    numeric_scores: cons.numeric_scores,
    gate_flags: gateFlags,
    risk_flags: riskFlags,
    consolidated_narrative: null,
    checklist_consensus: items,
    remediation,
    reputation_research: reputation,
    rater_observations,
    limitations: [...new Set(normalized.flatMap((r) => r.limitations ?? []))],
    _audit: {
      rater_scores: cons.rater_scores,
      rater_narratives: normalized.map((r) => ({ rater_id: r.rater_id, narrative: r.rater_narrative })),
      pillar_points_spread: cons.pillar_points_spread,
      schema_adjustments: allAdjustments,
    },
  };
}
