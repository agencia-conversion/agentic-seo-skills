# SEO Brain - Refactor Status

## Current state

The skill layer is on the brain-only model: `project/brain/` (7 short authorial files) is the only authorial knowledge layer, and there is no separate `wiki/` layer. EEAT is no longer a dedicated page; proofs live as `tipo: prova` entries in `brain/log.md` and references inside `brain/editorial.md`.

Public content lives in `project/conteudos/<origem>/<slug>.md` outside the brain. Raw evidence stays in `project/sources/`. Drafts and analysis stay in `project/workbench/`. Complete deliverables stay in `project/artifacts/`.

The skill `wiki-maintainer` was renamed to `brain-keeper` and rewritten with the brain-first protocol (mudança em arquivo autoral exige `tipo: aprovacao` em `brain/log.md` com `aprovador != pendente`). All other skills had references to the wiki model updated.

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

## Skills

All skills in `skills/` are aligned with the brain-only model. The `start` skill is a thin alias to `seo-brain`. Templates in `templates/project/` provide blank brain files and content templates.

## Outstanding migration debt

`src/commands/runtime.ts`, `scripts/`, and `tests/` still reference the old wiki model in some places. Concretely:

- CLI commands `wiki-lint`, `wiki-approve`, `wiki-ingest` and helpers in `src/commands/runtime.ts`.
- Helper modules in `scripts/lib/wiki-page.mjs` and a few companion-state files.
- Test fixtures in `tests/test_wiki_review_protocol.mjs`, `tests/test_companion_*`, and others.

These are runtime/CLI parity surfaces that the `bin/seo-brain` binary depends on. Migrating them requires renaming commands, updating output paths, and updating tests. Track this as a separate workstream when the brain-only skill layer has been validated end-to-end.

## Tools

DataForSEO CLI lives in `tools/clis/dataforseo.js`. Other providers (GSC, Ahrefs, Semrush, Similarweb, Keywords Everywhere, AIROPS) remain candidates for future forks from `coreyhaines31/marketingskills`.

## Pointers

- Skill creation rubric: `skills/seo-skills-creator/references/approval-rubric.md`
- Skill loop script: `scripts/skill-loop.mjs`
- Tools registry: `tools/REGISTRY.md`
- Tool attribution: `tools/ATTRIBUTIONS.md`
- DataForSEO tool test: `tests/tools/test_dataforseo_cli.mjs`
