import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const reportSkills = [
  "seo-analysis",
  "technical-seo",
  "backlink-analysis",
  "keyword-research",
  "serp-extract",
  "internal-links",
  "eeat",
  "topic-cluster",
  "competitive-analysis",
];

const nonReportDeliverySkills = [
  "content-seo",
  "content-import",
  "brain-keeper",
  "spec-driven",
  "project-init",
];

function skillText(name) {
  return readFileSync(resolve(root, "skills", name, "SKILL.md"), "utf8");
}

for (const name of reportSkills) {
  const text = skillText(name);
  assert.match(text, /\bpage-report\b/, `${name} must use page-report`);
  assert.match(text, /project\/analyses\//, `${name} must declare Companion report path`);
  assert.match(text, /\breport_md\b/, `${name} must return report_md`);
  assert.match(text, /\bbrowser_prompt\b/, `${name} must return browser_prompt`);
  assert.match(text, /Posso abrir o Web Companion para você ver a análise\?/, `${name} must use report prompt`);
}

for (const name of nonReportDeliverySkills) {
  const text = skillText(name);
  assert.match(text, /Web Companion/i, `${name} must mention Web Companion`);
  assert.match(text, /\bartifact_path\b/, `${name} must return artifact_path`);
  assert.match(text, /\bcompanion_path\b/, `${name} must return companion_path`);
  assert.match(text, /\bcompanion_slug\b/, `${name} must return companion_slug`);
  assert.match(text, /\bbrowser_prompt\b/, `${name} must return browser_prompt`);
  assert.match(text, /project\/(workbench|artifacts|brain|contents)\//, `${name} must point to a project artifact`);
  assert.match(text, /Posso abrir o Web Companion para você revisar esta entrega\?/, `${name} must use review prompt`);
}

const contentSeo = skillText("content-seo");
for (const expected of [
  "project/workbench/content/<slug>/brief.md",
  "project/artifacts/contents/<slug>/draft.md",
  "project/artifacts/contents/<slug>/checks.yaml",
  "project/contents/<origin>/<slug>.md",
]) {
  assert.ok(contentSeo.includes(expected), `content-seo missing phase artifact ${expected}`);
}

const dataSetup = skillText("data-setup");
assert.match(dataSetup, /browser handoff/i);
assert.match(dataSetup, /sensitive/i);
assert.match(dataSetup, /Do not present raw terminal commands as the primary/);

console.log("companion delivery contract ok");
