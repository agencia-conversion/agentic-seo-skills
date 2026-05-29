import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "brain-keeper", "SKILL.md"), "utf8");

// Brain-first protocol rules
for (const required of [
  "Authorial brain pages",
  "tipo: approval",
  "aprovador: pendente",
  "aprovado_em",
  "project/brain/log.md",
  "project/workbench/brain-keeper/",
  "project/contents/",
  "Wikilinks",
  "Markdown links",
]) {
  assert.ok(skill.includes(required), `missing brain-keeper rule: ${required}`);
}

// Full log entry schema
for (const field of ["tipo:", "escopo:", "decisao:", "evidencia:", "aprovador:", "aprovado_em:", "notas:"]) {
  assert.ok(skill.includes(field), `log schema missing field: ${field}`);
}

// All seven log entry types
for (const tipo of ["approval", "decision", "erratum", "lint", "ingestion", "publication", "proof"]) {
  assert.ok(skill.includes(tipo), `log tipo enum missing: ${tipo}`);
}

// Seven authorial brain pages
for (const page of ["index", "identity", "voice", "technology", "editorial", "topic-clusters", "log"]) {
  assert.ok(skill.includes(`\`${page}\``), `brain page enum missing: ${page}`);
}

// No legacy refs in skill
assert.ok(!skill.includes("skills/_shared/"), "brain-keeper must not depend on shared references");
assert.ok(!skill.includes("judgment_level"), "brain-keeper must not document legacy judgment_level field");
assert.ok(!skill.includes("approved_by:"), "brain-keeper must not document legacy approved_by field");

console.log("brain review protocol ok");
