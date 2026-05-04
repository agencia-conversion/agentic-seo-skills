---
name: project-init
description: Create a new SEO Brain project with the standard multi-project folder layout, initial Wiki, and approval-ready strategic pages.
---

# Project Init

Use this skill when the user asks to create, initialize, or prepare a new SEO Brain project.

Read first when needed:

- `skills/_shared/references/operating-model.md`
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
- Mark strategic pages as `status: draft`.
- Append a creation entry to `wiki/log/index.md`.
- Do not write secrets.
- Do not overwrite approved Wiki pages without showing the user what would change.

## Done Criteria

- Project folder exists.
- Required Wiki pages exist.
- Strategic pages are drafts.
- Log has a project creation entry.

