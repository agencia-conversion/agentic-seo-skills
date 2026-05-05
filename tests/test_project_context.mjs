import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "seo-brain");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-project-context-"));
const project = join(tmp, "project");
const env = { ...process.env, SEO_BRAIN_PROJECT_DIR: project };

execFileSync(bin, ["project-init", "Context test", "--market", "Portugal", "--country", "Portugal", "--language", "pt-PT"], {
  cwd: root,
  encoding: "utf8",
  env,
});

const wikiIndex = readFileSync(join(project, "wiki", "index.md"), "utf8");
const config = JSON.parse(readFileSync(join(project, ".seo-brain", "project.json"), "utf8"));

assert.equal(config.country, "Portugal");
assert.equal(config.market, "Portugal");
assert.equal(config.language, "pt-PT");
assert.ok(wikiIndex.includes('country: "Portugal"'));
assert.ok(wikiIndex.includes('market: "Portugal"'));
assert.ok(wikiIndex.includes('language: "pt-PT"'));
assert.ok(wikiIndex.includes("- Pais/mercado de atuacao: Portugal."));
assert.ok(wikiIndex.includes("- Idioma principal: pt-PT."));

rmSync(tmp, { recursive: true, force: true });
console.log("project context ok");
