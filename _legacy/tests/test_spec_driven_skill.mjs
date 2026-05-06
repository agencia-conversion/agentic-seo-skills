import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "spec-driven", "SKILL.md"), "utf8");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*spec-driven$/m);
assert.match(skill, /^description:\s*.+compound SEO Brain requests/m);

for (const section of ["## Contract", "## Required Behavior", "## Done Criteria"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

for (const required of [
  "two or more deliverables",
  "two or more SEO Brain skills",
  "two or more pillars",
  "approval-gated artifact",
  "content and website generation",
  "Do not use this skill for a single clear task",
  "skills/_shared/references/operating-model.md",
  "simple design",
  "what will be done",
  "where artifacts will live",
  "what will prove success",
  "project/workbench/specs/<slug>/spec.md",
  "project/workbench/specs/<slug>/plan.md",
  "project/workbench/specs/<slug>/result-check.md",
  "Never write the spec into `project/wiki/`",
  "result check",
  "run the required upstream flow",
  "request the explicit bypass",
  "declare the dependent deliverable blocked",
]) {
  assert.ok(skill.includes(required), `missing spec-driven rule: ${required}`);
}

for (const term of ["página", "conteúdo", "análise", "evidência", "aprovação", "técnico", "não", "até"]) {
  assert.ok(skill.includes(term), `missing pt-BR fidelity term: ${term}`);
}

console.log("spec-driven skill ok");
