---
name: seo-analysis
description: Analyze a keyword SERP using real data, top-result extraction, UX observations, heading/meta comparison, and improvement hypotheses.
---

# SEO Analysis

Use this skill when the user asks to analyze a keyword, compare SERP competitors, understand ranking patterns, or prepare an SEO briefing.

Read first when needed:

- `skills/serp-extract/SKILL.md`
- `skills/backlink-analysis/SKILL.md`
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- keyword;
- project slug;
- location, language, and device when relevant.

Writes only:

- `projects/[project]/sources/serp/`
- `projects/[project]/reports/seo-analysis/`
- `projects/[project]/wiki/conteudos/`

## Required Behavior

- Use real SERP data when available.
- Compare at least the top 3 organic results.
- Extract headings and meta tags deterministically from URLs when possible.
- Include UX and search-intent observations grounded in page evidence.
- Apply skyscraper thinking without blind imitation.
- Record timestamp, provider, language, location, and device.

## Done Criteria

- Analysis separates extracted data, hypotheses, and recommendations.
- Top 3 comparison includes metadata and heading patterns.
- Missing data is explicit, not fabricated.

