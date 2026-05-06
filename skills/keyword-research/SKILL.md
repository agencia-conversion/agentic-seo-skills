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

- seed keyword/topic;
- language, country, and optional filters.

Writes only:

- `project/sources/keyword-research/`
- `project/workbench/keyword-research/`

## Required Behavior

- Use DataForSEO when configured. Default to `standard` mode (`task_post` + `task_get`), unless the user asks for `live`, `async`, or `offline`.
- Record request parameters and provider.
- Never fabricate volume, CPC, difficulty, or trend data.
- Handle partial provider responses clearly.
- Produce normalized YAML plus a readable summary; raw provider payloads may stay `.raw.json`.

## Done Criteria

- Keyword list has source metadata.
- Missing metrics are marked unavailable.
- Output can feed `topic-cluster`.
