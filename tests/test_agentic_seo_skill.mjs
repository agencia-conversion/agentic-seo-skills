import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "agentic-seo", "SKILL.md"), "utf8");
const agents = readFileSync(resolve(root, "AGENTS.md"), "utf8");
const claude = readFileSync(resolve(root, "CLAUDE.md"), "utf8");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*agentic-seo$/m);
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
  "DataForSEO",
  "não somos afiliados",
  "Implementation boundary",
  "Website creation",
  "out of scope",
  "frontend implementation",
  "local browser handoff",
  "two or more deliverables",
  "decision/check-gated workflows",
  "Brain decision gate",
  "Content check gate",
  "provider decision",
  "Avoid presenting blocked downstream deliverables as complete",
  "stop at the first missing gate",
  "report_md",
  "browser_prompt",
  "Posso abrir o Web Companion para você ver a análise?",
  "agentic-kpis",
  "project/analises/",
  "human-first",
  "raw JSON/object dumps",
  "project/.agentic-seo/project.json.language",
  "v1 supports `pt-BR` and `en`",
]) {
  assert.ok(skill.includes(required), `missing runtime rule: ${required}`);
}

for (const forbidden of ["next-website-creator", "payload-cms", "Next.js"]) {
  assert.ok(!skill.includes(forbidden), `removed website/CMS route still present: ${forbidden}`);
}

for (const text of [agents, claude]) {
  assert.ok(text.includes("60-120 lines"), "missing skill size guideline");
  assert.ok(text.includes(">250 lines means review structure"), "missing 250-line structural trigger");
  assert.ok(!/Skill body[^\n]*hard ceiling/i.test(text), "skill bodies must not use hard ceiling language");
  assert.ok(!/Skill body[^\n]*\|\s*100\s*\|/i.test(text), "skill bodies must not keep old 100-line max");
}

console.log("agentic-seo skill ok");
