---
name: eeat
description: Build and maintain the project's EEAT documentation with evidence, gaps, external proof, author/entity signals, and approval gates.
---

# EEAT

Use this skill when the user asks about EEAT, brand authority, trust, authors, credentials, proof, citations, or entity reputation.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `projects/[project]/wiki/eeat.md`

## Contract

Inputs:

- project slug;
- brand notes, URLs, documents, credentials, people, clients, awards, or proof sources.

Writes only:

- `projects/[project]/wiki/eeat.md`
- source captures under `projects/[project]/sources/`
- EEAT reports under `projects/[project]/reports/`

## Required Behavior

- Never invent clients, credentials, awards, media mentions, or experience.
- Mark unverified claims as gaps.
- Search or inspect existing sources when asked to validate proof.
- Separate brand facts, external evidence, recommendations, and human judgment.
- Keep `wiki/eeat.md` as `draft` or `needs-review` until explicit approval.

## Done Criteria

- EEAT page has evidence inventory and gap list.
- All strong claims are sourced or marked unverified.
- Approval status is correct.

