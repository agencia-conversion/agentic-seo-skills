# SEO Brain Product Spec v0.1

## Purpose

SEO Brain is a Claude Code/Codex plugin for implementing Agentic SEO as an operational system. It should help less technical users create and run SEO projects without needing to read terminal output. The plugin should expose project state, generated artifacts, tutorials, previews, and review checkpoints through a local web app whenever possible.

The plugin is grounded in the Agentic SEO philosophy described at:

- https://agenticseo.sh/blog/o-que-e-seo-agentico

The central operating distinction is:

- Intelligence: work that can be described, evaluated, repeated, and progressively automated.
- Judgment: strategic, creative, editorial, risk, and brand decisions that remain human until they are explicitly documented well enough to become future intelligence.

## Pillars

SEO Brain v0.1 covers six pillars:

1. Strategy
2. LLM Wiki
3. Technology
4. Technical SEO
5. Content
6. Data and Analysis

Every project should make these pillars visible in the Wiki and in the project dashboard.

## Multi-Project Architecture

Runtime projects should be created under:

```text
projects/[project-slug]/
  wiki/
  web/
  sources/
  reports/
  artifacts/
  .seo-brain/
```

The public plugin repository should not commit real runtime projects. The repository should include templates, example fixtures, and tests only.

## UX Principle

Users should not need to parse terminal logs. CLI output can exist for developers, but the default user-facing workflow should be:

1. ask clear questions in natural Portuguese;
2. write structured files in the project;
3. show outputs in a local web app;
4. request explicit approval when a strategic artifact changes;
5. record the decision in the Wiki log.

This implies a dedicated `ux-web` or `project-dashboard` skill in v0.1.

## Project Wiki

The Wiki is the source of operational context for each project. It should be Obsidian-compatible Markdown and use stable internal links. Open `projects/<slug>/wiki/` as the Obsidian vault; raw evidence remains outside the vault in `projects/<slug>/sources/`.

Required initial structure:

```text
wiki/
  index.md
  eeat.md
  schema.md
  estrategia/
    index.md
  llm-wiki/
    index.md
  tecnologia/
    index.md
  seo-tecnico/
    index.md
  tom-de-voz/
    index.md
  conteudos/
    index.md
    topic-clusters.md
  dados-e-analise/
    index.md
  fontes/
    index.md
  log/
    index.md
```

`wiki/fontes/index.md` is only a catalog. Raw crawls, SERP snapshots, interviews, analytics exports, provider responses, and other evidence files live in sibling `sources/` folders and are linked with normal Markdown links such as `[fonte](../sources/manual/file.md)`.

Strategic pages require explicit human approval before they can be treated as approved operating context:

- `wiki/index.md`
- `wiki/eeat.md`
- `wiki/tecnologia/index.md`
- `wiki/tom-de-voz/index.md`

The LLM may draft, propose, update, and cross-link these pages, but it must mark them as `status: draft` until the user approves.

## Recommended Frontmatter

```yaml
---
title: "Page title"
status: draft
pillar: wiki
owner: human
last_reviewed: null
approved_by: null
approved_at: null
sources: []
judgment_level: strategic
---
```

`owner` can be `human`, `agent`, or `shared`.

`judgment_level` can be:

- `strategic`: needs explicit human approval;
- `editorial`: agent can propose, human can calibrate;
- `operational`: agent can update when tests pass;
- `observational`: factual log or extracted data.

## v0.1 Skills

### Foundation

- `project-init`: creates the multi-project directory, initial Wiki, local dashboard, and config.
- `ux-web`: starts and updates the local web app for artifacts, previews, tutorials, and approval flows.
- `wiki-maintainer`: ingests sources, updates indexes, manages cross-links, logs changes, and runs Wiki lint.

### Strategy

- `topic-cluster`: builds topic clusters using keyword research plus information-completeness reasoning.
- `eeat`: documents brand experience, expertise, authority, trust, evidence, authors, citations, and external proof.

### Technology

- `next-website-creator`: creates a Next.js SSG site with home, services/products/features, blog, post, and contact.
- `payload-cms`: sets up local Payload, content collections, deployment path, and Vercel integration.

### Technical SEO

- `technical-seo`: deterministic page-type checks implemented with TypeScript functions and test fixtures.

### Content

- `content-seo`: runs SEO analysis, creates a briefing, writes Brazilian Portuguese content, and reviews AI slop risks.

### Data and Analysis

- `seo-analysis`: analyzes a keyword SERP, compares top 3 results, extracts heading/meta patterns, evaluates UX intent, and proposes improvements.
- `keyword-research`: uses DataForSEO keyword APIs.
- `serp-extract`: uses DataForSEO SERP APIs.
- `backlink-analysis`: gets aggregate backlink and referring-domain data.
- `data-setup`: helps nontechnical users configure external data providers through the web UI.

## External Data

The local `.env` currently contains credentials for several providers, including DataForSEO. The implementation must never print or commit secrets.

Observed env keys:

- `ANTHROPIC_API_KEY`
- `SERPER_API_KEY`
- `FIRECRAWL_API_KEY`
- `SCRAPINGBEE_API_KEY`
- `OPENAI_API_KEY`
- `SEMRUSH_API_KEY`
- `RESEND_API_KEY`
- `GEMINI_API_KEY`
- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`
- `E2B_API_KEY`

There is a duplicate `SCRAPINGBEE_API_KEY` entry in the current `.env`; the implementation should normalize this when generating `.env.example`, but should not edit the real `.env` without confirmation.
