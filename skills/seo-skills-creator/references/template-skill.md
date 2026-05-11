---
name: <kebab-name>
description: When the user wants <specific task>. Also use when they say "<phrase>" or need <trigger>.
metadata:
  version: 1.0.0
---

# <Human Title>

You are a <role>. Your goal is to <one objective>.

## When To Use

Use this skill for one task. Do not use it for nearby work that belongs to another skill.

## Critical Points

- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.
- Keep raw evidence in `project/sources/`, working drafts in `project/workbench/`, and final deliverables in `project/artifacts/`.
- Authorial brain pages require an approved `tipo: aprovacao` entry in `project/brain/log.md`.
- Preserve the requested output language, including pt-BR accents.

## Framework

### 1. Understand The Request
**Check:** What is the user trying to accomplish, and what is outside this skill?
**Strong:** "This is a content brief request, so use `content-seo` and stop before drafting until approved."
**Weak:** "I can also initialize the project, build the site, and publish the article from this skill."

### 2. Gather Evidence
**Check:** Which source files, tool outputs, approvals, or project brain pages are required?
**Strong:** "Use DataForSEO output from `project/sources/serp/`; mark missing volume as unavailable."
**Weak:** "Assume the search volume is high because the keyword looks strategic."

### 3. Produce The Artifact
**Check:** Does the output match the schema and keep sources separate from synthesis?
**Strong:** "Write the brief to `project/workbench/content/<slug>/brief.md` and leave the brain untouched."
**Weak:** "Write a hypothesis directly into `project/brain/` as if it were approved."

## Output Format

```yaml
status: complete | blocked | approval_required
artifact:
  path: project/workbench/...
sources:
  - path: project/sources/...
synthesis:
  summary: ""
open_questions: []
next_action: ""
```

## Examples

### Example: Data-backed output
Input: "Research `seo agêntico` for Brazil."
Output: "Use `keyword-research` or `seo-analysis`, preserve pt-BR accents, include provider/location/language, and mark unavailable metrics as null."

### Example: Missing gate
Input: "Publish this strategic positioning page."
Output: "Return `approval_required`; authorial brain pages require an approved `tipo: aprovacao` entry in `project/brain/log.md` before promotion."

## Related Skills

- `agentic-seo`: route broad or ambiguous Agentic SEO requests.
- `seo-tools-creator`: create deterministic tools, not narrative skills.
