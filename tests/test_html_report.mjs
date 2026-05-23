import assert from "node:assert/strict";
import { renderMarkdownReport } from "../scripts/lib/markdown-report.mjs";

const markdown = renderMarkdownReport({
  title: "Auditoria técnica",
  slug: "auditoria-tecnica",
  reportType: "technical-seo",
  subtitle: "example.com — pt-BR, desktop",
  generatedAt: "2026-05-13T10:00:00Z",
  sourceArtifact: "audits/example/report.yaml",
  score: 62,
  kpis: [{ label: "Score", value: "62/100", tone: "warn" }],
  charts: [{
    title: "Pontos perdidos",
    type: "bar",
    data: { labels: ["canonical"], datasets: [{ data: [10] }] },
  }],
  sections: [
    {
      heading: "Memória de cálculo",
      body_markdown: "```agentic-table\nversion: 1\ncolumns:\n  - key: check\n    label: Check\nrows:\n  - check: canonical\n```",
    },
  ],
});

assert.match(markdown, /^---\n/);
assert.match(markdown, /title: "Auditoria técnica"/);
assert.match(markdown, /report_type: "technical-seo"/);
assert.match(markdown, /source_artifact: "audits\/example\/report.yaml"/);
assert.match(markdown, /score: "62"/);
assert.doesNotMatch(markdown, /^# Auditoria técnica/m);
assert.match(markdown, /```agentic-kpis/);
assert.match(markdown, /version: 1/);
assert.match(markdown, /items:/);
assert.match(markdown, /```agentic-chart/);
assert.match(markdown, /```agentic-table/);
assert.match(markdown, /Memória de cálculo/);
assert.doesNotMatch(markdown, /<!doctype html>/i);
assert.doesNotMatch(markdown, /<script/i);

console.log("markdown report ok");
