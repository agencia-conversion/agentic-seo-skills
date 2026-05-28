---
name: <kebab-name>
description: When the user wants <specific task>. Also use when they say "<phrase>" or need <trigger>.
metadata:
  version: 1.0.0
  category: <report | delivery | setup | meta | router | contract | alias>
---

# <Human Title>

You are a <role>. Your goal is to <one objective>.

## When To Use

Use this skill for one task. Do not use it for nearby work that belongs to another skill.

## Critical Points

- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.
- Keep raw evidence in `project/sources/`, working drafts in `project/workbench/`, and final deliverables in `project/artifacts/`.
- Authorial brain pages require a `tipo: decisao` entry in `project/brain/log.md` with evidence, limitations, and actor.
- Preserve the requested output language, including pt-BR accents.

## Framework

### 1. Understand The Request
**Check:** What is the user trying to accomplish, and what is outside this skill?
**Strong:** "This is a content brief request, so use `content-seo` and draft only after the brief is ready and limitations are recorded."
**Weak:** "I can also initialize the project, build the site, and publish the article from this skill."

### 2. Gather Evidence
**Check:** Which source files, tool outputs, decision records, or project brain pages are required?
**Strong:** "Use DataForSEO output from `project/sources/serp/`; mark missing volume as unavailable."
**Weak:** "Assume the search volume is high because the keyword looks strategic."

### 3. Produce The Artifact
**Check:** Does the output match the schema and keep sources separate from synthesis?
**Strong:** "Write the brief to `project/workbench/content/<slug>/brief.md` and leave the brain untouched."
**Weak:** "Write a hypothesis directly into `project/brain/` as if it were evidenced."

## Output Format

Pick ONE close block matching `metadata.category` and delete the others. The close contract (canonical line + `browser_prompt`) is required for `report`, `delivery`, and `setup`. Skills in `meta`, `router`, `contract`, or `alias` SHOULD NOT declare a YAML `browser_prompt:` block (their artifacts live outside `project/` or they delegate).

<!-- ===== close block: REPORT (artifact in project/analyses/) ===== -->

```yaml
status: complete | blocked | incomplete
report_md: project/analyses/<module>/<run-slug>/report.md
sources:
  - path: project/sources/...
synthesis:
  summary: ""
browser_prompt:
  recommended: true
  message: "Posso abrir o Web Companion para você ver a análise?"
  open_with: project-browser
next_action: ""
```

<!-- ===== close block: DELIVERY (artifact in project/workbench, artifacts, brain, contents, clusters, keywords, eeat) ===== -->

```yaml
status: complete | blocked | incomplete
artifact_path: project/workbench/<slug>/...
sources:
  - path: project/sources/...
synthesis:
  summary: ""
companion_path: ""
companion_slug: ""
browser_prompt:
  recommended: true
  message: "Posso abrir o Web Companion para você revisar esta entrega?"
  artifact_path: project/workbench/<slug>/...
  open_with: project-browser
next_action: ""
```

<!-- ===== close block: SETUP (masked status; sensitive input via browser handoff) ===== -->

```yaml
status: complete | blocked | failed | skipped
provider: ""
runtime: plugin | standalone_project | unknown
browser_handoff:
  used: true | false
  reason: ""
delivery:
  artifact_path: project/.agentic-seo/project.json
  companion_path: ""
  companion_slug: ""
  browser_prompt:
    recommended: true
    message: "Posso abrir o Web Companion para você revisar esta entrega?"
    artifact_path: project/.agentic-seo/project.json
    open_with: project-browser
next_action: ""
```

<!-- ===== close block: META / ROUTER / CONTRACT / ALIAS (NO own browser_prompt) ===== -->

```yaml
status: complete | blocked | incomplete
synthesis:
  summary: ""
# No browser_prompt: this skill does not own a project/ artifact.
# router/contract may demonstrate browser_prompt as an exemplar for downstream skills inside prose, not in own Output Format.
next_action: ""
```

## Examples

### Example: Data-backed output
Input: "Research `seo agêntico` for Brazil."
Output: "Use `keyword-research` or `seo-analysis`, preserve pt-BR accents, include provider/location/language, and mark unavailable metrics as null."

### Example: Missing gate
Input: "Publish this strategic positioning page."
Output: "Return `blocked`; authorial brain pages require evidence and a logged `tipo: decisao` entry before promotion."

## Related Skills

- `agentic-seo`: route broad or ambiguous Agentic SEO requests.
- `seo-tools-creator`: create deterministic tools, not narrative skills.
