# SEO Brain Implementation Plan v0.1

## Current State

The repository is the plugin root. It contains Claude Code and Codex manifests, initial skill contracts, Wiki templates, planning artifacts, and a local `.env`. It is not initialized as a git repository yet.

Local credentials are present and must remain private. The observed keys are enough to support DataForSEO, AI providers, scraping providers, email, and external execution later.

## Key Product Decision

Repository shape is decided:

- Root-as-plugin is canonical.
- Claude Code is the first target.
- Codex compatibility is supported through `.codex-plugin/plugin.json` and standard `skills/<name>/SKILL.md` directories.
- Antigravity and other agents are supported through `AGENTS.md` and portable project conventions.

The plugin now uses explicit `version: 0.1.0` because the target is a public plugin release.

## v0.1 Definition

v0.1 should be a working plugin skeleton with independently testable skills and one complete golden path:

1. configure data providers;
2. create a project;
3. create and approve the initial Wiki;
4. run keyword/SERP analysis for one topic;
5. generate one topic cluster;
6. generate one content briefing;
7. create or audit a minimal Next.js SSG site;
8. show all artifacts in the web UI;
9. log the full cycle.

Not every skill needs to be perfect in v0.1, but every skill must have a documented contract, fixture, and evaluation harness.

## Architecture

Recommended plugin layout:

```text
.claude-plugin/
  plugin.json
.codex-plugin/
  plugin.json
skills/
  project-init/
  wiki-maintainer/
  topic-cluster/
  eeat/
  next-website-creator/
  payload-cms/
  technical-seo/
  content-seo/
  seo-analysis/
  keyword-research/
  serp-extract/
  backlink-analysis/
  data-setup/
scripts/
  seo-brain/
    dataforseo/
    technical-seo/
    wiki/
    autoresearch/
templates/
  project/
  wiki/
  next-site/
  dashboard/
tests/
  fixtures/
  integration/
  skill-evals/
assets/
docs/
program.md
AGENTS.md
CLAUDE.md
```

Runtime project data stays under `project/` locally and is ignored by git.

## Implementation Phases

### Phase 1: Plugin Skeleton and Contracts

Deliverables:

- scaffold Claude Code and Codex plugin manifests;
- create skill directories;
- add `SKILL.md` for every v0.1 skill contract;
- create `.env.example`;
- create project templates;
- add basic validation script for skill contracts.

Exit criteria:

- Claude Code plugin validates;
- every skill has purpose, inputs, outputs, write scope, and evaluation criteria;
- no secret values are committed.

Status: completed for skeleton, contracts, sub-agents, and v0.1 deterministic CLI.

### Phase 2: Wiki Engine

Deliverables:

- project template with Wiki pages;
- frontmatter conventions;
- approval status workflow;
- index/log updater;
- Wiki lint script;
- source ingestion flow.

Exit criteria:

- `project-init` creates a valid project;
- `wiki-maintainer` can ingest one source, update index, append log, and preserve raw source;
- strategic pages cannot become approved without explicit user approval.

### Phase 3: Data Layer

Deliverables:

- DataForSEO credential validator;
- keyword research client;
- SERP extraction client;
- backlink analysis adapter or provider abstraction;
- normalized JSON schemas;
- raw response persistence.

Exit criteria:

- tests pass with mocked responses;
- live smoke test works when credentials are present;
- missing credentials show a clear web UI message.

### Phase 4: SEO Analysis and Content

Deliverables:

- `seo-analysis` orchestrates SERP, extraction, top 3 comparison, UX observations, and improvement plan;
- `content-seo` creates briefing and draft;
- Brazilian Portuguese anti-slop checker;
- tone-of-voice integration.

Exit criteria:

- one keyword can produce a report, brief, and draft;
- claims are backed by sources or marked as hypotheses;
- content passes editorial checks.

### Phase 5: Technical SEO and Next Website

Deliverables:

- TypeScript technical SEO audit library;
- page-type fixtures;
- Next.js SSG starter;
- baseline schema, sitemap, robots, metadata, and content templates;
- local preview through web UI.

Exit criteria:

- starter site builds;
- technical audit produces JSON and human-readable report;
- golden-path pages pass deterministic baseline.

### Phase 6: Companion Browser Handoffs

Deliverables:

- approval handoffs for strategic Wiki pages;
- sensitive provider setup without echoing secrets;
- option-selection handoffs for workflows that need human judgment;
- review handoffs for multi-file Wiki changes.

Exit criteria:

- user can complete golden path without reading terminal logs;
- secrets are masked;
- errors are written in plain Portuguese.

### Phase 7: Autoresearch Harness

Deliverables:

- per-skill fixtures;
- score scripts;
- regression logs;
- candidate iteration protocol;
- promote/reject rules.

Exit criteria:

- each skill can be evaluated independently;
- failed experiments are reverted or isolated;
- improvements require measurable score gain and no regression in safety checks.

## Autoresearch Adaptation

Karpathy's Autoresearch pattern uses:

- a compact editable surface;
- fixed experiment budget;
- one or more metrics;
- keep/reject decision;
- logs;
- human-authored program instructions.

SEO Brain adapts this as:

- editable surface: one skill or one script at a time;
- immutable harness: fixtures, tests, and evaluator;
- metric: skill score plus deterministic pass/fail gates;
- keep rule: improve score without violating safety or approval constraints;
- reject rule: rollback or quarantine failed experiment;
- log: `runs/[date]/` plus Wiki development log when relevant.

## Open Questions

1. What is the smallest future dashboard surface worth building beyond the existing companion handoffs?
2. Which backlink provider should be authoritative for v0.1: DataForSEO backlinks, Semrush, or a provider abstraction with whichever credential is available?
3. Should generated project data remain entirely local, or should SEO Brain support creating a separate git repo for the project?
4. Should `version` remain omitted until public release, or should v0.1 use explicit semver tags from the start?

## Recommended Next Step

Run live DataForSEO smoke tests with `--live` only when ready to consume provider credits, then publish a test release.
