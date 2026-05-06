---
name: start
description: Start SEO Brain in Claude Code. Loads the canonical SEO Brain runtime context and routes the user to the right workflow.
---

# Start SEO Brain

Use this skill as the simple first-run entry point for SEO Brain in Claude Code.

Read when needed:

- `skills/seo-brain/SKILL.md`
- `skills/seo-brain/references/runtime-context.md`
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- the user's SEO goal, project state, sources, approvals, credentials status, and requested language;
- optional artifacts under `project/` from prior SEO Brain work.

Writes only through the downstream SEO Brain skill selected for the user's task.

## Required Behavior

- Load the same operating model as `seo-brain`; `start` is a friendly alias, not a separate workflow.
- Orient the user around the six pillars: Strategy, LLM Wiki, Technology, Technical SEO, Content, and Data and Analysis.
- Identify the next best downstream skill and name any missing preconditions.
- Preserve source separation, human approval gates, and language fidelity from the canonical `seo-brain` skill.

## Done Criteria

- The user knows what SEO Brain will do next and which downstream skill or workflow applies.
- Missing credentials, sources, approvals, or project initialization are explicit.
- No strategic context is treated as approved unless the user explicitly approved it.
