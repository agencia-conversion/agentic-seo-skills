---
description: Decompose a compound request (multiple deliverables, skills, pillars, or decision/check gates) into spec + plan + result-check before any downstream skill runs.
argument-hint: "[optional extra context — leave empty to use the previous user message]"
---

Invoke the `spec-driven` skill on the user's most recent compound request.

Request to decompose:

$ARGUMENTS

If `$ARGUMENTS` is empty, use the previous user message in the conversation as the request.

Follow the `spec-driven` skill contract exactly:

1. Decompose the request into deliverables, source inputs, downstream skills, dependencies, decision gates, and deterministic checks.
2. Present a **simple design** (entregáveis, ordem, decisões, critérios de sucesso, arquivos de controle).
3. Write `project/workbench/specs/<slug>/spec.md`, `plan.md`, and `result-check.md` unless the user explicitly requested review-only planning.
4. Never write into `project/brain/` from this command.
5. Name every downstream gate with its consequence.

Preserve pt-BR diacritics in all human-facing prose.
