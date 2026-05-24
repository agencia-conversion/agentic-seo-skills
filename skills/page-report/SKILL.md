---
name: page-report
description: Shared report-page contract for Agentic SEO modules that render editable, human-first Markdown reports in the Web Companion.
metadata:
  version: 1.0.0
---

# Page Report

Use this skill whenever an Agentic SEO workflow generates a report page for the Web Companion. It is a shared contract, not a standalone SEO module.

## When To Use

Use `page-report` from report-producing skills and runtime code when creating or reviewing `report.md` for Technical SEO, Internal Links, SEO Analysis, Keyword Research, SERP Extract, Backlink Analysis, Topic Cluster, or E-E-A-T.

Do not use this skill for public content drafts, approval handoffs, inline chat answers, raw provider captures, or authorial Brain updates that are not report pages.

## Critical Points

- The canonical report path is `project/analises/<module>/<run-slug>/report.md`.
- The report is the editable human presentation layer. Raw evidence, normalized YAML/JSON, logs, and operational artifacts stay in `sources/`, `audits/`, `keywords/`, `clusters/`, `eeat/`, or `workbench/`.
- Frontmatter must include `title`, `slug`, `report_type`, `generated_at`, `status`, `source_artifact`, and `summary`; include `score` only when the module has a real score.
- Do not write `# <title>` in the Markdown body. The Companion renders the title from frontmatter.
- Use the project language from `project/.agentic-seo/project.json.language` unless a command has an explicit language override. Complete copy is required for `pt-BR` and `en`.
- New visual fences must be YAML with `version: 1`: `agentic-kpis`, `agentic-chart`, and `agentic-table`. JSON fences are legacy read compatibility only.
- Tables must use stable lower-snake ASCII `key` values. User-facing `label` values may be translated or edited without changing keys.
- Calculation tables must mark columns with `role: weight`, `role: points`, and `role: loss` so score recalculation survives label edits.
- Each report-producing module has `skills/<module>/contract.yaml` and `templates/analises/<module>/report-skeleton.md`; keep required H2 sections and table keys from the skeleton.
- Before declaring a manual report done, run `npm run validate:reports -- --module=<module> --slug=<run-slug>` or use `scripts/lib/report-writer.mjs`, which refuses invalid reports before writing.
- Never paste raw provider JSON, object arrays, `[object Object]`, internal IDs, or snake_case evidence into the visual body. Convert evidence into natural language and readable tables.
- Always return `report_md` and `browser_prompt: { recommended: true, message: "Posso abrir o Web Companion para você ver a análise?", open_with: "project-browser" }`.
- Register the generated report in `project/brain/log.md` as `tipo: decisao` unless a more specific log type is required.

## Framework

### 1. Build The Source Artifact

Write the module's authoritative machine-readable artifact first. It may be YAML or JSON, but it must remain outside `project/analises/` and be referenced by frontmatter `source_artifact`.

### 2. Render The Human Page

Start with an executive reading. Then add module-specific sections, visual blocks, and human-readable appendices. Keep technical depth, but translate it into prose, friendly labels, and compact evidence.

### 3. Validate The Contract

Before returning the result, verify: canonical path, frontmatter, no H1 body title, no HTML default, YAML visual fences, no raw JSON/object dumps, readable evidence, source separation, and log entry.

### 4. Review The Result

For QA, generate one report per module with fixtures/offline data. A report is satisfactory only when it scores at least 4/5 for clarity, evidence separation, visual usefulness, actionability, and localization, with no category below 3/5.

## Output Format

The report Markdown must have this shape:

````markdown
---
title: "Human report title"
slug: "stable-run-slug"
report_type: "technical-seo"
generated_at: "2026-05-23T00:00:00.000Z"
status: "ready"
source_artifact: "audits/example/report.yaml"
summary: "One-sentence executive summary."
score: "92"
---

Executive summary prose without a duplicate H1.

```agentic-kpis
version: 1
items:
  - label: Score
    value: 92/100
```
````

Use only supported `report_type` values: `technical-seo`, `internal-links`, `seo-analysis`, `keyword-research`, `serp-extract`, `backlink-analysis`, `topic-cluster`, and `eeat`.

## Done Criteria

- `report.md` exists under the canonical module path and is returned as `report_md`.
- `source_artifact` points to the normalized technical source.
- The Companion can list, open, edit, save, and roundtrip the page.
- Visual fences parse as YAML `version: 1`.
- No visible JSON/object dumps or duplicated title appear in the report body.
- The report is registered in `brain/log.md`.
