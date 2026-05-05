// Helper to build synthetic rater outputs for tests.
// Keeps test files small and focused on assertions.

const ALL_ITEMS = {
  experience: ["ex1","ex2","ex3","ex4","ex5","ex6","ex7","ex8"],
  expertise: ["eq1","eq2","eq3","eq4","eq5","eq6","eq7","eq8"],
  authoritativeness: ["au1","au2","au3","au4","au5","au6","au7","au8"],
  trust: ["tr1","tr2","tr3","tr4","tr5","tr6","tr7","tr8","tr9","tr10"],
};

export function buildRater({ raterId, mode = "wiki", value = "wiki/eeat.md", states = {}, ymyl = false, reputation = [], remediation = [] } = {}) {
  const ratings = {};
  for (const [pillar, ids] of Object.entries(ALL_ITEMS)) {
    const items = ids.map((id) => {
      const state = states[id] ?? "absent";
      const item = { id, state };
      if (state === "present" || state === "partial") item.evidence_quote = `quote-for-${id}`;
      else item.absence_statement = `not-found-${id}`;
      item.evidence_locator = { page_id: "test", anchor: id };
      return item;
    });
    ratings[pillar] = { rating: "Medium", items };
  }
  return {
    rater_id: raterId,
    target: { mode, value },
    ymyl: { value: ymyl, rationale: "test" },
    ratings,
    reputation_research: reputation,
    risk_flags: [],
    remediation,
    rater_narrative: `narrative for ${raterId}`,
    limitations: [],
  };
}

export function statesAllPresent() {
  const out = {};
  for (const ids of Object.values(ALL_ITEMS)) for (const id of ids) out[id] = "present";
  return out;
}

export function statesAllAbsent() {
  const out = {};
  for (const ids of Object.values(ALL_ITEMS)) for (const id of ids) out[id] = "absent";
  return out;
}
