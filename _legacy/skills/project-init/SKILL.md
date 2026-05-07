---
name: project-init
description: Create a new SEO Brain project with the standard single-project folder layout, initial Wiki, and approval-ready strategic pages.
---

# Project Init

Use this skill when the user asks to create, initialize, or prepare a new SEO Brain project.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `skills/_shared/references/wiki-review.md`
- `templates/project/`

## Contract

Inputs:

- project name;
- optional brand/site context;
- optional target market and language.

Writes only:

- `project/`
- `project/wiki/`
- `project/sources/`
- `project/workbench/`
- `project/artifacts/`
- `project/.seo-brain/`

## Required Behavior

- Use the configured single project directory.
- Create all required directories idempotently.
- Create initial Wiki pages from templates.
- Create six-pillar Wiki maps and `wiki/fontes/index.md` as the evidence catalog.
- Write country/market/language explicitly in `wiki/index.md` and `.seo-brain/project.json`; downstream SERP, keyword, and content skills must use this context by default.
- Mark strategic pages as `status: draft`.
- Append a creation entry to `wiki/log/index.md`.
- Do not write secrets.
- Do not overwrite approved Wiki pages without showing the user what would change.
- Antes de declarar `done`, executar o protocolo em `skills/_shared/references/wiki-review.md` sobre todos os arquivos `wiki/**` criados ou modificados neste run. Não persistir versão revisada sem aprovação humana quando o reviewer propuser mudanças.

## Done Criteria

- Project folder exists.
- Required Wiki pages exist.
- Strategic pages are drafts.
- `wiki/index.md` declares the country/market and primary language.
- Log has a project creation entry.
- Review pass concluído: `no-op` registrado no log, ou aprovação humana sobre a versão revisada, ou rejeição explícita registrada.
