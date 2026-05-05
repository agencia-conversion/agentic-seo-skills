---
name: seo-analysis
description: Analyze a keyword SERP using real data, top-result extraction, UX observations, heading/meta comparison, and improvement hypotheses. Canonical gate before topic-cluster and content-seo.
---

# SEO Analysis

Use this skill when the user asks to analyze a keyword, compare SERP competitors, understand ranking patterns, or prepare a content briefing.

This skill is the canonical precondition for `topic-cluster` and `content-seo`. Without an `seo-analysis` report for a topic, those skills should refuse to run unless an explicit bypass flag is used.

Read first when needed:

- `skills/serp-extract/SKILL.md`
- `skills/backlink-analysis/SKILL.md`
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- keyword;
- provider preference: `dataforseo`, `websearch`, or `auto` (default);
- optional: SERP file override, websearch results file override, location, language, device.

Writes only:

- `project/reports/seo-analysis/<keyword-slug>.json`
- `project/sources/serp/` (when DataForSEO is used)
- `project/sources/websearch/` (when websearch is used; populated by the agent before running)

## Provider Selection

- `auto` (default): use DataForSEO when `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are configured; fall back to websearch otherwise.
- `dataforseo`: force DataForSEO; fail clearly when credentials are absent.
- `websearch`: force websearch fallback. The agent must collect SERP results via the model's WebSearch tool and write them to `sources/websearch/<slug>.json` before running, with shape `{keyword, results: [{title, url, snippet, position}]}`.

## Required Behavior

- Pick the provider via `resolve_seo_provider`.
- Compare at least the top 3 organic results when available.
- Extract headings and meta tags deterministically from competitor URLs when feasible.
- Include UX and search-intent observations grounded in page evidence, not in invented adjectives.
- When DataForSEO is the provider, enrich the report with `keyword_metrics` from the latest `keyword-research` report when present.
- When websearch is the provider, leave `keyword_metrics` as `null` with the reason recorded.
- Record `provider`, `provider_reason`, `generated_at`, and any `limitations` found during the run.
- Apply skyscraper thinking without blind imitation.

## Output Schema

The JSON report must include:

- `keyword`
- `provider` in `{dataforseo, websearch}`
- `provider_reason`
- `keyword_metrics` (object or `null`)
- `top_results` (list; ideally >=5 entries with `position`, `title`, `url`, `snippet`, `domain`)
- `competitors` (top 3 enriched comparison)
- `intent`
- `heading_patterns`
- `gaps`
- `improvement_hypotheses`
- `limitations`
- `incomplete` (boolean)
- `generated_at`

## Done Criteria

- Report exists at `reports/seo-analysis/<keyword-slug>.json`.
- `provider` is `dataforseo` or `websearch`.
- Analysis separates extracted data, hypotheses, and recommendations.
- Missing data is explicit in `limitations`, not fabricated.
