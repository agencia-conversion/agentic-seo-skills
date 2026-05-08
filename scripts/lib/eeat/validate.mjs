// Lightweight schema validation for rater outputs (no external deps).
// Mirrors templates/eeat/rater-output.schema.json.

const RATING_VALUES = ["Lowest", "Low", "Medium", "High", "Highest"];
const STATE_VALUES = ["present", "partial", "absent", "unclear", "not_applicable"];
const APPLICABILITY_VALUES = ["required", "expected", "optional", "not_applicable"];
const PRIORITY_VALUES = ["high", "medium", "low"];
const STANCE_VALUES = ["positive", "negative", "neutral"];
const PILLAR_KEYS = ["experience", "expertise", "authoritativeness", "trust"];
const PAGE_TYPES = ["homepage", "about", "service", "case_study", "article", "author_profile", "contact", "policy", "product_tool", "landing_page"];
const ISSUE_TYPES = ["missing_expected_author", "unsupported_material_claim", "verification_needed", "insufficient_reputation_evidence", "missing_business_contact", "missing_required_policy", "outdated_or_undated_editorial_content", "missing_responsible_entity", "deceptive_or_unsafe_experience"];

export function validateRaterOutput(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["root must be an object"];
  if (!/^rater-[1-3]$/.test(data.rater_id ?? "")) errors.push("rater_id must match rater-1|rater-2|rater-3");
  if (!data.target || !["brain", "url"].includes(data.target.mode)) errors.push("target.mode must be brain|url");
  if (!data.target?.value) errors.push("target.value required");
  if (!PAGE_TYPES.includes(data.page_type ?? data.target?.page_type ?? "")) errors.push("page_type must be a supported page type");
  if (typeof data.ymyl?.value !== "boolean") errors.push("ymyl.value must be boolean");
  if (!data.ymyl?.rationale) errors.push("ymyl.rationale required");
  if (!data.ratings) errors.push("ratings required");
  else for (const pillar of PILLAR_KEYS) {
    const block = data.ratings[pillar];
    if (!block) { errors.push(`ratings.${pillar} required`); continue; }
    if (!RATING_VALUES.includes(block.rating)) errors.push(`ratings.${pillar}.rating invalid`);
    if (!Array.isArray(block.items) || block.items.length === 0) {
      errors.push(`ratings.${pillar}.items must be non-empty array`);
      continue;
    }
    for (const item of block.items) {
      if (!item.id) errors.push(`ratings.${pillar}.items[].id required`);
      if (!STATE_VALUES.includes(item.state)) errors.push(`ratings.${pillar}.items[${item.id}].state invalid`);
      if (item.applicability && !APPLICABILITY_VALUES.includes(item.applicability)) errors.push(`ratings.${pillar}.items[${item.id}].applicability invalid`);
      if (item.state === "not_applicable" && !item.applicability_reason) errors.push(`ratings.${pillar}.items[${item.id}].applicability_reason required`);
    }
  }
  if (data.risk_flags && !Array.isArray(data.risk_flags)) errors.push("risk_flags must be array");
  if (!Array.isArray(data.issues)) errors.push("issues must be array");
  else for (const issue of data.issues) {
    if (!PRIORITY_VALUES.includes(issue.severity)) errors.push("issues[].severity invalid");
    if (!issue.criterion_id) errors.push("issues[].criterion_id required");
    if (!PAGE_TYPES.includes(issue.page_type)) errors.push("issues[].page_type invalid");
    if (!ISSUE_TYPES.includes(issue.issue_type)) errors.push("issues[].issue_type invalid");
    if (!issue.applicability_reason) errors.push("issues[].applicability_reason required");
    if (!issue.recommendation) errors.push("issues[].recommendation required");
  }
  if (!Array.isArray(data.remediation)) errors.push("remediation must be array");
  else for (const r of data.remediation) {
    if (!PRIORITY_VALUES.includes(r.priority)) errors.push("remediation[].priority invalid");
    if (!r.what) errors.push("remediation[].what required");
    if (!r.why) errors.push("remediation[].why required");
  }
  if (typeof data.rater_narrative !== "string" || data.rater_narrative.length === 0) {
    errors.push("rater_narrative required");
  }
  if (!Array.isArray(data.limitations)) errors.push("limitations must be array");
  if (data.reputation_research) {
    if (!Array.isArray(data.reputation_research)) errors.push("reputation_research must be array");
    else for (const item of data.reputation_research) {
      if (!item.source_url) errors.push("reputation_research[].source_url required");
      if (!item.claim) errors.push("reputation_research[].claim required");
      if (!STANCE_VALUES.includes(item.stance)) errors.push("reputation_research[].stance invalid");
    }
  }
  return errors;
}
