---
name: spec-driven
description: Clarify and plan compound SEO Brain requests before execution. Use when a user asks for two or more different deliverables, skills, pillars, or approval-gated workflows in one task, such as sources plus Wiki plus content plus website.
---

# Spec Driven

Use this skill when a request combines multiple outcomes that can drift apart during execution. The goal is lightweight spec-driven development: requirements first, a simple design for approval, then a detailed spec, execution plan, and result check.

Do not use this skill for a single clear task.

Read when needed:

- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- the full user request;
- available project context, constraints, approvals, credentials status, and requested language;
- downstream skills likely needed to finish the work.

Writes only after the user approves the simple design:

- `project/workbench/specs/<slug>/spec.md`
- `project/workbench/specs/<slug>/plan.md`
- `project/workbench/specs/<slug>/result-check.md`

Never write the spec into `project/wiki/`. The Wiki stores approved or measured knowledge, not execution planning.

## Required Behavior

1. Decompose the request into deliverables, source inputs, downstream skills, dependencies, human gates, and deterministic checks.
2. Present a simple design before execution. It must say what will be done, in what order, where artifacts will live, what will prove success, and where the user must approve or choose.
3. Ask for one approval of that simple design unless the current user has already approved an equivalent plan in the same conversation.
4. After approval, create the three workbench files:
   - `spec.md`: goal, audience, scope, non-goals, deliverables, sources, approvals, risks, and success criteria.
   - `plan.md`: ordered tasks, owners as `agent` or `human`, dependencies, expected outputs, and checks.
   - `result-check.md`: checklist mapping each deliverable to evidence that it was completed.
5. Keep the process basic. Do not add extra approval gates beyond the gates already required by downstream skills.
6. If a downstream gate blocks the original request, do not replace the deliverable with a fake final artifact. Either run the required upstream flow, request the explicit bypass, or declare the dependent deliverable blocked.

## Compound Request Triggers

Use `spec-driven` when at least one of these is true:

- two or more deliverables are requested, such as "analyze sources" and "create a website";
- two or more SEO Brain skills are needed, such as `wiki-maintainer` plus `content-seo`;
- two or more pillars are involved, such as Strategy plus Content plus Technology;
- a request contains an approval-gated artifact and a dependent public artifact;
- content and website generation are requested together.

Typical example: "analise fontes, crie Wiki, crie um site e escreva um blogpost."

## Simple Design Format

Use concise prose or a short table with:

- Entregáveis
- Ordem de execução
- Aprovações necessárias
- Critérios de sucesso
- Arquivos de controle

For pt-BR, preserve accents and write naturally: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Done Criteria

- The request was decomposed before execution.
- The user saw the simple design and approved it, or an equivalent approval was already present.
- The workbench spec, plan, and result check exist under `project/workbench/specs/<slug>/`.
- Each downstream gate is named with its consequence.
- No final public content, Wiki strategy page, or website dependency bypass is hidden from the user.
