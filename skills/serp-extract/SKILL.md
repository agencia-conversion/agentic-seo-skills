---
name: serp-extract
description: Extract and normalize real SERP data with provider metadata, raw response storage, organic results, and SERP features.
---

# SERP Extract

Use this skill when the user asks for SERP extraction, search result snapshots, competitor URLs, or SERP feature analysis.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `skills/data-setup/SKILL.md`

## Contract

Inputs:

- keyword;
- location, language, device, and depth.

Writes only:

- `project/sources/serp/`
- `project/reports/serp/`

## Required Behavior

- Store raw provider response.
- Default to `standard` mode (`task_post` + `task_get`), unless the user asks for `live`, `async`, or `offline`.
- Normalize organic results and SERP features into stable JSON.
- Record timestamp, provider, location, language, and device.
- Deduplicate URLs.
- Do not infer rankings from stale or missing data.

## Done Criteria

- Raw and normalized outputs exist.
- Metadata is complete.
- Output can feed `seo-analysis`.
