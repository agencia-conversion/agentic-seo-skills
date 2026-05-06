import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "seo-brain", "SKILL.md"), "utf8");
const agents = readFileSync(resolve(root, "AGENTS.md"), "utf8");
const claude = readFileSync(resolve(root, "CLAUDE.md"), "utf8");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*seo-brain$/m);
assert.match(skill, /^description:\s*.+/m);

for (const section of ["## Contract", "## Required Behavior", "## Done Criteria"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

for (const section of ["## Wiki", "## Conteúdo", "## Dados", "## Tecnologia", "## Ethos"]) {
  assert.ok(skill.includes(section), `missing routing block: ${section}`);
}

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
  "content-seo",
  "topic-cluster",
  "seo-analysis",
  "keyword-research",
  "backlink-analysis",
  "data-setup",
  "technical-seo",
  "next-website-creator",
  "payload-cms",
  "DataForSEO",
  "pay-as-you-go",
  "não somos afiliados",
  "Next.js",
  "SSG",
]) {
  assert.ok(skill.includes(required), `missing runtime rule: ${required}`);
}

for (const text of [agents, claude]) {
  assert.ok(text.includes("60-120 lines"), "missing skill size guideline");
  assert.ok(text.includes(">250 lines means review structure"), "missing 250-line structural trigger");
  assert.ok(!/Skill body[^\n]*hard ceiling/i.test(text), "skill bodies must not use hard ceiling language");
  assert.ok(!/Skill body[^\n]*\|\s*100\s*\|/i.test(text), "skill bodies must not keep old 100-line max");
}

console.log("seo-brain skill ok");
