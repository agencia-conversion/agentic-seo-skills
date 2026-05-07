import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "brain-keeper", "SKILL.md"), "utf8");

for (const required of [
  "Authorial brain pages",
  "tipo: aprovacao",
  "aprovador: pendente",
  "aprovado_em",
  "project/brain/log.md",
  "project/workbench/brain-keeper/",
  "project/conteudos/",
  "Wikilinks",
  "Markdown links",
]) {
  assert.ok(skill.includes(required), `missing brain-keeper rule: ${required}`);
}

assert.ok(!skill.includes("skills/_shared/"), "brain-keeper must not depend on shared references");

console.log("brain review protocol ok");
