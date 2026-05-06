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
- Public articles/posts must come from `content-seo` output. If no approved content artifact exists, stop at the content gate and run or request `seo-analysis` plus `content-seo`; do not write the article body directly in the website workflow.
- Do not substitute missing public content with a final stub, placeholder article, or noindex page as if the request were complete.
- If the site shell is created before content is approved, leave the dependent post out of the public build or mark it as blocked in the active `spec-driven` plan; do not present it as delivered.
- Include metadata, sitemap, robots, canonical rules, and schema foundation.
- Use project Wiki and tone of voice.
- Keep design practical, polished, and aligned to the project's domain.

## Done Criteria

- Site builds locally.
- Default page types exist.
- Public article pages consume an approved `content-seo` draft, or the site generation clearly stops before the dependent page with the missing content gate named.
- Any site shell generated before content approval records the dependency in `project/workbench/specs/<slug>/plan.md` when `spec-driven` is active.
- Technical SEO baseline can be audited.
