---
name: content-seo
description: Create, brief, rewrite, review, or optimize public SEO content such as articles, blog posts, landing-page copy, editorial pages, and content intended to rank in organic search. Requires an seo-analysis report as precondition.
---

# Content SEO

Use this skill when the user asks to create a briefing, outline, article, post, blogpost, landing page copy, editorial page, or content improvement plan.

Read first when needed:

- `skills/seo-analysis/SKILL.md`
- `skills/_shared/references/operating-model.md`
- `project/wiki/tom-de-voz/index.md`

## Contract

Inputs:

- topic (becomes the slug of the produced page);
- keyword used to locate the seo-analysis report (defaults to the topic);
- `--brief-approval auto|handoff|manual` (explicit preferred; CLI default is `auto` for noninteractive compatibility);
- optional `--skip-data --skip-data-confirmed` with `--skip-data-reason` only after the current user explicitly approves skipping SEO analysis.

Writes only:

- `project/wiki/conteudos/<topic-slug>.md`
- `project/workbench/content/<topic-slug>.brief.json`
- `project/artifacts/`

## Public Content Gate
Any public article, post, blogpost, editorial page, or ranking-oriented content must enter through this skill. Do not write public article bodies directly in another workflow. If another skill needs that content, it consumes the approved draft or stops at this gate.

## Hard Precondition

`workbench/seo-analysis/<keyword-slug>.json` must exist before a brief or draft is generated. If absent, refuse and tell the user the exact `seo-analysis` command to run. The only legal bypass is `--skip-data --skip-data-confirmed --skip-data-reason "<motivo>"`, and it is legal only when the current user explicitly approved skipping SEO analysis.

Existing briefings do not waive this gate. A prior brief with `data_provenance.seo_analysis.path = null` is not a valid briefing for writing unless the current run records a confirmed bypass.

## Required Flow

Every run follows this order:

1. Analysis: locate or require `seo-analysis` for the keyword.
2. Briefing: create `project/workbench/content/<topic-slug>.brief.json` from the analysis, including the outline the writer must follow.
3. Approval: use `--brief-approval auto` only when the user explicitly accepts auto-approval; otherwise use `handoff` or `manual`.
4. Writing: write `project/wiki/conteudos/<topic-slug>.md` only after the brief has `approval.status = approved`.

Process integrity: follow the full flow by default. A narrow request like "create content" does not waive analysis, approval, outline, tone, publication checks, or source separation. Existing drafts/briefs are not proof that gates ran; check provenance. Skip a step only when the current user explicitly requests that specific bypass, name the skipped step and consequence before approval, record it in `process_bypass`, and never present skipped SERP/competitor analysis as SEO-backed.

## Required Behavior

- Read the seo-analysis report and use its `intent`, `top_results`, `gaps` and `improvement_hypotheses` to anchor the brief and generate the outline.
- Always read `project/wiki/tom-de-voz/index.md` before writing and pass its path/status/title into `voice_context`. If it is not approved, record that status instead of treating it as approved strategic context.
- Run the approved brief through the project tom-de-voz before drafting.
- Do not write the draft when the brief is pending or marked `needs-rewrite`.
- Do not imply that a skipped SERP/competitor analysis was performed. If `--skip-data` is used, disclose it before approval and record it in `process_bypass`.
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
- `brief = {intent, reader_need, must_include, must_avoid, outline}`
- `voice_check = {audience, tense_perspective, link_test}`
- `voice_context = {path, status, title}`
- `approval = {mode, status, approved_by, decided_at, notes}`
- `process_bypass` when any required step is explicitly skipped; otherwise `null`
- `must_not_mention_in_prose` (list of strings; populated dynamically with the unique domains from `top_results[].domain` of the linked seo-analysis; empty list when no domains are available)
- `draft_status` in `{briefing, approved-for-writing, needs-rewrite, draft}`

`must_avoid` always includes generic patterns: "URL ou slug interno em prosa", "voz de Wiki em texto público", "anchor text genérico tipo clique aqui", "menção em prosa a domínio que aparece no top_results da análise SEO", "referência a fonte externa fora de backlink Markdown".

## Done Criteria

- Brief exists with valid `data_provenance.seo_analysis.path` (or a recorded skip reason).
- Brief records `approval` and `voice_context`.
- Brief includes an `outline` derived from the SEO analysis.
- Any skipped SEO analysis is explicitly confirmed in `process_bypass`; otherwise no skip-data brief is valid.
- Brief carries `must_not_mention_in_prose` derived from the seo-analysis report.
- Draft is written only when the briefing is approved.
- Draft passes the link-removed test: no `\B/[a-z0-9-]+/(?:[a-z0-9-]+/)*` match in body prose outside code blocks.
- Draft contains zero substring matches of any item in `must_not_mention_in_prose`. This is verified by `wiki-lint`.
- Anchor text is descriptive, not generic.
- Tone follows the project tom-de-voz.
- Claims cite evidence or are marked as assumptions; external citations use Markdown backlinks.
