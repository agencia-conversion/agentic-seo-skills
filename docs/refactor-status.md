# SEO Brain - Refactor Status

## Current state

The skill layer, runtime CLI, and tests are aligned with the brain-only model. `project/brain/` (7 short authorial files) is the only authorial knowledge layer. EEAT is no longer a dedicated page; proofs live as `tipo: prova` entries in `brain/log.md` and references inside `brain/editorial.md`.

Public content lives in `project/conteudos/<origem>/<slug>.md` outside the brain. Raw evidence stays in `project/sources/`. Drafts and analysis stay in `project/workbench/`. Complete deliverables stay in `project/artifacts/`.

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

`bin/seo-brain` exposes:

- `project-init` (creates the brain structure and seeds blank templates)
- `brain-lint` (replaces former `wiki-lint`)
- `brain-approve` (replaces former `wiki-approve`)
- `brain-ingest` (replaces former `wiki-ingest`)
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

## Tools

DataForSEO CLI lives in `tools/clis/dataforseo.js`. Other providers (GSC, Ahrefs, Semrush, Similarweb, Keywords Everywhere, AIROPS) remain candidates for future forks from `coreyhaines31/marketingskills`.

## Outstanding migration debt

Companion server UI (browser-based approval/preview flow) still references the legacy wiki paths in three places:

- `scripts/lib/wiki-page.mjs` (helper module, 132 lines).
- `templates/companion/approve-page.html` (fixed UI strings referencing `wiki/fontes/index.md` and old frontmatter keys).
- `tests/test_companion_*` fixtures still seed `project/wiki/` directories.

The `scripts/lib/companion-types/approve-page.mjs` allowlist accepts both `brain/*.md` and the legacy `wiki/*.md` paths during the transition. Migrating these requires renaming the helper module, rewriting the HTML template, and updating fixtures. Track as a follow-up workstream when the companion approval flow is exercised against the new model.

## Pointers

- Skill creation rubric: `skills/seo-skills-creator/references/approval-rubric.md`
- Skill loop script: `scripts/skill-loop.mjs`
- Tools registry: `tools/REGISTRY.md`
- Tool attribution: `tools/ATTRIBUTIONS.md`
- DataForSEO tool test: `tests/tools/test_dataforseo_cli.mjs`
- Brain-keeper protocol: `skills/brain-keeper/SKILL.md`
- Project-init seeding: `skills/project-init/SKILL.md`
