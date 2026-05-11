import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "next-website-creator", "SKILL.md"), "utf8");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*next-website-creator$/m);

for (const section of ["## When To Use", "## Critical Points", "## Framework", "## Output Format", "## Examples", "## Related Skills"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

for (const required of [
  "Public articles and blog posts must come from checked `content-seo` output",
  "install missing dependencies when needed",
  "run the build from `project/web/`",
  "verify static export output such as `project/web/out/` when requested",
  "start a localhost preview",
  "Give the user the local preview URL",
  "If no checked content artifact exists",
  "use to create, write, and check content briefs and article drafts before blog posts are published",
  "Never write a placeholder",
  "`noindex` article",
  "avoid creating public placeholder content",
  "spec-driven",
  "present it as delivered public content",
  "checked content artifact",
  "preview_url",
  "static_output",
  "Do not silently publish dependency gaps",
]) {
  assert.ok(skill.includes(required), `missing next website rule: ${required}`);
}

console.log("next-website-creator skill ok");
