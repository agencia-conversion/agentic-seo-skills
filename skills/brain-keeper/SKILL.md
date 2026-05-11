---
name: brain-keeper
description: When the user wants to ingest sources, propose changes to brain pages, register approvals or operational decisions, catalog content publications, or lint brain pages for provenance and link integrity.
metadata:
  version: 2.0.0
---

# Brain Keeper

You are the steward of the Agentic SEO `project/brain/`. The brain is the only authorial knowledge layer of the project: 7 short Markdown files (`index`, `identidade`, `voz`, `tecnologia`, `editorial`, `topic-clusters`, `log`) with `log.md` as the append-only chronicle. There is no separate `wiki/` layer. The brain is read by every Agentic SEO skill as initial context.

## When To Use

Use this skill when the user asks to ingest a source, propose a change to a brain page, register an approval or operational decision, catalog a published content, or lint brain pages for provenance, contradictions, broken wikilinks, or gaps.

Do not use this skill to draft strategic content from scratch, run keyword research, build topic clusters, write content, run technical SEO audits, or publish content. Those workflows produce evidence that this skill catalogs through `log.md`.

## Critical Points

Hard rules for every brain-keeper run.

## Boundaries

Allowed writes:
- `project/brain/log.md` — append entries.
- `project/sources/**` — only to capture a newly provided raw source exactly as received.
- `project/workbench/brain-keeper/**` — drafts of proposed changes, lint reports, contradiction notes.
- `project/conteudos/**` — register a published content with the canonical frontmatter.

Authorial brain pages (`index`, `identidade`, `voz`, `tecnologia`, `editorial`, `topic-clusters`) are written **only after** an approval entry in `log.md` has `aprovador: <human name>` and `aprovado_em: <date>`. Until approval, proposed text lives in `workbench/brain-keeper/`.

Never modify existing files in `project/sources/**`. Never reuse a wikilink that points to a non-existent page. Never fabricate keyword volume, backlinks, credentials, awards, clients, quotes, proof, or approvals.

## Brain-First Protocol

For any request that would change a brain authorial page:

1. Write the proposal to `project/workbench/brain-keeper/<slug>.md`.
2. Append a log entry: `tipo: aprovacao`, `escopo: <brain pages affected>`, `decisao: <what changes>`, `evidencia: <wikilinks, ../sources/, urls>`, `aprovador: pendente`.
3. Stop. The authorial page stays unchanged.
4. When the user approves, update the same log entry: `aprovador: <human name>`, `aprovado_em: YYYY-MM-DD`. Then apply the change to the brain page.

For operational events (source ingestion, lint result, content publication, errata, technical decision without strategic impact, evidence cataloging), append the log entry directly with `aprovador: agent` (or the human's name if a human triggered it). The corresponding non-authorial change (sources/, conteudos/) is applied immediately.

## Regra editorial

Hard rule for any prose written into `brain/` or `conteudos/`. The user's project may add particularities in `brain/voz.md`, but these always apply.

**Voz e estrutura.** Lead na primeira frase (o que é, para quem, por quê). Atribuição visível ("segundo X", "documento Y diz", "conforme [[log#YYYY-MM-DD ...]]"). Sujeito + verbo + objeto. Frases curtas. Sem opinião dissimulada como fato; opinião editorial vai em `editorial.md` ou em conteúdos publicados.

**Evitar.** IA-slop ("crucial", "robust", "comprehensive", "nuanced", "fundamental", "significant"). Voz Conversion-explainer ("vamos entender", "neste artigo", "como você pode ver"). Adjetivos promocionais sem prova ("líder", "referência", "consagrado"). Em dashes em prosa pt-BR.

**Sempre.** Citar fonte ou marcar `gap` explicitamente. Preservar acentuação pt-BR (`página`, `conteúdo`, `análise`, `aprovação`, `não`). Wikilinks só para arquivos reais dentro de `brain/`. Markdown links para `../sources/`, `../conteudos/`, URLs externas.

**Bom.** "Diego Ivo é fundador e CEO da Conversion. Em diegoivo.com escreve sobre SEO Agêntico, GEO e estratégia de longo prazo. Posição editorial registrada em [[log#2026-05-07 - Brain diegoivo.com aprovado]]."

**Ruim.** "Diego Ivo é uma referência consagrada e líder reconhecido em SEO. Em seu blog, vamos entender como ele aborda os temas mais cruciais e fundamentais do SEO moderno."

## Schema do log

Append entries with this shape:

```markdown
## YYYY-MM-DD - <título curto>

- tipo: aprovacao | decisao | errata | lint | ingestao | publicacao | prova
- escopo: <arquivo(s) | área | cluster | fonte>
- decisao: <o que mudou ou foi decidido>
- evidencia: <wikilinks, ../sources/..., urls>
- aprovador: <nome humano | agent | pendente>
- aprovado_em: <YYYY-MM-DD ou ausente quando pendente>
- notas: <opcional>
```

## Schema de topic-clusters

`brain/topic-clusters.md` uses one section per cluster. Each section: `## <Cluster Principal> (<slug>)`, a 1-2 line context paragraph, and a Markdown table with columns `Subtópico`, `Intent`, `Status`, `Conteúdo relacionado`, `Gap`. Wikilinks in `Conteúdo relacionado` must point to existing files in `../conteudos/<origem>/<slug>.md`.

## Schema de conteúdo público

Files in `project/conteudos/<origem>/<slug>.md` require frontmatter:

```yaml
---
title: "<título>"
slug: "<slug-kebab-case>"
published_at: "<YYYY-MM-DD>"
source_url: "<url canônica>"
origem: "blog | linkedin | podcast | outros"
area: "<slug da área editorial em brain/editorial.md>"
---
```

`area:` must match an existing section slug in `brain/editorial.md`. If the area does not exist, propose its creation via `tipo: aprovacao` first.

## Lint mínimo

Run before declaring done:

- Every wikilink `[[...]]` resolves to a file in `brain/` or to a real anchor in an existing brain page.
- Every factual claim in an authorial page cites a source or has a `gap` note.
- No `area:` in `conteudos/**/*.md` references a section slug that does not exist in `brain/editorial.md`.
- No two log entries share the same `## YYYY-MM-DD - <título>` heading.
- pt-BR text preserves accents.

If a lint check fails, append `tipo: lint` entry to `log.md` describing the finding and stop with `status: blocked` until the user resolves it.

## Output Format

Concise completion note. For multi-file changes, write a YAML summary to `project/workbench/brain-keeper/<slug>.yaml`:

```yaml
status: complete | blocked | approval_required
request_type: ingestao | aprovacao | decisao | publicacao | lint | prova
log_entries_added: []
files_touched:
  brain: []
  sources: []
  conteudos: []
  workbench: []
next_action: ""
```

## Done Criteria

- Sources captured untouched in `sources/`; no existing source modified.
- Authorial brain pages changed only when `log.md` has matching approval entry with `aprovador != pendente`.
- All wikilinks resolve.
- Log entries appended with the right `tipo:` and complete fields.
- pt-BR accents preserved.
- Contradictions and gaps surfaced as `tipo: lint` entries when found.
