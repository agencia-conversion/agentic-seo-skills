#!/usr/bin/env node
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";

const MODULES = new Set([
  "technical-seo",
  "internal-links",
  "seo-analysis",
  "keyword-research",
  "serp-extract",
  "backlink-analysis",
  "topic-cluster",
  "eeat",
]);

function parseFrontmatter(text, file) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  assert.ok(match, `${file}: missing frontmatter`);
  return YAML.parse(match[1]) || {};
}

function bodyWithoutFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function fences(text) {
  return [...text.matchAll(/```(agentic-(?:kpis|chart|table))\n([\s\S]*?)```/g)].map((match) => ({
    kind: match[1],
    body: match[2],
  }));
}

function visibleBody(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

function reviewReport(file, projectDir) {
  const rel = path.relative(projectDir, file).replace(/\\/g, "/");
  const parts = rel.split("/");
  assert.equal(parts[0], "relatorios", `${rel}: must live under relatorios`);
  assert.ok(MODULES.has(parts[1]), `${rel}: unsupported module ${parts[1]}`);
  assert.equal(parts.at(-1), "report.md", `${rel}: file must be report.md`);

  const text = fs.readFileSync(file, "utf8");
  const fm = parseFrontmatter(text, rel);
  const body = bodyWithoutFrontmatter(text);
  for (const key of ["title", "slug", "report_type", "generated_at", "status", "source_artifact", "summary"]) {
    assert.ok(fm[key] !== undefined && fm[key] !== "", `${rel}: missing frontmatter ${key}`);
  }
  assert.equal(fm.report_type, parts[1], `${rel}: report_type must match module`);
  assert.ok(fs.existsSync(path.join(projectDir, fm.source_artifact)), `${rel}: source_artifact missing on disk`);
  assert.doesNotMatch(body, /^#\s+/m, `${rel}: report body must not contain H1`);
  assert.doesNotMatch(body, /\[object Object\]/, `${rel}: object dump visible`);
  assert.doesNotMatch(visibleBody(body), /\[\s*\{[\s\S]*?\}\s*\]/, `${rel}: raw object array visible`);
  assert.doesNotMatch(visibleBody(body), /\{\\?"[a-z0-9_]+\\?":/, `${rel}: raw JSON object visible`);
  assert.doesNotMatch(body, /round\(sum\(points_awarded\)/, `${rel}: formula must not be visible`);
  assert.equal(fs.existsSync(file.replace(/report\.md$/, "report.html")), false, `${rel}: report.html generated`);

  const parsedFences = fences(body);
  assert.ok(parsedFences.length > 0, `${rel}: expected at least one visual block`);
  for (const fence of parsedFences) {
    const payload = YAML.parse(fence.body);
    assert.equal(payload?.version, 1, `${rel}: ${fence.kind} must use YAML version 1`);
    if (fence.kind === "agentic-table") {
      const keys = new Set();
      for (const column of payload.columns || []) {
        assert.match(column.key, /^[a-z0-9_]+$/, `${rel}: table column keys must be stable ASCII snake keys`);
        assert.equal(keys.has(column.key), false, `${rel}: duplicate table column key ${column.key}`);
        keys.add(column.key);
      }
    }
  }

  const lower = text.toLowerCase();
  const rubric = {
    clarity: /resumo executivo|executive summary/.test(lower) ? 5 : 2,
    evidence: /source_artifact|evidência|evidence/.test(lower) ? 5 : 2,
    visual: parsedFences.length >= 2 ? 5 : 4,
    actionability: /ação|recomend|recommend|prioridade|priority/.test(lower) ? 5 : 3,
    localization: /página|conteúdo|análise|evidência|executive|summary/.test(lower) ? 5 : 3,
  };
  const min = Math.min(...Object.values(rubric));
  const average = Object.values(rubric).reduce((sum, value) => sum + value, 0) / Object.keys(rubric).length;
  assert.ok(min >= 3, `${rel}: review rubric has category below 3/5`);
  assert.ok(average >= 4, `${rel}: review rubric average below 4/5`);
  return { report: rel, module: parts[1], rubric };
}

function reportFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...reportFiles(p));
    else if (entry.isFile() && entry.name === "report.md") out.push(p);
  }
  return out.sort();
}

const projectDir = path.resolve(process.argv[2] || process.env.AGENTIC_SEO_PROJECT_DIR || "project");
const files = reportFiles(path.join(projectDir, "relatorios"));
const reviewed = files.map((file) => reviewReport(file, projectDir));
const modules = new Set(reviewed.map((item) => item.module));
for (const moduleId of MODULES) assert.ok(modules.has(moduleId), `missing module report: ${moduleId}`);
process.stdout.write(`${JSON.stringify({ ok: true, project_dir: projectDir, reviewed }, null, 2)}\n`);
