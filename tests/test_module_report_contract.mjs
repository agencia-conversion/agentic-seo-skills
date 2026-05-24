import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-module-contract-"));
const projectDir = join(tmp, "project");
const artifactRel = "audits/internal-links-run-1/report.yaml";
const artifactPath = join(projectDir, artifactRel);
const reportPath = join(projectDir, "analises", "internal-links", "run-1", "report.md");
const writer = resolve(root, "scripts", "lib", "report-writer.mjs");
const reviewer = resolve(root, "scripts", "review_reports.mjs");

function reportMarkdown({ includeRecommendations }) {
  const recommendations = includeRecommendations ? `
## Recomendações

\`\`\`agentic-table
version: 1
columns:
  - key: source_url
    label: Fonte
  - key: target_url
    label: Destino
  - key: anchor_text
    label: Anchor
  - key: before
    label: Antes
  - key: after
    label: Depois
  - key: status
    label: Status
  - key: action
    label: Ação recomendada
rows:
  - source_url: https://example.com/blog/seo
    target_url: https://example.com/seo-agentico/
    anchor_text: SEO agêntico
    before: O guia apresenta uma oportunidade contextual sobre
    after: para times que precisam revisar páginas e decidir prioridades.
    status: needs_review
    action: Inserir link contextual após revisão humana do parágrafo.
\`\`\`
` : "";

  return `---
title: "Links internos — teste"
slug: "run-1"
report_type: "internal-links"
generated_at: "2026-05-24T00:00:00.000Z"
status: "ready"
source_artifact: "${artifactRel}"
summary: "Uma análise de links internos com recomendação contextual validada."
---

## Resumo executivo

A análise revisou páginas do site e separou recomendações de links internos com evidência textual.

\`\`\`agentic-kpis
version: 1
items:
  - label: Oportunidades
    value: "1"
\`\`\`
${recommendations}
## Candidatos bloqueados

Nenhum candidato bloqueado neste fixture.

## Limitações

- Fixture sintético para validar o gate pré-write.
`;
}

try {
  mkdirSync(join(projectDir, "brain"), { recursive: true });
  mkdirSync(join(projectDir, "audits", "internal-links-run-1"), { recursive: true });
  writeFileSync(join(projectDir, "brain", "log.md"), "# Log\n", "utf8");
  writeFileSync(artifactPath, YAML.stringify({ version: 1, recommendations: [] }), "utf8");

  const invalid = spawnSync("node", [
    writer,
    "--project",
    projectDir,
    "--module",
    "internal-links",
    "--slug",
    "run-1",
    "--source-artifact",
    artifactRel,
    "--no-log",
  ], { cwd: root, input: reportMarkdown({ includeRecommendations: false }), encoding: "utf8" });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stdout, /contract\.section_missing/);
  assert.equal(existsSync(reportPath), false, "invalid report must not be written");

  const valid = spawnSync("node", [
    writer,
    "--project",
    projectDir,
    "--module",
    "internal-links",
    "--slug",
    "run-1",
    "--source-artifact",
    artifactRel,
    "--no-log",
  ], { cwd: root, input: reportMarkdown({ includeRecommendations: true }), encoding: "utf8" });
  assert.equal(valid.status, 0, valid.stdout || valid.stderr);
  assert.equal(existsSync(reportPath), true, "valid report should be written");

  const reviewed = JSON.parse(execFileSync("node", [reviewer, projectDir, "--module", "internal-links", "--allow-missing-modules"], { cwd: root, encoding: "utf8" }));
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.reviewed[0].module, "internal-links");

  console.log("module report contract ok");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
