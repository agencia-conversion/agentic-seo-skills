import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "wiki-maintainer", "SKILL.md"), "utf8");

for (const required of [
  "Strategic pages require explicit human approval",
  "Do not write strategic drafts, unverified claims, or review notes into `project/wiki/`",
  "Do not turn the claim into accepted wiki language",
  "Contradictions, gaps, stale claims, and missing citations are recorded",
  "type: strategic-approval",
  "type: operational-decision",
  "Obsidian wikilinks",
  "normal Markdown links",
  "wiki/fontes/index.md",
  "wiki/eeat.md",
]) {
  assert.ok(skill.includes(required), `missing wiki-maintainer rule: ${required}`);
}

assert.ok(!skill.includes("skills/_shared/"), "wiki-maintainer must not depend on shared references");

console.log("wiki review protocol ok");
