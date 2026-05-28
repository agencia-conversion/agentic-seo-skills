---
name: content-import
description: When the user wants to bulk-import existing public content from a website (via sitemap or a list of URLs) into project/contents/<origin>/<slug>.md as the starting point for editorial work in this brain.
metadata:
  version: 1.0.0
---

# Content Import

You are a batch content importer for Agentic SEO. Your goal is to discover, extract, and materialize existing public content from a target site into the project's `project/contents/<origin>/<slug>.md` layout, preserving the canonical frontmatter contract (v1) so the imported pages can later be assigned to topic clusters, reviewed editorially, and linked from the brain.

This skill does NOT create new editorial content. It mirrors what is already public on a target site. The user owns the editorial decisions (cluster assignment, status, errata) that follow the import.

## When To Use

Use this skill when the user asks to:
- Import all (or a slice of) the public content from a website's sitemap into the local brain.
- Backfill `project/contents/` from an external authoritative source.
- Snapshot a competitor or partner site for analysis (use `origin: other` and clearly mark scope in the log).

Do not use this skill to:
- Write new posts from scratch — use `content-seo` with evidence gates.
- Run technical SEO audits — use `technical-seo`.
- Score brand authority — use `eeat` or `competitive-analysis`.

## Critical Points

- Never fabricate frontmatter. `title`, `published_at`, `language`, `byline` come from the extracted page; if missing, leave the corresponding field absent (or use the import date for `published_at` only as last resort).
- `contract_version: 1` is mandatory. `clusters: []` is allowed at import time; cluster assignment is a separate editorial step (use `topic-cluster` skill).
- Idempotent: do not overwrite a substantive existing file at the target path. Re-running the import must report `skipped` for those.
- Source separation: the import preserves the body in Markdown; raw HTML or provider responses do not go in `contents/` — they belong in `project/sources/` if needed.
- Append a single consolidated `type: ingestion` entry to `brain/log.md` per import run, listing files by origin. Do not write 1 entry per file.
- Respect robots.txt and copyright when importing competitor sites; use this skill only for sites the user owns or has permission to mirror.

## Inputs

- `--base <url>`: target site root (e.g., `https://agenticseo.sh`). Required.
- `--dry-run`: list classification + would-be paths without writing.
- `--limit <n>`: process the first N importable URLs (handy for smoke tests).

## Framework

### 1. Discover

Fetch `<base>/sitemap.xml` and parse `<loc>` + `<lastmod>` entries. If the sitemap is unavailable, stop and ask the user for a list of URLs or a sitemap index URL.

### 2. Classify

For each URL, derive `origin` from the path:

- `/blog/<slug>` → `origin: blog`, write to `contents/blog/<slug>.md`.
- `/podcast/<slug>` → `origin: podcast`.
- LinkedIn URLs from the user's authoritative profile → `origin: linkedin`.
- Anything else relevant (tools, courses, landing pages, ai-metrics, etc.) → `origin: other`.
- Section indexes (`/`, `/blog`, `/tools`, `/cursos`) → skip.

If the user wants a different mapping, follow the user's instruction and record the override in `brain/log.md` as `type: decision`.

### 3. Extract

Call `node tools/clis/extract.js --url <url> --timeout 60000` for each importable URL. Parse the JSON response (`title`, `body_markdown`, `date_published`, `byline`, `language`, `word_count`).

If extraction fails (HTTP error, anti-bot, empty body), log the failure in the run summary and continue. Do not silently skip — the human needs to know which URLs are missing.

### 4. Write

For each successful extraction, write `project/contents/<origin>/<slug>.md` with frontmatter:

```yaml
contract_version: 1
title: "<title>"
slug: "<slug>"
published_at: "<YYYY-MM-DD>"
source_url: "<url>"
origin: "<origin>"
clusters: []
# role: { <cluster-slug>: pillar | satellite }   # left commented; editorial decision later
```

Optional fields when extracted: `author`, `language`, `category` (free string for `other` subtypes like `tools`/`cursos`).

Append the page body as Markdown, followed by a `## Importação` block with `importado_em`, `fonte`, `método`, `palavras` for traceability.

Skip the file if it already exists with non-template content.

### 5. Log

Append a single consolidated entry to `brain/log.md`:

```markdown
## YYYY-MM-DD - Import <base> (content-import)

- type: ingestion
- scope: project/contents/<origin>/, …
- decision: <N> conteúdos importados de <base> via tools/clis/site-import.js. Distribuição: …
- evidence: <base>/sitemap.xml
- approver: agent
- notes: Cluster assignment pendente; rodar topic-cluster skill ou editar frontmatter quando dados sustentarem.
```

### 6. Next Steps

After the import, suggest:

1. Run `keyword-research` and `topic-cluster` to assign imported content to clusters via the `clusters:` frontmatter field.
2. Review imported pages for errata, missing internal links, and broken external links.
3. Optionally re-extract pages where extraction quality was poor (e.g., interactive tools that render via JS — use `--no-fallback` to debug).

## Tooling

This skill is a thin orchestrator. The deterministic work happens in:

- `tools/clis/site-import.js` — sitemap discovery + classification + extract loop + idempotent write. Stable CLI with JSON envelope (`--json`). Reuses `tools/clis/extract.js`.
- `scripts/import-site.mjs` — implementation backing the tool; the skill can shell out to either entry point.

## Output Format

```yaml
status: complete | partial | failed
base: "<url>"
discovered: <n>
importable: <n>
wrote: <n>
skipped: <n>
failed: <n>
files:
  blog: [<slug>, …]
  other: [<slug>, …]
log_appended: true
next_action: "Atribuir clusters aos conteúdos importados via skill topic-cluster."
```

## Done Criteria

- All importable URLs from the sitemap are accounted for in the summary (wrote/skipped/failed).
- Every written file has frontmatter `contract_version: 1` + `clusters: []`.
- Brain log carries one consolidated `type: ingestion` entry for the run.
- No raw HTML or provider response files were placed under `project/contents/`.
- pt-BR accents preserved in titles, bylines, and the imported body.
