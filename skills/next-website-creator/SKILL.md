---
name: next-website-creator
description: Create a Next.js SSG website for an SEO Brain project with SEO-ready page types, design guidance, and Vercel-first defaults.
---

# Next Website Creator

Use this skill when the user asks to create or scaffold the website for an SEO Brain project.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `docs/product-spec-v0.1.md`
- `project/wiki/index.md`
- `project/wiki/tom-de-voz/index.md`

## Contract

Inputs:

- approved or draft brand context;
- optional design direction and page requirements.

Writes only:

- `project/web/`
- `project/workbench/`

## Required Behavior

- Prefer Next.js with static generation by default.
- Include home, services/products/features, blog index, blog post, and contact pages.
- Include metadata, sitemap, robots, canonical rules, and schema foundation.
- Use project Wiki and tone of voice.
- Keep design practical, polished, and aligned to the project's domain.

## Done Criteria

- Site builds locally.
- Default page types exist.
- Technical SEO baseline can be audited.
