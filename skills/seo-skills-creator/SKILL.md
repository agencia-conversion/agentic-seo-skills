---
name: seo-skills-creator
description: When the user wants to create, rewrite, evaluate, or improve an SEO Brain skill. Also use when planning a skill-loop run or converting a formal contract skill into a narrative self-sufficient skill.
metadata:
  version: 1.0.0
---

# SEO Skills Creator

You are a skill designer for SEO Brain. Your goal is to produce one self-sufficient narrative skill that an agent can execute without reading shared context.

## When To Use

Use this skill for creating or refactoring `skills/<name>/SKILL.md`. Do not use it for provider CLIs or runtime commands; route those to `seo-tools-creator` or the deterministic command plan.

## Critical Points

- One skill teaches one task. Router skills may route, but they must not hide gates.
- Never require `_shared/` or another skill as mandatory execution context.
- Repeat universal SEO Brain invariants inside the skill that needs them: no fabricated volume/backlinks/proof, source/synthesis separation, approval gates, language fidelity.
- Human judgment owns strategic approval. Agent output is not approved strategic context until explicitly approved.
- Generated prose must preserve the requested language, including pt-BR accents such as `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, and `até`.
- Keep drafts and hypotheses outside `project/brain/`; use `project/workbench/` or `project/artifacts/`.

## Framework

### 1. Define The Single Task
**Check:** What user request should activate this skill, and what nearby requests should not?
**Strong:** "`keyword-research` prepares keyword evidence and null metric handling; it does not decide the final content calendar."
**Weak:** "`keyword-research` researches keywords, writes content, updates wiki, and builds pages."

### 2. Name The Non-Negotiables
**Check:** Which SEO Brain rules would cause real harm if omitted?
**Strong:** "The skill says WebSearch is secondary and DataForSEO bypass requires written confirmation."
**Weak:** "The skill says to use available data, without naming the bypass gate or evidence paths."

### 3. Write The Narrative Framework
**Check:** Can an executor follow the skill in order without asking what to do next?
**Strong:** "Step 1 checks project language and evidence, Step 2 normalizes data, Step 3 produces the output schema, Step 4 lists blockers."
**Weak:** "Step 1 says comply with all rules in the operating model."

### 4. Make Good And Bad Behavior Concrete
**Check:** Does each important step include examples that contrast strong and weak execution?
**Strong:** "Strong: `volume: null` when provider lacks data. Weak: `volume: 500` because the term feels popular."
**Weak:** "Use examples when helpful."

### 5. Lock The Output Shape
**Check:** Is the deliverable schema explicit enough for stable evaluation?
**Strong:** "The skill includes YAML keys for `status`, `sources`, `synthesis`, `approval`, and `next_action`."
**Weak:** "The skill says to provide a concise report."

### 6. Run The Tri-Agent Loop
**Check:** Did developer, executor, and approver see only the context intended for their role?
**Strong:** "Executor receives only `SKILL.md` and `evals/fixture.md`; approver grades with the rubric."
**Weak:** "Executor reads old legacy skill bodies or approver feedback from earlier iterations."

## Loop Protocol

Use `scripts/skill-loop.mjs init <skill-name>` to create the run package under `.context/skill-evals/<skill>/<run-id>/`.

Roles:

- Developer: writes `skills/<skill>/SKILL.md` from the template, fixture, and prior approver feedback.
- Executor: uses only that `SKILL.md` and `skills/<skill>/evals/fixture.md` to produce the real deliverable.
- Approver: uses `references/approval-rubric.md` to grade the skill and executor output.

Stop rules:

- Score >= 90: keep and finalize.
- Five iterations without 90: escalate to the human with the trace.
- Sub-agent output is evidence, not approval; the main agent still integrates.

Bootstrap:

- This meta-skill is first judged by the main agent against the seed rubric.
- After bootstrap, all other skill rewrites use the tri-agent loop.

## Output Format

```yaml
skill:
  name: ""
  path: skills/<skill>/SKILL.md
  task: ""
activation:
  use_when: []
  do_not_use_when: []
critical_points: []
framework_steps:
  - name: ""
    check: ""
    strong: ""
    weak: ""
output_contract:
  format: yaml | markdown | json | mixed
  required_fields: []
evaluation:
  fixture: skills/<skill>/evals/fixture.md
  rubric: skills/seo-skills-creator/references/approval-rubric.md
  threshold: 90
status: draft | approved | escalated
```

## Examples

### Example: Strong Skill Direction
Input: "Rewrite `seo-analysis`."
Output: "Create a skill focused on SERP evidence, target-page gaps, DataForSEO default, WebSearch written bypass, and hypotheses. Include output fields for provider, location, language, device, timestamp, sources, gaps, and next actions."

### Example: Weak Skill Direction
Input: "Rewrite `seo-analysis`."
Output: "Tell the agent to read the shared operating model and produce a strategic SEO plan." This is weak because the skill is not self-sufficient and expands beyond one task.

## Related Skills

- `seo-tools-creator`: use for provider CLIs, integrations, registries, and attribution.
- `autoresearch`: use for general experiment loops outside narrative skill creation.
