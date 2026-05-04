---
name: content-seo
description: Create SEO content workflows from data-backed analysis to briefing, draft, and Brazilian Portuguese anti-slop review.
---

# Content SEO

Use this skill when the user asks to create a briefing, outline, article, landing page copy, or content improvement plan.

Read first when needed:

- `skills/seo-analysis/SKILL.md`
- `skills/_shared/references/operating-model.md`
- `projects/[project]/wiki/tom-de-voz/index.md`

## Contract

Inputs:

- project slug;
- keyword or topic;
- target page type;
- optional SERP analysis report.

Writes only:

- `projects/[project]/wiki/conteudos/`
- `projects/[project]/reports/content/`
- `projects/[project]/artifacts/`

## Required Behavior

- Run or reuse SEO analysis before writing.
- Create a briefing before drafting.
- Follow Brazilian Portuguese editorial norms.
- Avoid AI slop patterns: excessive bullets, one-line paragraph rhythm, American title case, generic filler, and English-literal metaphors.
- Use the documented tone of voice.
- Separate source-backed claims from hypotheses.

## Done Criteria

- Briefing exists.
- Draft follows tone and editorial rules.
- Claims cite evidence or are marked as assumptions.

