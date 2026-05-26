---
name: spec-driven
description: MUST USE PROACTIVELY before executing a user request with two or more distinct deliverables, downstream skills, Agentic SEO pillars, dependencies, or decision/evidence/check gates. Use for compound requests such as research plus brain updates, technical audit plus content plan, content plus publication review, or any bulleted/numbered request with separate outcomes. Do not use for a single clear task.
metadata:
  version: 1.0.0
---

# Spec Driven

You are a workflow designer for Agentic SEO. Your goal is to turn one compound user request into a simple design, then durable spec, plan, and result-check files under `project/workbench/specs/<slug>/` before downstream skills execute.

## When To Use

Use this skill when the user asks for two or more distinct outcomes in one message, especially when those outcomes depend on each other or cross Agentic SEO pillars.

Use it for requests that combine work such as:

- source analysis plus brain updates;
- strategy plus public content;
- technical SEO plus content planning;
- DataForSEO research plus SERP analysis plus brief creation;
- content drafts plus publication-readiness review;
- any request with multiple verbs like analyze, create, write, build, publish, deploy, approve, or review.

Do not use this skill for a single clear task. If the user asks only for one keyword analysis, one technical audit, one content brief, or one skill rewrite, route directly to the relevant skill. If the user asks only for website creation, CMS setup, deployment, or frontend implementation, state that it is outside the Agentic SEO skill scope.

## Critical Points

- This skill creates control artifacts only. It does not execute downstream SEO, content, brain, or technical audit work by itself.
- Always present a simple design before writing `spec.md`, `plan.md`, or `result-check.md`, then proceed unless the user explicitly asked for review-only planning.
- Write the control files only under `project/workbench/specs/<slug>/`. Never write specs, plans, drafts, hypotheses, or execution notes to `project/brain/`.
- Keep source evidence, synthesis, and human judgment separate in the spec. Raw source files belong under `project/sources/`; working synthesis belongs under `project/workbench/`; completed deliverables belong under `project/artifacts/`.
- Authorial brain pages require a recorded `type: decision` entry in `project/brain/log.md` with evidence and limitations. Agent output is decision support, not fabricated proof.
- Do not bypass strategic decisions, DataForSEO requirements, content checks, source review, lint, or publication gates. Name missing gates as blockers or requirements.
- DataForSEO is the default for keyword, SERP, ranking, and volume evidence. Do not invent metrics or silently replace missing DataForSEO with WebSearch.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, rankings, traffic, or proof. Unknown values stay unknown.
- Website creation, CMS setup, deployment, and frontend implementation are out of scope for Agentic SEO skills. In compound requests, list them as non-goals or blocked external work, and continue only with the SEO deliverables that remain in scope.
- If public content depends on missing strategy, missing evidence, or unchecked content, mark the dependent deliverable blocked until the upstream gate passes.
- Preserve the requested output language. For pt-BR, keep accents in all human-facing text: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Prefer a local browser handoff for previews, decisions, sensitive inputs, or option selection when available. Do not make terminal commands the primary UX for nontechnical decisions.

## Framework

### 1. Detect The Compound Shape

**Check:** Does the request contain multiple deliverables, skills, pillars, dependencies, or gates?

**Strong:** "The request asks for a technical audit, content plan, and website build. Create a spec for the SEO deliverables, mark the build as out of scope, and keep the external implementation separate."

**Weak:** "The user asked for a technical audit, so run an audit and also start drafting content because it sounds useful."

If the request is not compound, stop using this skill and route to the single relevant skill.

### 2. Decompose The Request

**Check:** What exactly needs to be delivered, what must happen first, and which gates control later work?

List:

- deliverables;
- downstream skills or workflows;
- inputs and source requirements;
- dependencies between deliverables;
- human or agent decisions;
- deterministic checks;
- blocked items and why they are blocked.

Be explicit about gates. Public content cannot be treated as ready if the brief or draft has not passed required checks. Website creation, CMS setup, deployment, and frontend code are not downstream Agentic SEO tasks. An authorial brain page cannot be changed without a `type: decision` entry in `brain/log.md` that records evidence, limitations, and actor. SERP or keyword metrics cannot be asserted without source evidence.

### 3. Present A Simple Design

**Check:** Can the user understand the proposed sequence, artifacts, and gates before work starts?

Present a concise design in the user's requested language. Use short prose or a compact table. Include:

- deliverables;
- execution order;
- required decisions or choices;
- blockers and consequences;
- success criteria;
- control file location.

If the same conversation already contains an equivalent design decision, record it. Otherwise write the workbench files after presenting the design unless the user explicitly asks to pause for review.

### 4. Write The Workbench Control Files

**Check:** After the design is presented, are the spec, plan, and result-check files complete enough to guide downstream execution?

Create exactly these files unless the user explicitly asks for a narrower control set:

- `project/workbench/specs/<slug>/spec.md`
- `project/workbench/specs/<slug>/plan.md`
- `project/workbench/specs/<slug>/result-check.md`

Choose a short, stable ASCII slug from the request, such as `technical-audit-content-plan`. ASCII is for the path only; preserve accents in human-facing prose.

### 5. Keep Execution Gates Visible

**Check:** Does every blocked or gated downstream task remain visible instead of being hidden by the spec?

The plan may include downstream steps, but it must not claim those steps are complete. For each gated step, name the owner as `human` or `agent`, state the dependency, and state the check that proves it can proceed.

When a downstream gate cannot run yet, return a clear blocked status for that deliverable. Do not replace a blocked deliverable with a fake final artifact.

## Output Format

The simple design can be inline. Then write the following Markdown structures unless the user explicitly requested review-only planning.

### `spec.md`

```markdown
# Spec: <title>

## Status
status: draft | ready-for-planning | blocked
registrado_por: <human | agent | null>
registrado_em: <timestamp or null>

## Request
<short restatement of the compound request>

## Goal
<what this workflow should accomplish>

## Audience
<who will use the deliverables>

## Scope
- <included item>

## Non-Goals
- <excluded item>

## Deliverables
| Deliverable | Location | Owner | Dependency | Gate |
|---|---|---|---|---|

## Sources And Evidence
| Source Need | Expected Location | Required Before | Status |
|---|---|---|---|

## Decisions And Gates
| Gate | Required For | Owner | Status | Consequence If Missing |
|---|---|---|---|---|

## Risks
- <risk and mitigation>

## Success Criteria
- <measurable or reviewable criterion>
```

### `plan.md`

```markdown
# Plan: <title>

## Ordered Tasks
| Step | Task | Owner | Depends On | Output | Check |
|---:|---|---|---|---|---|

## Blocked Work
| Item | Blocker | Required Resolution |
|---|---|---|
```

### `result-check.md`

```markdown
# Result Check: <title>

## Deliverable Checks
| Deliverable | Expected Evidence | Actual Evidence | Status |
|---|---|---|---|

## Gate Checks
| Gate | Evidence | Status |
|---|---|---|

## Final Review
- [ ] Sources stayed separate from synthesis.
- [ ] No draft, hypothesis, or unevidenced strategy was written to `project/brain/`.
- [ ] Brain decision, DataForSEO, content, and publication gates were not bypassed.
- [ ] pt-BR accents or other requested language features were preserved.
```

## Examples

### Example: Compound Request

Input: "Faça uma auditoria técnica, crie um plano de conteúdo e gere o site para uma consultoria de SEO."

Output: Present a simple design showing Technical SEO first, then evidence-backed content planning. Mark website generation as out of scope for Agentic SEO skills instead of planning implementation. Write the three control files under `project/workbench/specs/technical-audit-content-plan/`. Mark missing strategic pages, missing DataForSEO credentials, and missing checked content as gates or blockers.

### Example: Single Task

Input: "Analyze `seo agêntico` for Brazil in pt-BR desktop."

Output: Do not use this skill. Route to a SERP or keyword analysis workflow that records DataForSEO evidence, language, market, device, and timestamp.

### Example: Weak Execution

Input: "Analyze sources, update the brain, write two articles, and build the site."

Output: Immediately update `project/brain/`, draft articles, and create site pages because the user asked for all of it. This is weak because it skips the simple design, hides decision/check gates, mixes drafts with evidenced knowledge, and may publish work without source or content review.

## Done Criteria

- The request was confirmed as compound before downstream execution.
- The user saw a simple design, or the design decision was recorded from the current request.
- `spec.md`, `plan.md`, and `result-check.md` exist under `project/workbench/specs/<slug>/`.
- Every deliverable has an owner, dependency, expected location, gate, and success check.
- Missing brain decision logs, DataForSEO evidence, content checks, source review, or publication checks are visible as gates or blockers.
- No specs, drafts, hypotheses, or unevidenced strategy were written to `project/brain/`.
