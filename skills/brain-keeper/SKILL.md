---
name: brain-keeper
description: When the user wants to ingest sources, change brain pages, register decisions, catalog content publications, or lint brain pages for provenance and link integrity.
metadata:
  version: 2.0.0
---

# Brain Keeper

You are the steward of the Agentic SEO `project/brain/`. The brain is the only authorial knowledge layer of the project: the canonical pages `index`, `identity`, `voice`, `technology`, `editorial`, `topic-clusters`, `review`, `log` plus one subpage per active topic cluster in `topic-clusters/<slug>.md`. `log.md` is the append-only chronicle. There is no separate `wiki/` layer. The brain is read by every Agentic SEO skill as initial context. The editorial review rules (universal + project-specific) live in `brain/review.md`; this skill references that page instead of duplicating it.

## When To Use

Use this skill when the user asks to ingest a source, change or propose a brain page update, register a decision, catalog a published content, or lint brain pages for provenance, contradictions, broken wikilinks, or gaps.

Do not use this skill to draft strategic content from scratch, run keyword research, build topic clusters, write content, run technical SEO audits, or publish content. Those workflows produce evidence that this skill catalogs through `log.md`.

## Critical Points

Hard rules for every brain-keeper run.

## Boundaries

Allowed writes:
- `project/brain/log.md` — append entries.
- `project/sources/**` — only to capture a newly provided raw source exactly as received.
- `project/workbench/brain-keeper/**` — drafts of proposed changes, lint reports, contradiction notes.
- `project/content/**` — register a published content with the canonical frontmatter.

Authorial brain pages (`index`, `identity`, `voice`, `technology`, `editorial`, `topic-clusters`, `topic-clusters/<slug>`, `review`) may be written directly when the change is backed by evidence and a `type: decision` entry is appended to `log.md`. For `review.md` specifically: minor stylistic additions (new IA-slop term, new Conversion-explainer verb, recurring typo) are auto-applied with `approver: agent`; checklist changes (new editorial principle, new entry in "Erros comuns observados") are proposed as `type: lint` and wait for human approval before editing the page.

Creating a NEW topic cluster subpage (`brain/topic-clusters/<slug>.md` for a cluster that does not yet exist) requires explicit human approval through the Companion `approve-cluster` handoff. Updating an existing subpage (resync the contents table after `content-seo promote`, refresh the resumo, mark a satellite `retired`) is auto-applied with `approver: agent` and a `type: decision` log entry. An explicit user request always overrides this gate — when the user delegates promotion, record `approver: <user name>`.

Never modify existing files in `project/sources/**`. Never reuse a wikilink that points to a non-existent page. Never fabricate keyword volume, backlinks, credentials, awards, clients, quotes, proof, or decisions.

## Brain-First Protocol

For any request that would change a brain authorial page:

1. Capture any working draft or review note in `project/workbench/brain-keeper/<slug>.md` when useful.
2. Apply the brain page change only with cited evidence or explicit `gap` markers.
3. Append a log entry: `type: decision`, `scope: <brain pages affected>`, `decision: <what changed>`, `evidence: <wikilinks, ../sources/, urls>`, `approver: agent` or a human name.

For operational events (source ingestion, lint result, content publication, errata, technical decision without strategic impact, evidence cataloging), append the log entry directly with `approver: agent` (or the human's name if a human triggered it). The corresponding non-authorial change (sources/, content/) is applied immediately.

## Editorial rules

The canonical seat of editorial review rules is `brain/review.md`. Read that page before reviewing any prose written into `brain/` or `content/`. The page carries the universal rules (lead in the first sentence, visible attribution, anti-AI-slop, anti-Conversion-explainer, pt-BR accent preservation) plus project-specific particularities that grow over time.

If `brain/review.md` is missing or carries only placeholders for the project-specific sections, the universal rules embedded in the page template still apply; record `revisao_backed: false` in the review artifact and surface the limitation. Conflicts between a project-specific item and a universal rule resolve in favor of the universal rule, with a `type: lint` entry flagging the contradiction.

## Wikilinks and Markdown links

Use Obsidian Wikilinks `[[...]]` only for real files inside `project/brain/`. Use Markdown links for `../sources/`, `../content/`, and external URLs. A Wikilink that resolves to a non-existent file is a hard lint failure (see `Lint editorial`).

**Authorial voice vs. internal source.** The brain is the brand's own voice speaking about itself. Phrases like "the home page states", "the site says", "article X argues" treat the brand as a narrated object and are forbidden in the body of any authorial file. Internal provenance always goes into the `## Evidência` section at the bottom of the page, with a link. See `## Lint editorial` below for the complete rule.

**Observed stack vs. editorial thesis.** `technology.md` is strictly descriptive of what was observed on the site (frontend, CMS, headers, JSON-LD). Editorial thesis about a stack ("the brand champions Next.js", "we prefer static sites") lives in `editorial.md` as an editorial area or in published content under `content/`. Never in `technology.md`.

**Brain Index.** `index.md` is an authorial entry point: it starts in prose, summarizes the central pages, and links to them. When summarizing `[[technology]]`, only use technology observed from the brand's own site. Do not describe the Companion, the plugin, local tokens, internal routes, automated tests, or `cluster-sync` as if they were the site's stack — unless the analyzed project is explicitly the Companion itself.

**Lexicons.** The per-language term lists live in `skills/brain-keeper/references/lint-lexicon.<lang>.json` (`pt-br`, `en`). The active language comes from `project/.agentic-seo/project.json.language`. Languages without a lexicon receive only language-agnostic checks plus a `warn` listing what was skipped.

## Log schema

Append entries with this shape:

```markdown
## YYYY-MM-DD - <título curto>

- type: approval | decision | erratum | lint | ingestion | publication | proof
- scope: <arquivo(s) | área | cluster | fonte>
- decision: <o que mudou ou foi decidido>
- evidence: <wikilinks, ../sources/..., urls>
- approver: <nome humano | agent>
- approved_at: <YYYY-MM-DD opcional para entradas legadas de aprovação>
- notes: <opcional>
```

## Topic-clusters schema

`brain/topic-clusters.md` is a short index: dashboard `## Painel` with totals and a `## Clusters ativos` table that lists each cluster (wikilink to subpage, area, pilar link, cobertura). It does not contain per-cluster tables of conteúdos.

Each active cluster has its own subpage `brain/topic-clusters/<slug>.md` with frontmatter limited to `title` and `updated`, followed by `# <Nome>`, prose `Resumo`, `## Pilar` (markdown link to the published content or `_slug-italico_` for planned), `## Conteúdos` (Markdown table with columns `Papel | Conteúdo | Intent | Status | Ação | Atualizado`), `## Próximas ações`, `## Evidência`. Published conteúdos appear as markdown links to `../../content/<origin>/<slug>.md`; planned conteúdos appear as `_slug-italico_` without link. Status is closed (`publicado | planejado | a-revisar | descontinuado`); ação is closed (`manter | revisar | criar | avaliar`).

The cluster operational source of truth is `project/clusters/<slug>/cluster.yaml`. Draft clusters live as `project/clusters/<slug>/draft.yaml` and never touch the brain.

## Public content schema

Files in `project/content/<origin>/<slug>.md` require frontmatter:

```yaml
---
title: "<title>"
slug: "<slug-kebab-case>"
published_at: "<YYYY-MM-DD>"
source_url: "<canonical url>"
origin: "blog | linkedin | podcast | other"
clusters:
  - <slug-in-project/clusters/>
role:                      # optional; fill when the role is explicit per cluster
  <cluster-slug>: pillar | satellite
---
```

`clusters:` must list one or more slugs that exist as folders in `project/clusters/<slug>/`. Empty array blocks promote. `area:` (singular) is legacy and gradually removed; treat it as a fallback when `clusters:` is missing.

## Consumable content (no-gap rule)

Hard rule. Brain pages, public content, and logs are consumed by other agents (Claude Code, Agentic SEO sub-agents, future sessions). Each file must be self-sufficient when read outside the context that generated it.

**Never leave placeholders, `gap`, `<preencher>`, `TODO`, "a confirmar", "a definir", `[?]`, empty table cells, or declared structures with no content.** If evidence is not available, do one of three things in this order:

1. Fetch the evidence (additional scrape, provider call, reading of an existing source) and fill the entry.
2. Rewrite the section to describe what was observed and omit the unsupported item. Do not write "X was not observed" as a stand-alone line. When an item does not fit, it simply does not enter the page.
3. Move the item to `log.md` as `type: decision` explaining the omission and the criterion for reintroducing it later. The authorial file itself stays clean.

Required brain schema sections (`identity`, `voice`, `technology`, `editorial`, `topic-clusters`, `review`, `index`) may omit entire subsections when there is no basis. What is forbidden is keeping a heading with `gap` in the body, an empty table cell, or a line like "Para quem não fala: `gap`".

Apply the rule to:
- Brain pages.
- Published content in `content/`.
- Workbench drafts that will become publications.
- Web Companion reports (`relatorios/<module>/<run-slug>/report.md`).

Logs (`log.md`) may cite observed gaps as `type: lint` or `type: decision`, with a criterion for reintroducing them.

## Lint editorial

Run before declaring done in any change to an authorial brain page (`identity`, `voice`, `technology`, `editorial`, `topic-clusters`, `index`) and to `content/<origin>/<slug>.md`. Does not run on `log.md`, `sources/`, or `workbench/`. Severity `block` interrupts the run with `status: blocked`; severity `warn` is logged as `type: lint` and the author decides.

Lexicons per language live in `skills/brain-keeper/references/lint-lexicon.<lang>.json`, loaded by `project/.agentic-seo/project.json.language`. Languages without a lexicon get only language-agnostic checks plus a `warn` listing skipped checks.

### Order

Lexical pass first (cheap, regex), semantic pass second. A `block` in the lexical pass stops execution before the semantic pass.

**Lexical pass:**
1. `editorial.brain.accents` (V8) — block. Lexicon `accents`.
2. `editorial.brain.no-em-dash` (V7) — block in prose.
3. `editorial.brain.no-ai-slop` (V6) — block. Lexicon `ai_slop`.
4. `editorial.brain.no-blog-tutorial-voice` (V5) — block. Lexicon `blog_tutorial`.
5. `editorial.brain.no-promo-adjectives` (V4) — block when no external source on the same paragraph or in adjacent `## Evidência`. Lexicon `promo_adjectives`.

**Semantic pass:**
6. `editorial.brain.no-source-description` (V1) — block in authorial pages; excluded inside `## Evidência` and in `log.md`. Lexicon `source_description`.
7. `editorial.brain.aposto-shape` (V2) — warn when aposto exceeds 12 words or contains enumerative list; block above 20 words. Heuristic: first proper-noun aposto per section.
8. `editorial.brain.tecnologia-descritivo` (V3) — block in `technology.md` only. Lexicon `tecnologia_editorial_verbs`.

### Standing rules

- Pre-fill check: any file in `brain/` that still contains `<!-- REGRA:`, `<preencher>`, `gap`, `TODO`, `[?]`, `<YYYY-MM-DD>`, "a confirmar", "a definir" blocks with `status: blocked` and the message "template não foi preenchido".
- Every wikilink `[[...]]` resolves to a file in `brain/` or to a real anchor in an existing brain page.
- `cluster.table.no-gap` (block): tables in `brain/topic-clusters/<slug>.md` cannot contain empty cells or placeholders. Status must be in `publicado | planejado | a-revisar | descontinuado`; ação must be in `manter | revisar | criar | avaliar`. Planned content appears as `_slug-italico_` (italic without link) — markdown links to non-existing conteúdo files are blocked.
- `editorial.brain.cluster-cross-ref` (block): every slug in `clusters:[]` of any `content/**/*.md` must exist as folder under `project/clusters/<slug>/`. Each subpage `brain/topic-clusters/<slug>.md` must correspond to a folder under `project/clusters/<slug>/`. Bidirectional consistency is owned by `cluster-sync` per `docs/specs/topic-clusters-contract.md`. Per-cluster materialized tables live between `<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->` and `<!-- END cluster-content-table:auto -->` sentinels; the index between `<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->` and `<!-- END cluster-index-table:auto -->`. Manual edits inside sentinels are silently overwritten by sync.
- No two log entries share the same `## YYYY-MM-DD - <título>` heading.
- Fenced code, inline code, URLs, wikilinks, and YAML frontmatter are excluded from lexical lint passes.

### Commands — `cluster-sync`, `cluster-doctor`, `cluster-rename`, `cluster-retire`

The Topic Clusters subsystem is governed by `docs/specs/topic-clusters-contract.md` (contract_version 2, plugin 0.3). Read that document first before editing cluster artifacts.

- `node scripts/cluster-sync.mjs [--cluster=<slug>] [--check] [--dry-run]` — recomputes the materialized table between sentinels in each `brain/topic-clusters/<slug>.md` and the index, from the union of (a) `clusters:[]` in each `content/**/*.md` frontmatter, (b) `pillar` and `planned_satellites[]` in `cluster.yaml`, and (c) `satellite_overrides`. Idempotent. Preserves authorial prose. Conflicts surface as lints (`content.cluster-missing`, `cluster.unique-pilar`, `cluster.pilar.divergence`, etc.). `--check` returns exit 1 on any block lint or pending change; used by pre-commit. Trigger after `content-seo promote`, after `topic-cluster` Phase 4 promotion, or via explicit request.
- `node scripts/cluster-doctor.mjs` — read-only diagnostic. Prints lints without writing.
- `node scripts/cluster-rename.mjs --from=<old> --to=<new>` — atomic rename across YAML + frontmatters + brain.
- `node scripts/cluster-retire.mjs --slug=<X> [--reassign-to=<Y>]` — remove cluster preserving contents.
- `node scripts/install-cluster-sync-hook.mjs --apply` — installs pre-commit hook that runs `cluster-sync --check`.

The Web Companion also fires `cluster-sync --cluster=<affected>` server-side after `POST /api/project/file` saves any `content/<origin>/<slug>.md` or `clusters/<slug>/cluster.yaml`.

### Failure record

For each violation, append a single entry to `project/brain/log.md`:

```
## YYYY-MM-DD - lint editorial em <file>

- type: lint
- scope: <file>
- decision: bloqueio editorial — <check id>
- evidence: linha <N>, trecho: "<excerto de até 80 caracteres>"
- approver: agent
- notes: sugestão de correção — <texto>
```

Multiple violations in the same file in the same run group under one entry with a list in `notes`.

### Message to the user when blocked

Be factual and propositive. Cite line, ID, excerpt, suggestion, and an active exit. Avoid "erro", "inválido", "rejeitado".

```
Bloqueei a alteração em brain/identity.md por 2 violações editoriais antes de aprovar:

1. Linha 14 — "a home afirma que a marca é referência…" — descrição de fonte interna (editorial.brain.no-source-description).
   Sugestão: "A marca opera consultoria de SEO para empresas brasileiras." Mover o link da home para ## Evidência.
2. Linha 22 — "líder consagrado em IA" — adjetivo promocional sem fonte externa (editorial.brain.no-promo-adjectives).
   Sugestão: cortar "líder consagrado" ou citar ranking público de instituto nominal em ## Evidência.

Registrei em log.md como type: lint. Posso aplicar a correção sugerida agora — confirma?
```

## Output Format

Concise completion note. For multi-file changes, write a YAML summary to `project/workbench/brain-keeper/<slug>.yaml`:

```yaml
status: complete | blocked
request_type: ingestion | approval | decision | publication | lint | proof
log_entries_added: []
files_touched:
  brain: []
  sources: []
  content: []
  workbench: []
lint:
  passed: true | false
  ran_at: <ISO timestamp>
  blockers: []
  warnings: []
next_action: ""
```

## Done Criteria

- Sources captured untouched in `sources/`; no existing source modified.
- Authorial brain pages changed only with matching `type: decision` log entries and evidence references.
- All wikilinks resolve to real files or anchors in `brain/`.
- `editorial.brain.*` lint ran on every changed authorial page or `content/` file; `lint.passed == true`, `lint.blockers == []`. Any `block` failure stops the run with `status: blocked` and forbids declaring `complete`.
- `warn` findings (V2 aposto between 12 and 20 palavras) registradas em `log.md` como `type: lint` e mantidas como dívida visível.
- Log entries appended with the right `type:` and complete fields.
- Active language accents preserved (pt-BR by default).
- Contradictions and gaps surfaced as `type: lint` entries when found.
- No file in `brain/` still contains `<!-- REGRA:`, `<preencher>`, `gap`, `TODO`, `[?]`, `<YYYY-MM-DD>`, "a confirmar", or "a definir".
