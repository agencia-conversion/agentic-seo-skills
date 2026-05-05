---
name: keyword-research
description: Use DataForSEO or available providers to research keywords, volumes, intent, long-tail opportunities, and clustering inputs.
---

# Keyword Research

Use this skill when the user asks for keyword research, keyword expansion, volume, difficulty, CPC, or long-tail opportunities.

Read first when needed:

- `skills/data-setup/SKILL.md`
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- seed keyword/topic via `--keyword "X"`;
- bulk lookup via `--keywords-file <path>` (one keyword per line, `#` comments ignored) or positional keywords;
- suggestions mode via `--suggestions` (returns related keywords with their volumes);
- optional `--limit N` for suggestions (default 100, max 1000);
- language, country, and optional DataForSEO mode (`--mode live|standard|async|offline`).

Writes only:

- `project/sources/keyword-research/`
- `project/workbench/keyword-research/`

## Required Behavior

- Use DataForSEO when configured. Default to `standard` mode (`task_post` + `task_get`), unless the user asks for `live`, `async`, or `offline`.
- Single-keyword volume calls write to `<stamp>-<slug>.json`. Bulk volume calls write to `<stamp>-bulk-<count>.json`. Suggestions write to `<stamp>-<slug>.suggestions.json`.
- Bulk mode sends one DataForSEO request with the full keyword list (Google Ads `search_volume` accepts up to 1000 keywords per call). Do not batch sequentially.
- Suggestions mode hits DataForSEO Labs `/v3/dataforseo_labs/google/keyword_suggestions/live` and returns each related keyword with `keyword_info.search_volume`, `keyword_info.competition`, `keyword_info.cpc`, and (when available) `keyword_difficulty` and `search_intent_info`.
- Record request parameters and provider.
- Never fabricate volume, CPC, difficulty, or trend data.
- Handle partial provider responses clearly.
- Produce normalized JSON plus a readable summary.

## Companion Command

`kw-volume` is a thin wrapper around the bulk volume path. It accepts `--keyword "X"`, `--keywords-file <path>`, or positional keywords and prints a lean JSON `{ provider, mode, items: [{ keyword, volume, cpc, competition }] }` to stdout without persisting files. Use it for quick lookups; use `keyword-research` when you need an audit trail.

## Done Criteria

- Keyword list has source metadata.
- Missing metrics are marked unavailable.
- Output can feed `topic-cluster`.
