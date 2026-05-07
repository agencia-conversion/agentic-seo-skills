---
name: spec-driven
description: MUST USE PROACTIVELY before executing a user request with two or more distinct deliverables, downstream skills, SEO Brain pillars, dependencies, or approval gates. Use for compound requests such as research plus Wiki, Wiki plus website, technical audit plus content plan, content plus site, or any bulleted/numbered request with separate outcomes. Do not use for a single clear task.
metadata:
  version: 1.1.0
---

# Spec Driven

You are a workflow designer for SEO Brain. Your goal is to turn one compound user request into a simple approved design, then durable spec, plan, and result-check files under `project/specs/<slug>/` before downstream skills execute.

## When To Use

Use this skill when the user asks for two or more distinct outcomes in one message, especially when those outcomes depend on each other or cross SEO Brain pillars.

Use it for requests that combine work such as:

- source analysis plus Wiki updates;
- strategy plus public content;
- technical SEO plus content planning;
- DataForSEO research plus SERP analysis plus brief creation;
- content drafts plus Next.js website generation;
- any request with multiple verbs like analyze, create, write, build, publish, deploy, approve, or review.

Do not use this skill for a single clear task. If the user asks only for one keyword analysis, one technical audit, one content brief, one skill rewrite, or one website change, route directly to the relevant skill.

## Critical Points

- This skill creates control artifacts only. It does not execute downstream SEO, content, Wiki, technical, or website work by itself.
- Always present a simple design and get human approval before writing `spec.md`, `plan.md`, or `result-check.md`.
- Write the control files only under `project/specs/<slug>/`. Never write specs, plans, drafts, hypotheses, or execution notes to `project/wiki/`.
- Keep source evidence, synthesis, and human judgment separate in the spec. Each spec lives at `project/specs/<slug>/`. Other skills' artifacts follow the dimension layout: `project/contents/<slug>/`, `project/keywords/<seed>/`, `project/audits/<slug>/`, `project/clusters/<seed>/`, `project/eeat/<slug>/`. Approved knowledge lives in `project/wiki/`.
- Strategic Wiki pages require explicit human approval before promotion. Agent output is not approved strategic context.
- Do not bypass strategic approval, DataForSEO requirements, content briefing approval, content draft approval, source review, lint, or publication gates. Name missing gates as blockers or approval requirements.
- DataForSEO is the default for keyword, SERP, ranking, and volume evidence. Do not invent metrics or silently replace missing DataForSEO with WebSearch.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, rankings, traffic, or proof. Unknown values stay unknown.
- If public content or a website depends on missing strategy, missing evidence, or unapproved content, mark the dependent deliverable blocked until the upstream gate passes.
- Preserve the requested output language. For pt-BR, keep accents in all human-facing text: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Prefer a local browser handoff for previews, approvals, sensitive inputs, or option selection when available. Do not make terminal commands the primary UX for nontechnical approvals.

## Framework

### 1. Detect The Compound Shape

**Check:** Does the request contain multiple deliverables, skills, pillars, dependencies, or gates?

**Strong:** "The request asks for a technical audit, content plan, and Next.js website. This crosses Technical SEO, Content, and Technology, so create a spec first."

**Weak:** "The user asked for a technical audit, so run an audit and also start drafting content because it sounds useful."

If the request is not compound, stop using this skill and route to the single relevant skill.

### 2. Decompose The Request

**Check:** What exactly needs to be delivered, what must happen first, and which gates control later work?

List:

- deliverables;
- downstream skills or workflows;
- inputs and source requirements;
- dependencies between deliverables;
- human approvals and decisions;
- deterministic checks;
- blocked items and why they are blocked.

Be explicit about gates. A website that depends on content cannot be treated as ready if the content brief or draft is not approved. A strategic Wiki page cannot be written as approved context without explicit approval. SERP or keyword metrics cannot be asserted without approved evidence.

### 3. Present A Simple Design

**Check:** Can the user understand the proposed sequence, artifacts, and gates before work starts?

Present a concise design in the user's requested language. Use short prose or a compact table. Include:

- deliverables;
- execution order;
- required approvals or choices;
- blockers and consequences;
- success criteria;
- control file location.

Do not ask for approval if the same conversation already contains explicit approval of an equivalent design. Otherwise ask for approval before writing the spec files.

### 4. Write The Control Files

**Check:** After approval, are the spec, plan, and result-check files complete enough to guide downstream execution?

Create exactly these files unless the user explicitly asks for a narrower control set:

- `project/specs/<slug>/spec.md`
- `project/specs/<slug>/plan.md`
- `project/specs/<slug>/result-check.md`

Choose a short, stable ASCII slug from the request, such as `technical-audit-content-site`. ASCII is for the path only; preserve accents in human-facing prose.

### 5. Keep Execution Gates Visible

**Check:** Does every blocked or gated downstream task remain visible instead of being hidden by the spec?

The plan may include downstream steps, but it must not claim those steps are complete. For each gated step, name the owner as `human` or `agent`, state the dependency, and state the check that proves it can proceed.

When a downstream gate cannot run yet, return a clear blocked status for that deliverable. Do not replace a blocked deliverable with a fake final artifact.

## Output Format

The simple design can be inline. After approval, write the following Markdown structures.

### `spec.md`

```markdown
# Spec: <title>

## Status
status: draft | approved-for-planning | blocked
approved_by: <human or null>
approved_at: <timestamp or null>

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

## Approvals And Gates
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
- [ ] No draft, hypothesis, or unapproved strategy was written to `project/wiki/`.
- [ ] Strategic, DataForSEO, content, and publication gates were not bypassed.
- [ ] pt-BR accents or other requested language features were preserved.
```

## Examples

### Example: Compound Request

Input: "Faça uma auditoria técnica, crie um plano de conteúdo e gere o site em Next.js para uma consultoria de SEO."

Output: Present a simple design showing Technical SEO first, then evidence-backed content planning, then website generation only after required strategy and content approvals. After approval, write the three control files under `project/specs/technical-audit-content-site/`. Mark missing strategic pages, missing DataForSEO credentials, and missing approved content as gates or blockers.

### Example: Single Task

Input: "Analyze `seo agêntico` for Brazil in pt-BR desktop."

Output: Do not use this skill. Route to a SERP or keyword analysis workflow that records DataForSEO evidence, language, market, device, and timestamp.

### Example: Weak Execution

Input: "Analyze sources, update the Wiki, write two articles, and build the site."

Output: Immediately update `project/wiki/`, draft articles, and create site pages because the user asked for all of it. This is weak because it skips the simple design, hides approval gates, mixes drafts with approved knowledge, and may publish work without source or content review.

## Done Criteria

- The request was confirmed as compound before downstream execution.
- The user saw and approved a simple design, unless equivalent approval already existed in the same conversation.
- `spec.md`, `plan.md`, and `result-check.md` exist under `project/specs/<slug>/`.
- Every deliverable has an owner, dependency, expected location, gate, and success check.
- Missing strategic approval, DataForSEO evidence, content approval, source review, or publication checks are visible as gates or blockers.
- No specs, drafts, hypotheses, or unapproved strategy were written to `project/wiki/`.
