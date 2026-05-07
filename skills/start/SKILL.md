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

- Do not create approved strategic context from a first-run greeting.
- Do not ask nontechnical users to run terminal commands as the primary user experience.
- Do not duplicate a full SEO Brain workflow here. Route to `seo-brain` for classification and `project-init` for project setup.
- Keep raw sources, drafts, artifacts, and approved Wiki state separate once a project exists.
- Preserve the user's language and diacritics. In pt-BR, write accents correctly: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Framework

### 1. Detect Project State

Check whether `project/` already exists and whether it contains `.seo-brain/project.json`, `wiki/`, `sources/`, `workbench/`, or `artifacts/`.

If no project exists, the next meaningful step is `project-init`.

If a project exists, route to `seo-brain` and ask it to classify the user's current SEO request.

### 2. Ask For The Minimum Useful Context

For a new project, collect only the context needed to initialize safely:

- Website or brand name.
- Primary market or country.
- Preferred language.
- Whether the user wants to provide existing sources now.

If the user is nontechnical, offer a local browser handoff for setup and approvals when available. Do not make terminal commands the main handoff.

### 3. Preserve Approval Boundaries

First-run setup may create draft structure and operational logs, but it must not mark strategic pages as approved. Required strategic pages remain draft or approval-required until the user explicitly approves them:

- `project/wiki/index.md`
- `project/wiki/eeat.md`
- `project/wiki/tecnologia/index.md`
- `project/wiki/tom-de-voz/index.md`

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
Approval boundary: <what will not be treated as approved yet>
Next action: <friendly instruction or handoff offer>
```

## Examples

### New User, No Project

Input: "Acabei de instalar o SEO Brain. Por onde começo?"

Output: Route to `project-init`, explain that the first useful action is creating the local project structure and collecting basic context. Ask for website or brand, market, and language. State that strategic pages will be drafts until explicit approval.

### Existing Project, Broad Request

Input: "Quero melhorar SEO do site inteiro."

Output: Route to `seo-brain` because the request spans multiple pillars. Name likely gates such as DataForSEO credentials, approved strategy, source capture, and technical audit.

### Weak Output

Output: "I created a strategy, approved the Wiki, and started keyword research."

This is weak because first-run routing cannot fabricate strategy, approve Wiki context, or skip provider and evidence gates.

