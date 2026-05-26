# EN Rename Map — pt-BR → EN domain vocabulary

**Status:** spec in flight. PR 1 (infra) lands without renames; PR 2 lands the schema rename and bumps `contract_version` to 2; PR 3 migrates the Belo Horizonte brain and cleans pt-BR aliases.

## Policy

Agentic SEO is English-first per `AGENTS.md`. The plugin's domain vocabulary — filenames, YAML keys, enum values, folder names — is English. Project content (prose inside brain pages, content articles, log entries) follows `project/.agentic-seo/project.json.language` (`en` by default; `pt-BR` is the official second language).

This document is the single source of truth for the rename. Implementers (skills, scripts, Companion, templates) reference this map and never reinvent translations.

## Versioning

- `contract_version: 1` — current state. Keys and values in pt-BR (`nome`, `tese`, `papel: pilar`, `tipo: decisao`).
- `contract_version: 2` — target state. Keys and values in EN (`name`, `thesis`, `role: pillar`, `type: decision`).
- Readers (cluster-sync, brain-keeper lint, Companion) accept both during the transition. Writers emit v2 only after PR 2 ships.

## Brain page filenames

`project/brain/` and `templates/project/brain/`:

| pt-BR | EN |
|---|---|
| `identidade.md` | `identity.md` |
| `voz.md` | `voice.md` |
| `tecnologia.md` | `technology.md` |
| `editorial.md` | `editorial.md` (cognate) |
| `topic-clusters.md` | `topic-clusters.md` (already EN) |
| `revisao.md` | `review.md` |
| `produtos.md` | `products.md` |
| `index.md` | `index.md` (cognate) |
| `log.md` | `log.md` (cognate) |

Subfolders under `brain/` (the per-parent subpage trees) follow the same rename. Example: `brain/identidade/` → `brain/identity/`; `brain/voz/` → `brain/voice/`; `brain/tecnologia/` → `brain/technology/`; `brain/produtos/` → `brain/products/`. `editorial/` and `topic-clusters/` keep their names.

The `_subpage-template.md` filename inside each subfolder does not change.

## Project folders

| pt-BR | EN |
|---|---|
| `project/conteudos/` | `project/content/` |
| `project/conteudos/blog/` | `project/content/blog/` |
| `project/conteudos/linkedin/` | `project/content/linkedin/` |
| `project/conteudos/podcast/` | `project/content/podcast/` |
| `project/conteudos/outros/` | `project/content/other/` |

These folders keep their existing English names: `project/clusters/`, `project/sources/`, `project/workbench/`, `project/artifacts/`, `project/analyses/`, `project/audits/`, `project/eeat/`, `project/keywords/`.

## `cluster.yaml` keys and enum values

Top-level keys:

| pt-BR | EN |
|---|---|
| `nome:` | `name:` |
| `tese:` | `thesis:` |
| `pilar:` | `pillar:` |
| `planned_satellites:` | `planned_satellites:` (already EN) |
| `satelite_overrides:` | `satellite_overrides:` |
| `stats.publicados:` | `stats.published:` |
| `stats.planejados:` | `stats.planned:` |
| `provenance.*` | unchanged (already EN) |

Enum values inside `planned_satellites[].papel` and content frontmatter:

| pt-BR | EN |
|---|---|
| `papel: pilar` | `role: pillar` |
| `papel: satelite` | `role: satellite` |

Note: the field name `papel:` becomes `role:` everywhere it appears.

## Content frontmatter (`project/content/<origin>/<slug>.md`)

| pt-BR | EN |
|---|---|
| `origem: blog \| linkedin \| podcast \| outros` | `origin: blog \| linkedin \| podcast \| other` |
| `papel: { <cluster>: pilar \| satelite }` | `role: { <cluster>: pillar \| satellite }` |
| `clusters: [<slug>, ...]` | unchanged |
| `published_at`, `source_url`, `slug`, `title` | unchanged |

## `log.md` fields

Entry block keys:

| pt-BR | EN |
|---|---|
| `tipo:` | `type:` |
| `escopo:` | `scope:` |
| `decisao:` | `decision:` |
| `evidencia:` | `evidence:` |
| `aprovador:` | `approver:` |
| `aprovado_em:` | `approved_at:` |
| `notas:` | `notes:` |

## `log.md` `type:` enum

| pt-BR | EN |
|---|---|
| `aprovacao` | `approval` (legacy compatibility only) |
| `decisao` | `decision` |
| `errata` | `erratum` |
| `lint` | `lint` (cognate) |
| `ingestao` | `ingestion` |
| `publicacao` | `publication` |
| `prova` | `proof` |

## `topic-cluster` skill phase names

Operational labels — neither filenames nor schema keys. Updated as prose in `skills/topic-cluster/SKILL.md`.

| pt-BR | EN |
|---|---|
| `Pesquisar` | `Research` |
| `Curar` | `Curate` |
| `Estruturar` | `Structure` |
| `Promover` | `Promote` |

## Template artifacts

| pt-BR | EN |
|---|---|
| `templates/project/clusters/planejamento.md.template` | `templates/project/clusters/planning.md.template` |
| `cluster.yaml.template` (filename) | unchanged |
| `draft.yaml` (filename) | unchanged |

## Brain prose terms (labels inside scripts/reports)

Translation table for labels that scripts/reports emit (not filenames or schema keys). Reports use `reportText(locale, pt, en)` to pick.

| pt-BR | EN |
|---|---|
| `Resumo` | `Summary` |
| `Evidência` | `Evidence` |
| `Próximas ações` | `Next actions` |
| `Painel` | `Dashboard` |
| `Clusters ativos` | `Active clusters` |
| `Conteúdos` | `Content` |
| `Pilar` | `Pillar` |
| `Satélite` | `Satellite` |
| `Papel \| Conteúdo \| Intent \| Status \| Ação \| Atualizado` | `Role \| Content \| Intent \| Status \| Action \| Updated` |

## Inverse glossary (EN → pt-BR)

Quick reverse lookup for readers translating from EN-canonical specs back to existing pt-BR projects.

- `identity` ← `identidade`
- `voice` ← `voz`
- `technology` ← `tecnologia`
- `review` ← `revisao`
- `products` ← `produtos`
- `content` ← `conteudos`
- `other` ← `outros`
- `name` ← `nome`
- `thesis` ← `tese`
- `pillar` ← `pilar`
- `satellite` ← `satelite`
- `role` ← `papel`
- `published` ← `publicados`
- `planned` ← `planejados`
- `type` ← `tipo`
- `scope` ← `escopo`
- `decision` ← `decisao`
- `evidence` ← `evidencia`
- `approver` ← `aprovador`
- `approved_at` ← `aprovado_em`
- `notes` ← `notas`
- `origin` ← `origem`
- `approval` ← `aprovacao`
- `erratum` ← `errata`
- `ingestion` ← `ingestao`
- `publication` ← `publicacao`
- `proof` ← `prova`
- `planning` ← `planejamento`
- `Research` ← `Pesquisar`
- `Curate` ← `Curar`
- `Structure` ← `Estruturar`
- `Promote` ← `Promover`

## Out of scope of this rename

- Skill slugs (`brain-keeper`, `topic-cluster`, `seo-analysis`, etc.). Already EN.
- Provider/tool names (`dataforseo`, `webfetch`, `playwright`).
- File extensions, format identifiers (`.yaml`, `.md`, `kebab-case`).
- Authorial prose content in pt-BR projects — only the structural identifiers change; the natural-language content stays in the project's chosen language.
- Wikilink targets inside published content articles when those targets are in pt-BR for a pt-BR project — the brain migration (PR 3) handles the wikilinks programmatically.

## Migration strategy

PR 1 — Infrastructure
- `shared/locale.mjs` defaults to `en`.
- `scripts/lib/markdown-report.mjs` defaults to EN strings.
- Companion compat layer reads pt-BR and EN identifiers.
- 3 SKILL.md files have their pt-BR prose translated to EN (without changing schema docs).

PR 2 — Schema rename
- `cluster.yaml` keys/enums migrate to EN (v2); reader-compat keeps v1 working.
- Templates become EN-canonical with `.pt-BR.md` siblings.
- All SKILL.md schema docs reflect EN.

PR 3 — Brain migration
- One-off rename of `project/brain/`, `project/clusters/`, `project/content/`.
- Wikilinks rewritten.
- Compat layer removed.
- Docs (`AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/specs/*`) updated to EN-canonical vocabulary.
