import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "spec-driven", "SKILL.md"), "utf8");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*spec-driven$/m);
assert.match(skill, /^description:\s*.+compound requests/m);

for (const section of ["## When To Use", "## Critical Points", "## Framework", "## Output Format", "## Examples", "## Done Criteria"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

for (const required of [
  "two or more distinct deliverables",
  "downstream skills",
  "cross Agentic SEO pillars",
  "approval gates",
  "content drafts plus Next.js website generation",
  "Do not use this skill for a single clear task",
  "Simple Design",
  "deliverables",
  "control file location",
  "success criteria",
  "project/workbench/specs/<slug>/spec.md",
  "project/workbench/specs/<slug>/plan.md",
  "project/workbench/specs/<slug>/result-check.md",
  "Never write specs, plans, drafts, hypotheses, or execution notes to `project/brain/`",
  "result-check",
  "upstream gate passes",
  "ask for approval before writing the workbench files",
  "mark the dependent deliverable blocked",
  "Do not bypass strategic approval",
  "DataForSEO is the default",
  "local browser handoff",
]) {
  assert.ok(skill.includes(required), `missing spec-driven rule: ${required}`);
}

for (const term of ["página", "conteúdo", "análise", "evidência", "aprovação", "técnico", "não", "até"]) {
  assert.ok(skill.includes(term), `missing pt-BR fidelity term: ${term}`);
}

console.log("spec-driven skill ok");
