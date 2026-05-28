---
name: seo-skills-creator
description: When the user wants to create, rewrite, evaluate, or improve an Agentic SEO skill. Also use when planning a skill-loop run or converting a formal contract skill into a narrative self-sufficient skill.
metadata:
  version: 1.0.0
  category: meta
---

# SEO Skills Creator

You are a skill designer for Agentic SEO. Your goal is to produce one self-sufficient narrative skill that an agent can execute without reading shared context.

## When To Use

Use this skill for creating or refactoring `skills/<name>/SKILL.md`. Do not use it for provider CLIs or runtime commands; route those to `seo-tools-creator` or the deterministic command plan.

## Critical Points

- One skill teaches one task. Router skills may route, but they must not hide gates.
- Never require `_shared/` or another skill as mandatory execution context.
- Repeat universal Agentic SEO invariants inside the skill that needs them: no fabricated volume/backlinks/proof, source/synthesis separation, decision/check gates, language fidelity.
- Human judgment owns strategy. Agent output is useful only to the extent evidence, limitations, and decisions are logged.
- Generated prose must preserve the requested language, including pt-BR accents such as `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, and `até`.
- Keep drafts and hypotheses outside `project/brain/`; use `project/workbench/` or `project/artifacts/`.
- Every new skill must declare `metadata.category` in the frontmatter. Valid values: `report | delivery | setup | meta | router | contract | alias`. Choose by primary close artifact, not by topic. Categories `report`, `delivery`, `setup` MUST include a literal YAML `browser_prompt:` block in the Output Format section using the canonical consent line for the category. Categories `meta` and `alias` MUST NOT declare own delivery `browser_prompt` (their artifacts live outside `project/` or they delegate). Categories `router` and `contract` may demonstrate the YAML as exemplars for downstream skills.

## Framework

### 0. Choose The Category

**Check:** What artifact does this skill ultimately deliver to the user, and where does it live?

Map by primary close artifact:

| Category | Primary artifact | Frase canônica | Example skills |
|---|---|---|---|
| `report` | `project/analyses/<module>/<run-slug>/report.md` | `Posso abrir o Web Companion para você ver a análise?` | seo-analysis, technical-seo |
| `delivery` | `project/{workbench,artifacts,brain,contents,clusters,keywords,eeat}/...` | `Posso abrir o Web Companion para você revisar esta entrega?` | content-seo, brain-keeper, project-init |
| `setup` | `project/.agentic-seo/project.json` (masked status) | `Posso abrir o Web Companion para você revisar esta entrega?` | data-setup |
| `router` | YAML routing decision (no own artifact) | — (defines pattern) | agentic-seo |
| `contract` | Shared schema for other skills | — (shared) | page-report |
| `meta` | `.context/`, `skills/`, `tools/` | — (no project artifact) | autoresearch, seo-skills-creator |
| `alias` | Delegates to another skill | — (no own delivery) | start |

**Strong:** "Brand voice audit produces `project/audits/<slug>/report.md` and reuses `page-report` → `category: report`."

**Weak:** "It's about brand voice, so it must be `delivery` because brand is editorial." Topic does not decide category; artifact path does.

If a skill could fit two categories (hybrid producing both a report and a brain change), pick the category by primary close artifact and document the secondary in the body.

### 1. Define The Single Task
**Check:** What user request should activate this skill, and what nearby requests should not?
**Strong:** "`keyword-research` prepares keyword evidence and null metric handling; it does not decide the final content calendar."
**Weak:** "`keyword-research` researches keywords, writes content, updates brain, and builds pages."

### 2. Name The Non-Negotiables
**Check:** Which Agentic SEO rules would cause real harm if omitted?
**Strong:** "The skill says WebSearch is secondary and DataForSEO bypass requires a recorded reason and consequence."

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
**Strong:** "The skill includes YAML keys for `status`, `sources`, `synthesis`, `decision`, and `next_action`."
**Weak:** "The skill says to provide a concise report."

### 6. Run The Tri-Agent Loop
**Check:** Did developer, executor, and reviewer see only the context intended for their role?
**Strong:** "Executor receives only `SKILL.md` and `evals/fixture.md`; reviewer grades with the rubric."
**Weak:** "Executor reads old legacy skill bodies or reviewer feedback from earlier iterations."

## Loop Protocol

Use `scripts/skill-loop.mjs init <skill-name>` to create the run package under `.context/skill-evals/<skill>/<run-id>/`.

Roles:

- Developer: writes `skills/<skill>/SKILL.md` from the template, fixture, and prior reviewer feedback.
- Executor: uses only that `SKILL.md` and `skills/<skill>/evals/fixture.md` to produce the real deliverable.
- Reviewer: uses `references/approval-rubric.md` to grade the skill and executor output. The filename is legacy; the role is review, not approval.

Stop rules:

- Score >= 90: keep and finalize.
- Five iterations without 90: escalate to the human with the trace.
- Sub-agent output is evidence, not final decision; the main agent still integrates.

Bootstrap:

- This meta-skill is first judged by the main agent against the seed rubric.
- After bootstrap, all other skill rewrites use the tri-agent loop.

## Output Format

```yaml
skill:
  name: ""
  path: skills/<skill>/SKILL.md
  task: ""
  category: report | delivery | setup | meta | router | contract | alias
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
  close_contract:
    canonical_line: "" # required for report/delivery/setup; empty for meta/router/contract/alias
    yaml_browser_prompt_present: true | false
evaluation:
  fixture: skills/<skill>/evals/fixture.md
  rubric: skills/seo-skills-creator/references/approval-rubric.md
  threshold: 90
status: draft | kept | escalated
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
