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
- player score mode: `--player-score` plus `--target-url <url>` or `--target-domain <domain>`, with optional `--page-type`, `--players-limit`, and `--page-fixtures` for offline tests.

Writes only:

- `project/workbench/seo-analysis/<keyword-slug>.yaml`
- `project/workbench/technical-seo/` when player score mode audits compared URLs.
- `project/sources/serp/*.normalized.yaml` (when DataForSEO is used; raw provider payloads remain `.raw.json`)
- `project/sources/websearch/<slug>.yaml` (only when an explicit WebSearch bypass is approved)

## Provider Selection

- `auto` (default): use DataForSEO when configured; otherwise stop and offer `data-setup`.
- `dataforseo`: force DataForSEO; fail clearly when credentials or `serp-extract` output are absent.
- `websearch`: secondary bypass only. Require `--websearch-confirmed --websearch-reason "<motivo>"` plus written DataForSEO bypass approval (`approved_by`, confirmation text, timestamp, reason, consequence); collect results into `sources/websearch/<slug>.yaml` with shape `{keyword, results: [{title, url, snippet, position, domain}]}`.

## Required Behavior

- Pick the provider via `resolve_seo_provider`; never fall back to WebSearch silently.
- If DataForSEO is bypassed, stop for the DataForSEO bypass Companion or audit-ready chat/CLI confirmation before writing the analysis. Bypass approval is not content approval.
- Compare at least the top 3 organic results when available.
- Extract headings and meta tags deterministically from competitor URLs when feasible.
- Include UX and search-intent observations grounded in page evidence, not in invented adjectives.
- When DataForSEO is the provider, enrich the report with `keyword_metrics` from the latest `keyword-research` report when present.
- When websearch is the provider, leave `keyword_metrics` as `null` and record the explicit bypass reason and written approval metadata.
- Record `provider`, `provider_reason`, `market_context`, `generated_at`, and any `limitations` found during the run.
- Apply skyscraper thinking without blind imitation.

## Player Score Mode

Use `--player-score` when the user wants to know how a specific URL or domain performs for one keyword against ranked URLs in that SERP.

- Require either `--target-url` or `--target-domain`; if the user gives only a domain, discover the ranking URL for that domain from the SERP instead of assuming the homepage.
- For URL targets, compare by normalized URL, ignoring protocol, query, fragment, and trailing slash.
- For domain targets, match the normalized host and subdomains; classify `target_status` as `domain_ranking` when any URL for that domain appears.
- For URL targets, classify `target_status` as `exact_url_ranking`, `same_domain_wrong_url`, or `not_ranking`.
- Include ranked URLs up to `--players-limit` (default 10) and append `target_url` when absent.
- Run `technical-seo` for every compared URL using the same `--page-type` (`unknown` by default).
- Extract `serp_terms` deterministically from titles, snippets, and fetched headings.
- Score out of 100: 70 deterministic points (`serp_visibility` 25, `query_relevance` 15, `term_structure_coverage` 15, `technical_seo` 15) and 30 judgment points (`intent_fit`, `content_quality_and_proof`, `competitive_threat_or_opportunity`, 10 each).
- Every judgment component must include a short rationale and evidence refs; never invent volume, authority, backlinks, clients, credentials, awards, or proof.
- Include `confidence` separately from score, reduced for websearch, incomplete SERP, fetch failures, or missing technical audit.

## Output Schema

The JSON report must include:

- `keyword`
- `provider` in `{dataforseo, websearch}`
- `provider_reason`
- `market_context` with market, country, language, location, provider language, and device
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
- player score mode also includes `target_mode`, `target_domain`, `target_url`, `target_status`, `serp_terms`, `player_scores`, `score_model`, and `technical_seo_reports`.

## Done Criteria

- Report exists at `workbench/seo-analysis/<keyword-slug>.yaml`.
- `provider` is `dataforseo` or `websearch`.
- Analysis separates extracted data, hypotheses, and recommendations.
- Missing data is explicit in `limitations`, not fabricated.
