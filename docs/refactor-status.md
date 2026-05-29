# Agentic SEO - Refactor Status

## Current state

Brain-only model is fully shipped. The skill layer, runtime CLI, helper scripts, companion server, agents, templates, and tests no longer reference the legacy wiki model. `project/brain/` (7 short authorial files) is the only authorial knowledge layer; EEAT proofs live as `tipo: proof` entries in `brain/log.md` and references inside `brain/editorial.md`.

Public content lives in `project/contents/<origem>/<slug>.md`. Raw evidence stays in `project/sources/`. Drafts and analysis stay in `project/workbench/`. Complete deliverables stay in `project/artifacts/`.

## Layout

```
project/
  brain/
    index.md
    identity.md
    voice.md
    technology.md
    editorial.md
    topic-clusters.md
    log.md
  sources/
  contents/
    blog/<slug>.md
    linkedin/<slug>.md
    podcast/<slug>.md
    other/<slug>.md
  artifacts/
  workbench/
```

## CLI commands

`bin/agentic-seo` exposes:

- `project-init` (creates the brain structure and seeds blank templates)
- `brain-lint`, `brain-approve`, `brain-ingest` (replaced the former `wiki-*` commands)
- `data-setup`, `serp-extract`, `keyword-research`, `kw-volume`, `backlink-analysis`, `seo-analysis`, `topic-cluster`, `eeat`, `content-seo`, `technical-seo`, `next-website-creator`, `payload-cms`, `audit-skills`

## Log format

`brain/log.md` is append-only. Each entry uses:

```markdown
## YYYY-MM-DD - <título>

- tipo: approval | decision | erratum | lint | ingestion | publication | proof
- escopo: <arquivo(s) | área | cluster | fonte>
- decisao: <o que mudou>
- evidencia: <wikilinks, ../sources/..., urls>
- aprovador: <nome humano | agent | pendente>
- aprovado_em: <YYYY-MM-DD ou ausente>
- notas: <opcional>
```

## Companion server

The browser-based approval/preview flow runs on the brain model:

- Helper module: `scripts/lib/brain-page.mjs` (renamed from `wiki-page.mjs`).
- Approval target paths are `brain/<page>.md`; the only authorial pages are `index`, `identity`, `voice`, `technology`, `editorial`, `topic-clusters`.
- Missing sources detected during page review are registered as `tipo: ingestion` entries in `brain/log.md` (no separate sources catalog).
- `eeat` engine accepts `--mode brain` or `--mode url`.

## Tools

DataForSEO CLI lives in `tools/clis/dataforseo.js`. Other providers (GSC, Ahrefs, Semrush, Similarweb, Keywords Everywhere, AIROPS) remain candidates for future forks from `coreyhaines31/marketingskills`.

## Pointers

- Skill creation rubric: `skills/seo-skills-creator/references/approval-rubric.md`
- Skill loop script: `scripts/skill-loop.mjs`
- Tools registry: `tools/REGISTRY.md`
- Tool attribution: `tools/ATTRIBUTIONS.md`
- DataForSEO tool test: `tests/tools/test_dataforseo_cli.mjs`
- Brain-keeper protocol: `skills/brain-keeper/SKILL.md`
- Project-init seeding: `skills/project-init/SKILL.md`
- Companion approve-page contract: `scripts/lib/companion-types/approve-page.mjs`
