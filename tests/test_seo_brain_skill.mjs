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

for (const section of ["## When To Use", "## Operating Model", "## Critical Points", "## Routing Framework", "## Output Format", "## Examples"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

for (const required of [
  "six pillars",
  "Humans own judgment",
  "project/sources/",
  "project/workbench/",
  "project/artifacts/",
  "project/brain/",
  "project/conteudos/",
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
  "spec-driven",
  "topic-cluster",
  "seo-analysis",
  "keyword-research",
  "backlink-analysis",
  "data-setup",
  "technical-seo",
  "next-website-creator",
  "payload-cms",
  "DataForSEO",
  "não somos afiliados",
  "Next.js",
  "local browser handoff",
  "two or more deliverables",
  "approval-gated workflows",
  "Brain approval gate",
  "Content approval gate",
  "explicit written bypass approval",
  "Avoid presenting blocked downstream deliverables as complete",
  "stop at the first missing gate",
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
