---
name: seo-brain
description: Load SEO Brain's canonical runtime context for user-facing Agentic SEO work. Use at session start, when orienting a project, before choosing another SEO Brain skill, or whenever the user asks what SEO Brain is doing.
---

# SEO Brain

Use this skill as the operational context for SEO Brain. `AGENTS.md` and `CLAUDE.md` guide plugin development; this skill guides user-facing work.

Read when needed:

- `skills/seo-brain/references/runtime-context.md`
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- the user's SEO goal, project state, sources, approvals, credentials status, and requested language;
- optional artifacts under `project/` from prior SEO Brain work.

Writes only through the specific downstream skill being used:

- `project/wiki/` for approved or measured knowledge;
- `project/sources/` for raw evidence;
- `project/workbench/` for drafts, hypotheses, reviews, and reports;
- `project/.env.local` only for standalone sensitive configuration.

## Required Behavior

- Work through the six pillars (seis pilares): Strategy, LLM Wiki, Technology, Technical SEO, Content, and Data and Analysis.
- Keep raw sources, extracted facts, synthesis, and human judgment separate.
- Treat strategic context as unapproved until the user explicitly approves it; this is the aprovação humana gate.
- Use `project/wiki/` as an Obsidian-compatible vault and keep raw evidence in `project/sources/`.
- Keep hypotheses and drafts in `project/workbench/` until promoted by approval or checks.
- Use browser handoff for previews, sensitive input, approvals, and option selection when it improves UX.
- Preserve language fidelity. In pt-BR, write with accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.
- When a required gate cannot run, stop at the gate and give the exact next command or approval handoff.

## Done Criteria

- The selected downstream skill or workflow is named, and missing preconditions are explicit.
- Any bypass is explicitly requested by the user, recorded in the artifact, and marked as not data-backed for the skipped dimension.
- Generated user-facing prose preserves the requested language and diacritics.
- Wiki changes, if any, separate sources from synthesis and keep approval status correct.
