import assert from "node:assert/strict";
import { scoreRater } from "../scripts/lib/eeat/scoring.mjs";
import { consensusFromScored, consensusItems, consensusIssues, clusterRemediation, unionReputation, divergenceFlags, recomputeGateFlags, partitionRiskSignals } from "../scripts/lib/eeat/consensus.mjs";
import { buildRater, statesAllPresent, statesAllAbsent } from "./fixtures/eeat/rater-builder.mjs";

// happy path consensus
const all = [1, 2, 3].map((n) => buildRater({ raterId: `rater-${n}`, states: statesAllPresent() }));
const scored = all.map((r) => scoreRater(r, { mode: "brain" }));
const cons = consensusFromScored(scored);
assert.equal(cons.score, 100);
assert.equal(cons.page_quality, "Highest");
assert.equal(cons.pillar_points_spread.experience, 0);
assert.equal(cons.numeric_scores.experience, 100);
assert.equal(cons.numeric_scores.trust, 100);

// median per pillar with mixed numeric scores
const mixed = [
  buildRater({ raterId: "rater-1", states: statesAllAbsent() }),
  buildRater({ raterId: "rater-2", states: statesAllPresent() }),
  buildRater({ raterId: "rater-3", states: statesAllAbsent() }),
].map((r) => scoreRater(r, { mode: "brain" }));
const consMixed = consensusFromScored(mixed);
assert.equal(consMixed.score, mixed.map((m) => m.score).sort((a, b) => a - b)[1]);
assert.equal(consMixed.numeric_scores.trust, 0, "median of [0, 100, 0] is 0");

// recomputeGateFlags re-derives from consensused numeric scores, not per-rater union
const gates = recomputeGateFlags({ numeric_scores: consMixed.numeric_scores, ymyl: false, mode: "brain", reputationCount: 0 });
assert.ok(gates.includes("trust_gate_triggered"));
assert.ok(!gates.includes("reputation_only_self_published"), "reputation cap is url-only");

const gatesUrl = recomputeGateFlags({ numeric_scores: { trust: 75, experience: 75, expertise: 75, authoritativeness: 75 }, ymyl: false, mode: "url", reputationCount: 0 });
assert.deepEqual(gatesUrl, ["reputation_only_self_published"]);

// items + divergence
const itemsConsensus = consensusItems([
  buildRater({ raterId: "rater-1", states: statesAllAbsent() }),
  buildRater({ raterId: "rater-2", states: statesAllPresent() }),
  buildRater({ raterId: "rater-3", states: statesAllAbsent() }),
]);
const ex1 = itemsConsensus.experience.find((i) => i.id === "ex1");
assert.equal(ex1.consensus_state, "absent");
assert.equal(ex1.agreement, 2);
assert.ok(divergenceFlags(consMixed, itemsConsensus).includes("high_rater_divergence"));

// legacy risk flags are observations; gates are still filtered out
const partitioned = partitionRiskSignals([
  buildRater({ raterId: "rater-1", states: statesAllAbsent() }),
  buildRater({ raterId: "rater-2", states: statesAllAbsent() }),
  buildRater({ raterId: "rater-3", states: statesAllAbsent() }),
].map((r) => ({ ...r, risk_flags: ["no_about_page", "trust_gate_triggered", "Reivindicação não-substanciada de superlativo"] })));
assert.deepEqual(partitioned.risk_flags.sort(), []);
assert.equal(partitioned.rater_observations.length, 6, "legacy/free-text flags routed to observations");
assert.ok(partitioned.rater_observations[0].rater_id);

const issues = consensusIssues([
  buildRater({ raterId: "rater-1", issues: [{ severity: "medium", criterion_id: "tr3", page_type: "homepage", issue_type: "unsupported_material_claim", applicability_reason: "Homepage claims must be substantiated.", evidence: "maior agência", recommendation: "Add independent evidence for the leadership claim." }] }),
  buildRater({ raterId: "rater-2", issues: [{ severity: "medium", criterion_id: "tr3", page_type: "homepage", issue_type: "unsupported_material_claim", applicability_reason: "Homepage claims must be substantiated.", evidence: "maior agência", recommendation: "Add independent evidence for the leadership claim." }] }),
  buildRater({ raterId: "rater-3" }),
]);
assert.equal(issues.length, 1);
assert.equal(issues[0].agreement_count, 2);
assert.equal(issues[0].issue_type, "unsupported_material_claim");

// clustering: 3 raters phrasing the same fix differently still merge
const clustered = clusterRemediation([
  buildRater({ raterId: "rater-1", states: statesAllAbsent(), remediation: [{ priority: "high", what: "Publicar CNPJ e razão social no rodapé", why: "tr1 está absent" }] }),
  buildRater({ raterId: "rater-2", states: statesAllAbsent(), remediation: [{ priority: "high", what: "Adicionar bloco com CNPJ, razão social e endereço fiscal em /quem-somos", why: "tr1 e tr9 ausentes" }] }),
  buildRater({ raterId: "rater-3", states: statesAllAbsent(), remediation: [{ priority: "high", what: "Incluir CNPJ na política de privacidade", why: "exigência LGPD, tr1" }] }),
]);
assert.equal(clustered.length, 1, "shared tr1 should merge all three despite different what text");
assert.equal(clustered[0].agreement_count, 3);
assert.ok(clustered[0].checklist_ids.includes("tr1"));
assert.ok(clustered[0].variants.length === 3);

// clustering: different priorities never merge
const splitPriority = clusterRemediation([
  buildRater({ raterId: "rater-1", states: statesAllAbsent(), remediation: [{ priority: "high", what: "x", why: "tr1" }] }),
  buildRater({ raterId: "rater-2", states: statesAllAbsent(), remediation: [{ priority: "low", what: "x", why: "tr1" }] }),
  buildRater({ raterId: "rater-3", states: statesAllAbsent(), remediation: [] }),
]);
assert.equal(splitPriority.length, 2);

// reputation deduped
const reputation = unionReputation([
  buildRater({ raterId: "rater-1", states: statesAllAbsent(), reputation: [{ source_url: "https://a", claim: "x", stance: "positive" }] }),
  buildRater({ raterId: "rater-2", states: statesAllAbsent(), reputation: [{ source_url: "https://a", claim: "x", stance: "positive" }, { source_url: "https://b", claim: "y", stance: "neutral" }] }),
  buildRater({ raterId: "rater-3", states: statesAllAbsent(), reputation: [] }),
]);
assert.equal(reputation.length, 2);

console.log("eeat consensus ok");
