---
name: content-seo
description: Create SEO content workflows from data-backed analysis to briefing, draft, and Brazilian Portuguese anti-slop review. Requires an seo-analysis report as precondition.
---

# Content SEO

Use this skill when the user asks to create a briefing, outline, article, landing page copy, or content improvement plan.

Read first when needed:

- `skills/seo-analysis/SKILL.md`
- `skills/_shared/references/operating-model.md`
- `project/wiki/tom-de-voz/index.md`

## Contract

Inputs:

- topic (becomes the slug of the produced page);
- keyword used to locate the seo-analysis report (defaults to the topic);
- optional `--skip-data` with `--skip-data-reason` to bypass the precondition for explicitly-justified cases.

Writes only:

- `project/wiki/conteudos/<topic-slug>.md`
- `project/workbench/content/<topic-slug>.brief.json`
- `project/artifacts/`

## Hard Precondition

`workbench/seo-analysis/<keyword-slug>.json` must exist before a brief or draft is generated. If absent, refuse and tell the user the exact `seo-analysis` command to run. The only legal bypass is `--skip-data --skip-data-reason "<motivo>"`, and the reason is recorded in the brief and in the project log.

## Required Behavior

- Read the seo-analysis report and use its `intent`, `top_results`, `gaps` and `improvement_hypotheses` to anchor the brief.
- Run the brief through the project tom-de-voz before drafting.
- Follow Brazilian Portuguese editorial norms.
- Avoid AI slop patterns: excessive bullets, one-line paragraph rhythm, American title case, generic filler, and English-literal metaphors.
- Separate source-backed claims from hypotheses.

## Registro de Publicação

The draft is written for a public blog reader, not for a Wiki user. The rules are inherited from `skills/_shared/references/operating-model.md` and applied to every published artifact:

- Do not expose internal URL paths or slugs in prose. References to other articles use the destination's working title as natural anchor text.
- Anchor text must be informative on its own, not generic ("clique aqui", "saiba mais", "aqui", "no blog da X").
- Every sentence containing a link must remain coherent if the link is removed. This is the "link removed" test.
- Do not mention in prose any domain that appears in `top_results` of the seo-analysis report for the article's primary keyword. The SERP is input for understanding intent; it is never output. This rule is enforced against the analysis report, not against a hardcoded list of domains.
- Cite external sources via Markdown backlinks with anchor text that describes the idea or the work, never the domain.

## Brief Schema

The `<topic-slug>.brief.json` must include:

- `topic`, `topic_slug`, `keyword`, `keyword_slug`, `generated_at`
- `data_provenance.seo_analysis = {path, provider, provider_reason, generated_at}`
- `brief = {intent, reader_need, must_include, must_avoid}`
- `voice_check = {audience, tense_perspective, link_test}`
- `must_not_mention_in_prose` (list of strings; populated dynamically with the unique domains from `top_results[].domain` of the linked seo-analysis; empty list when no domains are available)
- `draft_status`

`must_avoid` always includes generic patterns: "URL ou slug interno em prosa", "voz de Wiki em texto público", "anchor text genérico tipo clique aqui", "menção em prosa a domínio que aparece no top_results da análise SEO", "referência a fonte externa fora de backlink Markdown".

## Done Criteria

- Brief exists with valid `data_provenance.seo_analysis.path` (or a recorded skip reason).
- Brief carries `must_not_mention_in_prose` derived from the seo-analysis report.
- Draft passes the link-removed test: no `\B/[a-z0-9-]+/(?:[a-z0-9-]+/)*` match in body prose outside code blocks.
- Draft contains zero substring matches of any item in `must_not_mention_in_prose`. This is verified by `wiki-lint`.
- Anchor text is descriptive, not generic.
- Tone follows the project tom-de-voz.
- Claims cite evidence or are marked as assumptions; external citations use Markdown backlinks.
