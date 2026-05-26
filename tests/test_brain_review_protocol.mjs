import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "brain-keeper", "SKILL.md"), "utf8");

// Brain-first protocol rules
for (const required of [
  "Authorial brain pages",
  "type: approval",
  "type: decision",
  "approver: agent",
  "approved_at",
  "project/brain/log.md",
  "project/workbench/brain-keeper/",
  "project/content/",
  "Wikilinks",
  "Markdown links",
]) {
  assert.ok(skill.includes(required), `missing brain-keeper rule: ${required}`);
}

// Full log entry schema
for (const field of ["type:", "scope:", "decision:", "evidence:", "approver:", "approved_at:", "notes:"]) {
  assert.ok(skill.includes(field), `log schema missing field: ${field}`);
}

// All seven log entry types
for (const type of ["approval", "decision", "erratum", "lint", "ingestion", "publication", "proof"]) {
  assert.ok(skill.includes(type), `log type enum missing: ${type}`);
}

// Eight canonical brain pages (seven authorial + log)
for (const page of ["index", "identity", "voice", "technology", "editorial", "topic-clusters", "review", "log"]) {
  assert.ok(skill.includes(`\`${page}\``), `brain page enum missing: ${page}`);
}

// No legacy refs in skill
assert.ok(!skill.includes("skills/_shared/"), "brain-keeper must not depend on shared references");
assert.ok(!skill.includes("judgment_level"), "brain-keeper must not document legacy judgment_level field");
assert.ok(!skill.includes("approved_by:"), "brain-keeper must not document legacy approved_by field");

console.log("brain review protocol ok");
