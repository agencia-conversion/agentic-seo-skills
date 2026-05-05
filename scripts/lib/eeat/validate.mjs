// Lightweight schema validation for rater outputs (no external deps).
// Mirrors templates/eeat/rater-output.schema.json.

const RATING_VALUES = ["Lowest", "Low", "Medium", "High", "Highest"];
const STATE_VALUES = ["present", "partial", "absent", "unclear"];
const PRIORITY_VALUES = ["high", "medium", "low"];
const STANCE_VALUES = ["positive", "negative", "neutral"];
const PILLAR_KEYS = ["experience", "expertise", "authoritativeness", "trust"];

export function validateRaterOutput(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["root must be an object"];
  if (!/^rater-[1-3]$/.test(data.rater_id ?? "")) errors.push("rater_id must match rater-1|rater-2|rater-3");
  if (!data.target || !["wiki", "url"].includes(data.target.mode)) errors.push("target.mode must be wiki|url");
  if (!data.target?.value) errors.push("target.value required");
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
    }
  }
  if (!Array.isArray(data.risk_flags)) errors.push("risk_flags must be array");
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
