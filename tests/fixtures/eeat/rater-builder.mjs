// Helper to build synthetic rater outputs for tests.
// Keeps test files small and focused on assertions.

const ALL_ITEMS = {
  experience: ["ex1","ex2","ex3","ex4","ex5"],
  expertise: ["eq1","eq2","eq3","eq4","eq5"],
  authoritativeness: ["au1","au2","au3","au4","au5"],
  trust: ["tr1","tr2","tr3","tr4","tr5"],
};

export function buildRater({ raterId, mode = "brain", value = "brain/identidade.md", pageType = "homepage", states = {}, applicability = {}, ymyl = false, reputation = [], remediation = [], issues = [] } = {}) {
  const ratings = {};
  for (const [pillar, ids] of Object.entries(ALL_ITEMS)) {
    const items = ids.map((id) => {
      const state = states[id] ?? "absent";
      const app = applicability[id] ?? (state === "not_applicable" ? "not_applicable" : "expected");
      const item = { id, state, applicability: app, applicability_reason: `${id} applies to ${pageType}` };
      if (state === "present" || state === "partial") item.evidence_quote = `quote-for-${id}`;
      else if (state === "not_applicable") item.absence_statement = `not-applicable-${id}`;
      else item.absence_statement = `not-found-${id}`;
      item.evidence_locator = { page_id: "test", anchor: id };
      item.source_type = state === "not_applicable" ? "not_found" : "same_page";
      item.verification_status = state === "not_applicable" ? "not_applicable" : "self_published";
      return item;
    });
    ratings[pillar] = { rating: "Medium", items };
  }
  return {
    rater_id: raterId,
    target: { mode, value },
    page_type: pageType,
    ymyl: { value: ymyl, rationale: "test" },
    ratings,
    reputation_research: reputation,
    risk_flags: [],
    issues,
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
