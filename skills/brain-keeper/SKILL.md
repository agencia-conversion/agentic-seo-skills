---
name: brain-keeper
description: When the user wants to ingest sources, change brain pages, register decisions, catalog content publications, or lint brain pages for provenance and link integrity.
metadata:
  version: 2.0.0
  category: delivery
---

# Brain Keeper

You are the steward of the Agentic SEO `project/brain/`. The brain is the only authorial knowledge layer of the project: the canonical pages `index`, `identity`, `voice`, `technology`, `topic-clusters`, `review`, `log` plus one subpage per active topic cluster in `topic-clusters/<slug>.md`. `log.md` is the append-only chronicle. Editorial areas (strategic macro layer) live as H2 sections inside `topic-clusters.md` above the auto-generated cluster index — the old standalone `brain/editorial.md` was consolidated there in 2026-05-26. There is no separate `wiki/` layer. The brain is read by every Agentic SEO skill as initial context. The editorial review rules (universal + project-specific) live in `brain/review.md`; this skill references that page instead of duplicating it.

## When To Use

Use this skill when the user asks to ingest a source, change or propose a brain page update, register a decision, catalog a published content, or lint brain pages for provenance, contradictions, broken wikilinks, or gaps.

Do not use this skill to draft strategic content from scratch, run keyword research, build topic clusters, write content, run technical SEO audits, or publish content. Those workflows produce evidence that this skill catalogs through `log.md`.

## Critical Points

Hard rules for every brain-keeper run.

- Every substantive change, proposal, lint, ingestion, or publication registration must leave a Web Companion review target. If an authorial page changed, point to that `project/brain/<page>.md`; if the run only proposes or lints, write a summary under `project/workbench/brain-keeper/<slug>.md` or `.yaml`. Return `companion_path`, `companion_slug`, and `browser_prompt: { recommended: true, message: "Posso abrir o Web Companion para você revisar esta entrega?", artifact_path: "<project-relative path>", open_with: "project-browser" }`. Human approvals that already require a specific handoff (`approve-cluster`, `approve-page`, `review-changes`) keep using that handoff, but the resulting artifact still needs a Companion target.

**Migração de handoffs (status).** Os antigos handoffs HTTP (`scripts/companion.mjs <name>` em `127.0.0.1`) estão sendo movidos para a superfície do Web Companion. `collect-env`, `approve-cluster` e `dataforseo-bypass` migram para o Companion (credenciais em Settings → Credenciais; aprovação/promoção de cluster e bypass nas telas do Companion). `approve-briefing`, `approve-page`, `review-changes` e `pick-cluster` permanecem atrás de uma flag, com plano documentado de migração. O código de handoff NÃO é removido (outros fluxos ainda o referenciam) — apenas deprecado e documentado.

## Boundaries

Allowed writes:
- `project/brain/log.md` — append entries.
- `project/sources/**` — only to capture a newly provided raw source exactly as received.
- `project/workbench/brain-keeper/**` — drafts of proposed changes, lint reports, contradiction notes.
- `project/contents/**` — register a published content with the canonical frontmatter.

Authorial brain pages (`index`, `identity`, `voice`, `technology`, `topic-clusters`, `topic-clusters/<slug>`, `review`) may be written directly when the change is backed by evidence and a `type: decision` entry is appended to `log.md`. For `review.md` specifically: minor stylistic additions (new IA-slop term, new Conversion-explainer verb, recurring typo) are auto-applied with `approver: agent`; checklist changes (new editorial principle, new entry in "Erros comuns observados") are proposed as `type: lint` and wait for human approval before editing the page.

Creating a NEW topic cluster subpage (`brain/topic-clusters/<slug>.md` for a cluster that does not yet exist) requires explicit human approval through the Companion `approve-cluster` handoff. Updating an existing subpage (resync the contents table after `content-seo promote`, refresh the resumo, mark a satellite `retired`) is auto-applied with `approver: agent` and a `type: decision` log entry. An explicit user request always overrides this gate — when the user delegates promotion, record `approver: <user name>`.

Never modify existing files in `project/sources/**`. Never reuse a wikilink that points to a non-existent page. Never fabricate keyword volume, backlinks, credentials, awards, clients, quotes, proof, or decisions.

## Brain-First Protocol

For any request that would change a brain authorial page:

1. Capture any working draft or review note in `project/workbench/brain-keeper/<slug>.md` when useful.
2. Apply the brain page change only with cited evidence or explicit `gap` markers.
3. Append a log entry: `type: decision`, `scope: <brain pages affected>`, `decision: <what changed>`, `evidence: <wikilinks, ../sources/, urls>`, `approver: agent` or a human name.

For operational events (source ingestion, lint result, content publication, correction, technical decision without strategic impact, evidence cataloging), append the log entry directly with `approver: agent` (or the human's name if a human triggered it). The corresponding non-authorial change (sources/, contents/) is applied immediately.

## Regra editorial

The canonical seat of editorial review rules is `brain/review.md`. Read that page before reviewing any prose written into `brain/` or `contents/`. The page carries the universal rules (lead in the first sentence, visible attribution, anti-IA-slop, anti-Conversion-explainer, pt-BR accents) plus project-specific particularities that grow over time.

If `brain/review.md` is missing or carries only placeholders for the project-specific sections, the universal rules embedded in the page template still apply; record `review_backed: false` in the review artifact and surface the limitation. Conflicts between a project-specific item and a universal rule resolve in favor of the universal rule, with a `type: lint` entry flagging the contradiction.

## Wikilinks e Markdown links

Use Obsidian Wikilinks `[[...]]` only for real files inside `project/brain/`. Use Markdown links for `../sources/`, `../contents/`, and external URLs. A Wikilink that resolves to a non-existent file is a hard lint failure (see `Lint mínimo`).

**Fonte autoral vs. fonte interna.** O brain é a voz da própria marca falando de si mesma. Frases como "a home afirma", "o site diz", "o artigo X defende" tratam a marca como objeto narrado e estão proibidas no corpo de qualquer arquivo autoral. A procedência interna vai sempre para a seção `## Evidência` no rodapé da página, com link. Veja `## Lint editorial` abaixo para a regra completa.

**Stack observado vs. tese editorial (regra dura).** `technology.md` contém **APENAS fatos técnicos observados** do site analisado (stack, CMS, framework, headers, JSON-LD, renderização, sinais de performance). NUNCA opinião editorial, posicionamento de mercado, tese de marca ou valores da empresa. Guia observado vs. opinião — observado (entra em `technology`): "Next.js + Vercel, SSR, schema `Article`". Opinião ("a marca defende Next.js", "preferimos sites estáticos", "stack moderna é diferencial"): roteie para `identity`, `topic-clusters` ou conteúdos publicados em `contents/` — NUNCA em `technology.md`.

**Brain Index.** `index.md` é uma porta de entrada autoral: começa em prosa, resume as páginas centrais e aponta para elas. Ao resumir `[[technology]]`, use apenas tecnologia observada do site da marca. Não descreva o Companion, o plugin, tokens locais, rotas internas, testes automatizados ou `cluster-sync` como se fossem a stack do site, exceto quando o projeto analisado for explicitamente o próprio Companion.

**Lexicons.** As listas de termos por idioma vivem em `skills/brain-keeper/references/lint-lexicon.<lang>.json` (`pt-br`, `en`). O idioma ativo vem de `project/.agentic-seo/project.json.language`. Idiomas sem lexicon recebem só checks language-agnostic e um `warn` listando o que foi pulado.

## Schema do log

Append entries with this shape:

```markdown
## YYYY-MM-DD - <título curto>

- type: approval | decision | correction | lint | ingestion | publication | evidence
- scope: <arquivo(s) | área | cluster | fonte>
- decision: <o que mudou ou foi decidido>
- evidence: <wikilinks, ../sources/..., urls>
- approver: <nome humano | agent>
- approved_at: <YYYY-MM-DD opcional para entradas legadas de aprovação>
- notes: <opcional>
```

## Schema de topic-clusters

`brain/topic-clusters.md` is a short index: dashboard `## Painel` with totals and a `## Clusters ativos` table that lists each cluster (wikilink to subpage, area, pillar link, cobertura). It does not contain per-cluster tables of conteúdos.

Each active cluster has its own subpage `brain/topic-clusters/<slug>.md` with frontmatter limited to `title` and `updated`, followed by `# <Nome>`, prose `Resumo`, `## Pilar` (markdown link to the published content or `_slug-italico_` for planned), `## Conteúdos` (Markdown table with columns `Papel | Conteúdo | Intent | Status | Ação | Atualizado`), `## Próximas ações`, `## Evidência`. Published conteúdos appear as markdown links to `../../contents/<origin>/<slug>.md`; planned conteúdos appear as `_slug-italico_` without link. Status is closed (`publicado | planejado | a-revisar | descontinuado`); ação is closed (`manter | revisar | criar | avaliar`).

The cluster operational source of truth is `project/clusters/<slug>/cluster.yaml`. Draft clusters live as `project/clusters/<slug>/draft.yaml` and never touch the brain.

## Schema de conteúdo público

Files in `project/contents/<origin>/<slug>.md` require frontmatter:

```yaml
---
title: "<título>"
slug: "<slug-kebab-case>"
published_at: "<YYYY-MM-DD>"
source_url: "<url canônica>"
origin: "blog | linkedin | podcast | other"
clusters:
  - <slug-em-project/clusters/>
role:                      # opcional; preenche quando o papel for explícito por cluster
  <cluster-slug>: pillar | satellite
---
```

`clusters:` must list one or more slugs that exist as folders in `project/clusters/<slug>/`. Empty array blocks promote. `area:` (singular) is legacy and gradually removed; treat it as a fallback when `clusters:` is missing.

## Conteúdo consumível (no-gap rule)

Hard rule. Brain pages, conteúdos públicos e logs são consumidos por outros agentes (Claude Code, sub-agents Agentic SEO, futuras sessões). Cada arquivo precisa ser auto-suficiente quando lido fora do contexto que o gerou.

**Nunca deixar placeholders, `gap`, `<preencher>`, `TODO`, "a confirmar", "a definir", `[?]`, células vazias de tabela ou estruturas declaradas sem conteúdo.** Se a evidência não está disponível, faça uma das três coisas, nessa ordem:

1. Buscar a evidência (scrape adicional, provider call, leitura de fonte existente) e preencher.
2. Reescrever a seção para descrever o que foi observado e omitir o item que não tem suporte. Não escrever "não foi observado X" como linha solta. Quando o item não cabe, ele simplesmente não entra.
3. Mover o item para `log.md` como `type: decision` explicando a omissão e o critério para reintroduzir o item depois. O arquivo autoral em si fica limpo.

Estruturas obrigatórias do schema brain (`identity`, `voice`, `technology`, `topic-clusters`, `review`, `index`) podem omitir subseções inteiras quando não há base. O que não pode é manter o cabeçalho com `gap` no corpo, célula de tabela vazia, ou linha "Para quem não fala: `gap`".

Aplicar a regra em:
- Brain pages.
- Conteúdos publicados em `contents/`.
- Workbench drafts que vão virar publicação.
- Reports do Web Companion (`relatorios/<module>/<run-slug>/report.md`).

Logs (`log.md`) podem citar lacunas observadas como `type: lint` ou `type: decision`, com critério para reintroduzir.

**Documentos autossuficientes (regra dura).** Todo arquivo escrito em `project/` (páginas do Cérebro, reviews, reports, conteúdos) precisa ser autossuficiente quando lido fora do contexto que o gerou e **NUNCA** pode embutir URLs de runtime — `localhost`, `127.0.0.1` ou rotas do Web Companion (ex.: `.../project/<token>/brain-review`). Essas URLs são efêmeras (token único, porta efêmera, expiram). Cite URLs públicas ou evidência relativa na seção `## Evidência`, nunca uma URL de debug do Companion.

## Lint editorial

Run before declaring done in any change to an authorial brain page (`identity`, `voice`, `technology`, `topic-clusters`, `index`) and to `contents/<origin>/<slug>.md`. Does not run on `log.md`, `sources/`, or `workbench/`. Severity `block` interrupts the run with `status: blocked`; severity `warn` is logged as `type: lint` and the author decides.

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
8. `editorial.brain.technology-descritivo` (V3) — block in `technology.md` only. Lexicon `technology_editorial_verbs`.

### Standing rules

- Pre-fill check: any file in `brain/` that still contains `<!-- REGRA:`, `<preencher>`, `gap`, `TODO`, `[?]`, `<YYYY-MM-DD>`, "a confirmar", "a definir" blocks with `status: blocked` and the message "template não foi preenchido".
- Every wikilink `[[...]]` resolves to a file in `brain/` or to a real anchor in an existing brain page.
- `cluster.table.no-gap` (block): tables in `brain/topic-clusters/<slug>.md` cannot contain empty cells or placeholders. Status must be in `publicado | planejado | a-revisar | descontinuado`; ação must be in `manter | revisar | criar | avaliar`. Planned content appears as `_slug-italico_` (italic without link) — markdown links to non-existing conteúdo files are blocked.
- `editorial.brain.cluster-cross-ref` (block): every slug in `clusters:[]` of any `contents/**/*.md` must exist as folder under `project/clusters/<slug>/`. Each subpage `brain/topic-clusters/<slug>.md` must correspond to a folder under `project/clusters/<slug>/`. Bidirectional consistency is owned by `cluster-sync` per `docs/specs/topic-clusters-contract.md`. Per-cluster materialized tables live between `<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->` and `<!-- END cluster-content-table:auto -->` sentinels; the index between `<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->` and `<!-- END cluster-index-table:auto -->`. Manual edits inside sentinels are silently overwritten by sync.
- No two log entries share the same `## YYYY-MM-DD - <título>` heading.
- Fenced code, inline code, URLs, wikilinks, and YAML frontmatter are excluded from lexical lint passes.

### Commands — `cluster-sync`, `cluster-doctor`, `cluster-rename`, `cluster-retire`

The Topic Clusters subsystem is governed by `docs/specs/topic-clusters-contract.md` (contract_version 1, plugin 0.2). Read that document first before editing cluster artifacts.

- `node scripts/cluster-sync.mjs [--cluster=<slug>] [--check] [--dry-run]` — recomputes the materialized table between sentinels in each `brain/topic-clusters/<slug>.md` and the index, from the union of (a) `clusters:[]` in each `contents/**/*.md` frontmatter, (b) `pillar` and `planned_satellites[]` in `cluster.yaml`, and (c) `satellite_overrides`. Idempotent. Preserves authorial prose. Conflicts surface as lints (`content.cluster-missing`, `cluster.unique-pillar`, `cluster.pillar.divergence`, etc.). `--check` returns exit 1 on any block lint or pending change; used by pre-commit. Trigger after `content-seo promote`, after `topic-cluster` Phase 4 promotion, or via explicit request.
- `node scripts/cluster-doctor.mjs` — read-only diagnostic. Prints lints without writing.
- `node scripts/cluster-rename.mjs --from=<old> --to=<new>` — atomic rename across YAML + frontmatters + brain.
- `node scripts/cluster-retire.mjs --slug=<X> [--reassign-to=<Y>]` — remove cluster preserving contents.
- `node scripts/install-cluster-sync-hook.mjs --apply` — installs pre-commit hook that runs `cluster-sync --check`.

The Web Companion also fires `cluster-sync --cluster=<affected>` server-side after `POST /api/project/file` saves any `contents/<origin>/<slug>.md` or `clusters/<slug>/cluster.yaml`.

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
request_type: ingestion | approval | decision | publication | lint | evidence
log_entries_added: []
files_touched:
  brain: []
  sources: []
  contents: []
  workbench: []
lint:
  passed: true | false
  ran_at: <ISO timestamp>
  blockers: []
  warnings: []
delivery:
  artifact_path: project/brain/<page>.md | project/workbench/brain-keeper/<slug>.md | project/workbench/brain-keeper/<slug>.yaml
  companion_path: ""
  companion_slug: ""
  browser_prompt:
    recommended: true
    message: "Posso abrir o Web Companion para você revisar esta entrega?"
    artifact_path: ""
    open_with: project-browser
next_action: ""
```

## Done Criteria

- Sources captured untouched in `sources/`; no existing source modified.
- Authorial brain pages changed only with matching `type: decision` log entries and evidence references.
- All wikilinks resolve to real files or anchors in `brain/`.
- `editorial.brain.*` lint ran on every changed authorial page or `contents/` file; `lint.passed == true`, `lint.blockers == []`. Any `block` failure stops the run with `status: blocked` and forbids declaring `complete`.
- `warn` findings (V2 aposto between 12 and 20 palavras) registradas em `log.md` como `type: lint` e mantidas como dívida visível.
- Log entries appended with the right `type:` and complete fields.
- Active language accents preserved (pt-BR by default).
- Contradictions and gaps surfaced as `type: lint` entries when found.
- No file in `brain/` still contains `<!-- REGRA:`, `<preencher>`, `gap`, `TODO`, `[?]`, `<YYYY-MM-DD>`, "a confirmar", or "a definir".
- The response points to the changed brain page or workbench summary in the Web Companion and includes `browser_prompt`.
