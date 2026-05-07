import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const contentSeo = readFileSync(resolve(root, "skills", "content-seo", "SKILL.md"), "utf8");
const agents = readFileSync(resolve(root, "AGENTS.md"), "utf8");
const claude = readFileSync(resolve(root, "CLAUDE.md"), "utf8");
const eeat = readFileSync(resolve(root, "skills", "eeat", "SKILL.md"), "utf8");

for (const phrase of [
  "voice_backed: true | false",
  "wiki_state:",
  "wiki-overlay flags",
  'Never request a "wiki bypass"',
  "evidence overlay, not a precondition",
]) {
  assert.ok(contentSeo.includes(phrase), `content-seo missing wiki overlay phrase: ${phrase}`);
}

for (const phrase of ["Project Subfolders", "<dimension>_backed: true", "Skills do not require wiki pages to exist"]) {
  assert.ok(agents.includes(phrase), `AGENTS.md missing wiki overlay phrase: ${phrase}`);
}

assert.ok(claude.includes("Project Subfolders"), "CLAUDE.md missing Project Subfolders pointer");

for (const phrase of ["eeat_backed: true", "wiki_state"]) {
  assert.ok(eeat.includes(phrase), `eeat skill missing wiki overlay phrase: ${phrase}`);
}

console.log("wiki overlay doctrine ok");
