---
name: backlink-analysis
description: Analyze backlinks and referring domains for URLs or domains using available providers, with clear freshness and confidence notes.
---

# Backlink Analysis

Use this skill when the user asks about backlinks, referring domains, authority comparison, link gaps, or competitor link profiles.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `skills/data-setup/SKILL.md`
- `docs/skill-quality-criteria.md`

## Contract

Inputs:

- URL or domain;
- optional competitor URLs or domains.

Writes only:

- `project/sources/backlinks/`
- `project/reports/backlinks/`

## Required Behavior

- Use the configured provider when available.
- Use DataForSEO Backlinks live endpoint; DataForSEO Backlinks API v3 does not expose the same standard/async retrieval modes as SERP and Keyword Data.
- Identify provider and data freshness.
- Report aggregates, referring domains, top linking domains, and anchors when available.
- Avoid false precision.
- Mark unavailable data explicitly.

## Done Criteria

- Report separates measured data from interpretation.
- Provider and timestamp are recorded.
- Competitor comparison is explicit when requested.
