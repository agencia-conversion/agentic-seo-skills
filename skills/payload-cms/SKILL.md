---
name: payload-cms
description: Set up Payload CMS for SEO Brain project with editorial collections, SEO fields, local development, and Vercel deployment guidance.
---

# Payload CMS

Use this skill when a project needs CMS-backed editorial workflows.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `project/wiki/tecnologia/index.md`
- `skills/next-website-creator/SKILL.md`

## Contract

Inputs:

- desired content models;
- deployment target and database choice.

Writes only:

- `project/web/`
- `project/wiki/tecnologia/`
- `project/reports/`

## Required Behavior

- Add blog posts, pages, authors, media, redirects, and SEO fields when applicable.
- Validate required environment variables without printing values.
- Document local setup and Vercel deployment in the technology Wiki.
- Avoid adding CMS complexity when structured files are enough.

## Done Criteria

- CMS setup has clear local and deploy path.
- Content models support SEO workflows.
- Secrets remain out of git.
