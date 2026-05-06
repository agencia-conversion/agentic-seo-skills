import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const skill = readFileSync(resolve(root, "skills", "next-website-creator", "SKILL.md"), "utf8");

assert.ok(skill.startsWith("---\n"));
assert.match(skill, /^name:\s*next-website-creator$/m);

for (const section of ["## Contract", "## Required Behavior", "## Done Criteria"]) {
  assert.ok(skill.includes(section), `missing ${section}`);
}

for (const required of [
  "Public articles/posts must come from `content-seo` output",
  "run the needed package-manager install before validation",
  "Run `npm run build` from `project/web/` before presenting the site as done",
  "configure and verify the static output directory",
  "Start a local preview/dev server yourself",
  "give the user the URL",
  "Do not end with only a \"useful commands\" block unless execution was impossible",
  "If no approved content artifact exists",
  "run or request `seo-analysis` plus `content-seo`",
  "Do not substitute missing public content with a final stub",
  "placeholder article",
  "noindex page",
  "leave the dependent post out of the public build",
  "blocked in the active `spec-driven` plan",
  "do not present it as delivered",
  "Public article pages consume an approved `content-seo` draft",
  "Dependencies are installed or already present",
  "A local preview/dev server is running",
  "Static export requests have a verified `project/web/out/`",
  "stops before the dependent page",
  "project/workbench/specs/<slug>/plan.md",
]) {
  assert.ok(skill.includes(required), `missing next website rule: ${required}`);
}

console.log("next-website-creator skill ok");
