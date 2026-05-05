---
name: project-init
description: Create a new SEO Brain project with the standard multi-project folder layout, initial Wiki, and approval-ready strategic pages.
---

# Project Init

Use this skill when the user asks to create, initialize, or prepare a new SEO Brain project.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `skills/_shared/references/wiki-review.md`
- `templates/project/`

## Contract

Inputs:

- project name or slug;
- optional brand/site context;
- optional target market and language.

Writes only:

- `projects/[project-slug]/`
- `projects/[project-slug]/wiki/`
- `projects/[project-slug]/sources/`
- `projects/[project-slug]/reports/`
- `projects/[project-slug]/artifacts/`
- `projects/[project-slug]/.seo-brain/`

## Required Behavior

- Generate a safe kebab-case slug.
- Create all required directories idempotently.
- Create initial Wiki pages from templates.
- Create six-pillar Wiki maps and `wiki/fontes/index.md` as the evidence catalog.
- Mark strategic pages as `status: draft`.
- Append a creation entry to `wiki/log/index.md`.
- Do not write secrets.
- Do not overwrite approved Wiki pages without showing the user what would change.
- Antes de declarar `done`, executar o protocolo em `skills/_shared/references/wiki-review.md` sobre todos os arquivos `wiki/**` criados ou modificados neste run. Não persistir versão revisada sem aprovação humana quando o reviewer propuser mudanças.

## Done Criteria

- Project folder exists.
- Required Wiki pages exist.
- Strategic pages are drafts.
- Log has a project creation entry.
- Review pass concluído: `no-op` registrado no log, ou aprovação humana sobre a versão revisada, ou rejeição explícita registrada.
