---
name: technical-seo
description: Run deterministic technical SEO audits by page type using typed checks, structured results, and repair guidance.
---

# Technical SEO

Use this skill when the user asks to audit technical SEO, validate a site, check a page template, or enforce SEO requirements.

Read first when needed:

- `docs/skill-quality-criteria.md`
- `project/wiki/tecnologia/index.md`

## Contract

Inputs:

- URL, local site path, rendered HTML, or;
- page type when known: `home`, `ecommerce_product`, `service_product`, `blog`, `about` plus Portuguese aliases (`inicial`, `produto-ecommerce`, `produto-ou-servico`, `quem-somos`).

Writes only:

- `project/workbench/technical-seo/`
- scripts/tests owned by the `technical-seo` implementation.

## Required Behavior

- Use deterministic extraction for title, meta description, canonical, robots, headings, links, images, structured data, indexability, hreflang, Open Graph/Twitter metadata, language, viewport, status, and crawlable word count.
- Support the required page types: home, ecommerce_product, service_product, blog, about.
- Return JSON plus a human-readable Markdown report.
- Produce a deterministic 0-100 score from weighted checks. LLMs may use `llm_improvement_context` to prioritize improvements, but never to decide pass/fail.
- Do not use LLM judgment for pass/fail.

## Fixture Strategy

- Keep one passing fixture per supported page type.
- Keep at least one invalid fixture that fails hard checks.
- Tests must assert page-type alias normalization, score ranges, structured findings, and LLM improvement context.

## Done Criteria

- Audit has severity levels.
- Each finding has evidence and repair guidance.
- Deterministic checks are reproducible.
- Score changes only when extracted facts or explicit weights change.
