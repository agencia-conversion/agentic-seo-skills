import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "seo-brain", "SKILL.md"), "utf8");
const lines = skill.trimEnd().split("\n");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*seo-brain$/m);
assert.match(skill, /^description:\s*.+/m);

for (const section of ["## Contract", "## Required Behavior", "## Done Criteria"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

assert.ok(lines.length <= 100);
for (const required of [
  "seis pilares",
  "aprovação humana",
  "project/sources/",
  "project/workbench/",
  "browser handoff",
  "página",
  "conteúdo",
  "análise",
  "evidência",
  "aprovação",
  "técnico",
  "não",
  "até",
  "Never fabricate",
]) {
  assert.ok(skill.includes(required), `missing runtime rule: ${required}`);
}

console.log("seo-brain skill ok");
