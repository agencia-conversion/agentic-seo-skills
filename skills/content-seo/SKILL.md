---
name: content-seo
description: Create SEO content workflows from data-backed analysis to briefing, draft, and Brazilian Portuguese anti-slop review. Requires an seo-analysis report as precondition.
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
- topic (becomes the slug of the produced page);
- keyword used to locate the seo-analysis report (defaults to the topic);
- optional `--skip-data` with `--skip-data-reason` to bypass the precondition for explicitly-justified cases.

Writes only:

- `projects/[project]/wiki/conteudos/<topic-slug>.md`
- `projects/[project]/reports/content/<topic-slug>.brief.json`
- `projects/[project]/artifacts/`

## Hard Precondition

`reports/seo-analysis/<keyword-slug>.json` must exist before a brief or draft is generated. If absent, refuse and tell the user the exact `seo-analysis` command to run. The only legal bypass is `--skip-data --skip-data-reason "<motivo>"`, and the reason is recorded in the brief and in the project log.

## Required Behavior

- Read the seo-analysis report and use its `intent`, `top_results`, `gaps` and `improvement_hypotheses` to anchor the brief.
- Run the brief through the project tom-de-voz before drafting.
- Follow Brazilian Portuguese editorial norms.
- Avoid AI slop patterns: excessive bullets, one-line paragraph rhythm, American title case, generic filler, and English-literal metaphors.
- Separate source-backed claims from hypotheses.

## Registro de Publicação

The draft is written for a public blog reader, not for a Wiki user. Three rules:

- Do not expose internal URL paths or slugs in prose. References to other articles use the destination's working title as natural anchor text.
- Anchor text must be informative on its own, not generic ("clique aqui", "saiba mais", "aqui").
- Every sentence containing a link must remain coherent if the link is removed. This is the "link removed" test.

## Brief Schema

The `<topic-slug>.brief.json` must include:

- `topic`, `topic_slug`, `keyword`, `keyword_slug`, `generated_at`
- `data_provenance.seo_analysis = {path, provider, provider_reason, generated_at}`
- `brief = {intent, reader_need, must_include, must_avoid}`
- `voice_check = {audience, tense_perspective, link_test}`
- `draft_status`

`must_avoid` always includes: "URL ou slug interno em prosa", "voz de Wiki em texto público", "anchor text genérico tipo clique aqui".

## Done Criteria

- Brief exists with valid `data_provenance.seo_analysis.path` (or a recorded skip reason).
- Draft passes the link-removed test: no `\B/[a-z0-9-]+/(?:[a-z0-9-]+/)*` match in body prose outside code blocks.
- Anchor text is descriptive, not generic.
- Tone follows the project tom-de-voz.
- Claims cite evidence or are marked as assumptions.
