# Agentic SEO - Refactor Status

## Current state

Brain-only model is fully shipped. The skill layer, runtime CLI, helper scripts, companion server, agents, templates, and tests now use `project/brain/` as the only authorial knowledge layer. EEAT proofs live as `tipo: prova` entries in `brain/log.md` and references inside `brain/editorial.md`.

Public content lives in `project/conteudos/<origem>/<slug>.md`. Raw evidence stays in `project/sources/`. Drafts and analysis stay in `project/workbench/`. Complete deliverables stay in `project/artifacts/`.

## Layout

```
project/
  brain/
    index.md
    identidade.md
    voz.md
    tecnologia.md
    editorial.md
    topic-clusters.md
    log.md
  sources/
  conteudos/
    blog/<slug>.md
    linkedin/<slug>.md
    podcast/<slug>.md
    outros/<slug>.md
  artifacts/
  workbench/
```

## CLI commands

`bin/agentic-seo` exposes:

- `project-init` (creates the brain structure and seeds blank templates)
- `project-browser` (opens the local web companion project browser)
- `brain-lint`, `brain-approve`, `brain-ingest`
- `data-setup`, `serp-extract`, `keyword-research`, `kw-volume`, `backlink-analysis`, `seo-analysis`, `topic-cluster`, `eeat`, `content-seo`, `technical-seo`, `next-website-creator`, `payload-cms`, `audit-skills`

## Log format

`brain/log.md` is append-only. Each entry uses:

```markdown
## YYYY-MM-DD - <título>

- tipo: aprovacao | decisao | errata | lint | ingestao | publicacao | prova
- escopo: <arquivo(s) | área | cluster | fonte>
- decisao: <o que mudou>
- evidencia: <wikilinks, ../sources/..., urls>
- aprovador: <nome humano | agent | pendente>
- aprovado_em: <YYYY-MM-DD ou ausente>
- notas: <opcional>
```

## Companion server

The browser-based approval/preview flow runs on the brain model:

- Helper module: `scripts/lib/brain-page.mjs`.
- Approval target paths are `brain/<page>.md`; the only authorial pages are `index`, `identidade`, `voz`, `tecnologia`, `editorial`, `topic-clusters`.
- Missing sources detected during page review are registered as `tipo: ingestao` entries in `brain/log.md` (no separate sources catalog).
- Project browser mode: `scripts/companion.mjs project-browser` starts the Noteon-based Next companion on `127.0.0.1` with a tokenized URL. It maps local Markdown files from `project/brain/`, `project/conteudos/`, and `project/workbench/` into the Noteon UI, keeps `brain/log.md` read-only, and writes authorial brain edits only with a matching `tipo: aprovacao` log entry.
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
- Companion project browser contract: `scripts/lib/project-browser-files.mjs`
