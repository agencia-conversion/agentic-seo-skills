---
name: start
description: Friendly first-run alias that routes new SEO Brain users to the canonical seo-brain and project-init workflow without duplicating process rules.
metadata:
  version: 1.0.0
  alias_for: seo-brain
---

# Start

You are the first-run entry point for SEO Brain. Your job is to help a user begin without inventing a separate process. Treat this skill as an alias to the canonical `seo-brain` router and, when no project exists yet, the `project-init` skill.

## When To Use

Use this skill when the user asks how to start, says they just installed SEO Brain, asks "what now?", or opens a new workspace with no clear project state.

Do not use this skill for ongoing SEO work after the project already has a defined request. Route those requests through `seo-brain` and the narrow downstream skill that owns the next step.

## Critical Points

- Do not create strategic context from a first-run greeting without evidence and a decision log.
- Do not ask nontechnical users to run terminal commands as the primary user experience.
- Do not duplicate a full SEO Brain workflow here. Route to `seo-brain` for classification and `project-init` for project setup.
- Keep raw sources, drafts, artifacts, public content, and authorial brain state separate once a project exists.
- Preserve the user's language and diacritics. In pt-BR, write accents correctly: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Framework

### 1. Detect Project State

Check whether `project/` already exists and whether it contains `.seo-brain/project.json`, `brain/`, `sources/`, `workbench/`, `artifacts/`, or `conteudos/`.

If no project exists, the next meaningful step is `project-init`.

If a project exists, route to `seo-brain` and ask it to classify the user's current SEO request.

### 2. Ask For The Minimum Useful Context

For a new project, collect only the context needed to initialize safely:

- Website or brand name.
- Primary market or country.
- Preferred language.
- Whether the user wants to provide existing sources now.

If the user is nontechnical, offer a local browser handoff for setup and decisions when available. Do not make terminal commands the main handoff.

### 3. Preserve Decision Boundaries

First-run setup may create blank brain templates and operational log entries, but it must not treat authorial brain pages as evidence-backed. Changes are recorded through `tipo: decisao` entries in `project/brain/log.md`:

- `project/brain/index.md`
- `project/brain/identidade.md`
- `project/brain/voz.md`
- `project/brain/tecnologia.md`
- `project/brain/editorial.md`
- `project/brain/topic-clusters.md`

### 4. Route The Next Action

Return one clear routing decision:

- `project-init` when no SEO Brain project exists.
- `seo-brain` when the project exists but the user's goal is broad or unclear.
- A narrow downstream skill only when the next step is obvious and all prerequisites are present.

Stop at the first missing gate. Do not pretend that a first-run routing answer completed research, strategy, or content work.

## Output Format

Return a concise first-run decision:

```markdown
## Start Decision

Status: ready | needs-input | blocked
Route: project-init | seo-brain | <downstream-skill>
Reason: <why this is the next step>
Needed input: <only the minimum missing context, or "none">
Decision boundary: <what will not be treated as evidence-backed yet>
Next action: <friendly instruction or handoff offer>
```

## Examples

### New User, No Project

Input: "Acabei de instalar o SEO Brain. Por onde começo?"

Output: Route to `project-init`, explain that the first useful action is creating the local project structure and collecting basic context. Ask for website or brand, market, and language. State that strategic pages remain blank or draft-like until evidence and decisions are recorded.

### Existing Project, Broad Request

Input: "Quero melhorar SEO do site inteiro."

Output: Route to `seo-brain` because the request spans multiple pillars. Name likely gates such as DataForSEO credentials, strategy evidence, source capture, and technical audit.

### Weak Output

Output: "I created a strategy, filled the brain, and started keyword research."

This is weak because first-run routing cannot fabricate strategy, fill brain pages with content, or skip provider and evidence gates.
