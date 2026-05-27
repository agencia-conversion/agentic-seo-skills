import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "agentic-seo");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-project-context-"));
const project = join(tmp, "project");
const env = { ...process.env, AGENTIC_SEO_PROJECT_DIR: project };

execFileSync(bin, ["project-init", "Context test", "--market", "Portugal", "--country", "Portugal", "--language", "pt-PT"], {
  cwd: root,
  encoding: "utf8",
  env,
});

const config = JSON.parse(readFileSync(join(project, ".agentic-seo", "project.json"), "utf8"));
assert.equal(config.country, "Portugal");
assert.equal(config.market, "Portugal");
assert.equal(config.language, "pt-PT");
assert.equal(config.schema_version, "2.0.0");
assert.equal(config.single_project_root, "project");

const brainIndex = readFileSync(join(project, "brain", "index.md"), "utf8");
assert.ok(brainIndex.includes('title: "Context test"'));

const expectedBrainTitles = {
  "identidade.md": "Identidade",
  "voz.md": "Tom de Voz",
  "tecnologia.md": "Tecnologia",
  "topic-clusters.md": "Topic Clusters",
  "revisao.md": "Revisão",
  "log.md": "Log",
};
for (const [page, title] of Object.entries(expectedBrainTitles)) {
  const text = readFileSync(join(project, "brain", page), "utf8");
  assert.ok(text.includes(`title: "${title}"`), `brain/${page} should use canonical title`);
  assert.doesNotMatch(text, /title:\s*".+ — Context test"/, `brain/${page} should not include project suffix`);
}

for (const page of ["index.md", "identidade.md", "voz.md", "tecnologia.md", "topic-clusters.md", "revisao.md", "log.md"]) {
  assert.ok(existsSync(join(project, "brain", page)), `missing brain/${page}`);
}
for (const origem of ["blog", "linkedin", "podcast", "outros"]) {
  assert.ok(existsSync(join(project, "conteudos", origem, "_template.md")), `missing conteudos/${origem}/_template.md`);
}

const log = readFileSync(join(project, "brain", "log.md"), "utf8");
assert.match(log, /## \d{4}-\d{2}-\d{2} - Projeto criado/);
assert.match(log, /tipo: decisao/);
assert.match(log, /Portugal/);

rmSync(tmp, { recursive: true, force: true });
console.log("project context ok");
