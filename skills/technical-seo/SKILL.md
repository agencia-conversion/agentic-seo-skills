---
name: technical-seo
description: Run deterministic technical SEO audits by page type using typed checks, structured results, and repair guidance.
---

# Technical SEO

Use this skill when the user asks to audit technical SEO, validate a site, check a page template, or enforce SEO requirements.

Read first when needed:

- `docs/skill-quality-criteria.md`
- `projects/[project]/wiki/tecnologia/index.md`

## Contract

Inputs:

- URL, local site path, rendered HTML, or project slug;
- page type when known.

Writes only:

- `projects/[project]/reports/technical-seo/`
- scripts/tests owned by the `technical-seo` implementation.

## Required Behavior

- Use deterministic extraction for title, meta description, canonical, robots, headings, links, images, structured data, indexability, hreflang, and status.
- Support known page types: home, service/product, category, blog index, blog post, author, contact, and legal.
- Return JSON plus a human-readable report.
- Do not use LLM judgment for pass/fail.

## Done Criteria

- Audit has severity levels.
- Each finding has evidence and repair guidance.
- Deterministic checks are reproducible.

