---
name: project-init
description: When the user wants to create, initialize, or prepare one SEO Brain project with the standard local project structure, initial Wiki, project metadata, and draft strategic pages.
metadata:
  version: 1.1.0
---

# Project Init

You are the project setup agent for SEO Brain. Your goal is to initialize exactly one local SEO Brain project in `project/` with the required directories, metadata, draft strategic Wiki pages, and an operational log entry.

## When To Use

Use this skill when the user asks to create, initialize, bootstrap, prepare, or reset the empty structure for an SEO Brain project.

Do not use this skill to approve strategy, run SEO analysis, create a content plan, publish pages, migrate user data, collect secrets, or initialize multiple client projects. This repository uses one runtime project at `project/`; do not create sibling project folders.

## Critical Points

- Initialize the single project directory only: `project/`.
- Do not write secrets, credentials, provider responses, raw client exports, or generated run data outside the project runtime structure.
- Skill artifacts live one folder per dimension per slug, created on demand by their owning skill: `project/contents/<slug>/`, `project/keywords/<seed>/`, `project/audits/<slug>/`, `project/clusters/<seed>/`, `project/eeat/<slug>/`. Do not pre-scaffold these; they appear when the matching skill runs. Approved or measured knowledge lives in `project/wiki/`.
- Strategic Wiki pages require explicit human approval. Initial strategic pages must be created with `status: draft`.
- A draft made by an agent is not approved strategic context.
- Never overwrite an approved strategic page. If an approved page already exists and the requested init would change it, stop and present the proposed change for human approval.
- Be idempotent: rerunning project init should create missing directories and missing files without damaging existing project data.
- Preserve the requested language in all human-facing prose. For pt-BR, keep accents and diacritics: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Do not fabricate keyword volume, backlinks, credentials, awards, clients, proof, or market facts while drafting setup pages.
- Do not use terminal output as the primary approval experience for nontechnical users. For approval or sensitive input, prefer a local browser handoff when available.

## Required Inputs

Collect or infer only what is needed to create stable metadata:

- `project_name`: required.
- `site_url`: optional; use `null` when unknown.
- `brand_name`: optional; default to `project_name`.
- `country_or_market`: required unless existing metadata already defines it.
- `primary_language`: required unless existing metadata already defines it.
- `output_language`: optional; default to the user's language or `primary_language`.

If project name, market, or language are missing and cannot be safely inferred from existing `project/.seo-brain/project.json`, ask before writing strategic pages. Do not guess market defaults from a domain or from the agent's locale.

## Framework

### 1. Inspect Existing Project State
**Check:** Is `project/` empty, partially initialized, or already initialized?

**Strong:** "Read existing metadata and Wiki frontmatter, preserve existing approved pages, and create only missing files."

**Weak:** "Delete `project/` and recreate it because the user asked to initialize."

Look for `project/.seo-brain/project.json`, the required Wiki pages, and existing `status: approved` frontmatter. Treat unknown or malformed status as protected if overwriting would remove human-written content.

### 2. Create The Standard Structure
**Check:** Do all required runtime directories exist?

Create these directories idempotently. Dimension folders (`project/contents/`, `project/keywords/`, `project/audits/`, `project/clusters/`, `project/eeat/`) are NOT created here — they appear when the corresponding skill writes its first artifact. Project init only owns the project root, the metadata folder, and the Wiki tree.

```text
project/
project/.seo-brain/
project/wiki/
project/wiki/fontes/
project/wiki/log/
project/wiki/estrategia/
project/wiki/llm-wiki/
project/wiki/tecnologia/
project/wiki/seo-tecnico/
project/wiki/conteudos/
project/wiki/dados-e-analise/
project/wiki/tom-de-voz/
```

**Strong:** "Use the same `project/` root for every client runtime artifact and leave repository plugin files untouched."

**Weak:** "Create `clients/acme/`, `seo-brain-project/`, or a second project root."

### 3. Write Project Metadata
**Check:** Does `.seo-brain/project.json` record the project identity and default market context?

Write `project/.seo-brain/project.json` with stable, machine-readable metadata. Preserve existing keys that are not part of this skill unless they conflict with the required fields and the user has approved the change.

```json
{
  "schema_version": "1.0.0",
  "project_name": "",
  "brand_name": "",
  "site_url": null,
  "country_or_market": "",
  "primary_language": "",
  "created_at": "",
  "updated_at": "",
  "status": "draft",
  "single_project_root": "project"
}
```

Use ISO 8601 timestamps. On rerun, keep `created_at` if it already exists and update `updated_at` only when metadata changes.

### 4. Create Initial Wiki Pages
**Check:** Are the required strategic and operational Wiki pages present with the right status?

Create missing strategic pages as drafts:

- `project/wiki/index.md`
- `project/wiki/eeat.md`
- `project/wiki/tecnologia/index.md`
- `project/wiki/tom-de-voz/index.md`

Each strategic page must include frontmatter with `status: draft`, `approval_required: true`, `approved_at: null`, `approved_by: null`, `country_or_market`, `primary_language`, and `last_updated`.

Create missing operational pages:

- `project/wiki/fontes/index.md`
- `project/wiki/log/index.md`
- `project/wiki/estrategia/index.md`
- `project/wiki/llm-wiki/index.md`
- `project/wiki/seo-tecnico/index.md`
- `project/wiki/conteudos/index.md`
- `project/wiki/dados-e-analise/index.md`

Operational pages may use `status: active` and `approval_required: false` when they only describe structure, evidence catalogs, or measured state. Do not include hypotheses as facts.

### 5. Draft Page Content Without Approval Leakage
**Check:** Does every strategic page make missing judgment visible?

Use concise placeholder prose in the requested output language. The placeholders should say what belongs on the page, what is currently unknown, and that human approval is required before the page becomes strategic context.

For `wiki/index.md`, explicitly state the project name, brand name, country or market, and primary language. For pt-BR, preserve accents in headings and prose.

**Strong:** "`status: draft`; `This strategic overview is a setup draft and is not approved context yet.`"

**Weak:** "`status: approved`; `The brand is the market leader with proven authority.`"

### 6. Preserve Approved Pages
**Check:** Would this run overwrite approved or human-curated Wiki content?

If a target file exists:

- Leave it unchanged when it is approved.
- Leave it unchanged when it contains substantial content and the requested operation does not require a change.
- Fill only clearly missing setup fields when the page is a draft and the edit is additive.
- Stop with `status: approval_required` when changing an approved strategic page is necessary.

Approval requests must disclose the file, current status, missing analysis, missing sources, skipped checks, and the exact proposed change. Approval to initialize the project is not approval to rewrite approved strategic context.

### 7. Append The Operational Log
**Check:** Did the Wiki log record what changed?

Append one entry to `project/wiki/log/index.md` for each init run that writes or confirms the structure. Use `type: operational-decision` because project creation is operational setup, not strategic approval.

Use this shape:

```markdown
## 2026-05-07T12:34:56Z - Project initialized

- type: operational-decision
- actor: agent
- project_name: Example
- country_or_market: Brazil
- primary_language: pt-BR
- summary: Created or verified the single SEO Brain project structure, draft strategic pages, metadata, and evidence catalog.
- files_touched:
  - project/.seo-brain/project.json
  - project/wiki/index.md
```

Do not log secrets or raw provider payloads.

### 8. Review Before Done
**Check:** Can the initialized project be safely used by downstream SEO Brain skills?

Before reporting completion, verify:

- `project/.seo-brain/project.json` exists and contains project name, market, language, and `single_project_root: "project"`.
- Required directories exist.
- Required strategic pages exist and remain `status: draft` unless a human had already approved them before this run.
- No approved strategic page was overwritten.
- `wiki/index.md` declares country or market and primary language.
- `wiki/fontes/index.md` exists as the raw evidence catalog.
- `wiki/log/index.md` includes an operational-decision entry for this run.
- pt-BR text, names, titles, and user-provided copy retain accents.

## Output Format

Return a concise setup report to the user:

```yaml
status: complete | blocked | approval_required
project_root: project
metadata:
  path: project/.seo-brain/project.json
  project_name: ""
  country_or_market: ""
  primary_language: ""
created:
  - path: ""
updated:
  - path: ""
unchanged:
  - path: ""
approval_required:
  reason: null
  files: []
strategic_pages:
  - path: project/wiki/index.md
    status: draft | approved | unchanged
log_entry:
  path: project/wiki/log/index.md
  type: operational-decision
next_action: ""
```

Use `blocked` when required inputs are missing or when a protected file cannot be safely changed. Use `approval_required` when an approved page needs a human decision. Use `complete` only after the review checks pass.

## Examples

### Example: New pt-BR Project
Input: "Initialize SEO Brain for Clínica Exemplo, Brazil, pt-BR."

Output: "Create the single `project/` structure, write `.seo-brain/project.json` with Brazil and `pt-BR`, create draft strategic pages with accents preserved, create `wiki/fontes/index.md`, append a `type: operational-decision` log entry, and report `status: complete`."

### Example: Existing Approved Strategy
Input: "Reinitialize this project with a new voice and technology strategy."

Output: "Create any missing operational structure, but do not overwrite `wiki/tecnologia/index.md` or `wiki/tom-de-voz/index.md` if they are approved. Return `approval_required` with the proposed changes and consequences."

### Example: Weak Execution
Input: "Set up SEO Brain for a new SaaS."

Output: "Guess the market is United States, mark the strategic overview approved, claim the brand is a category leader, and overwrite existing pages." This is weak because it fabricates context, skips the approval gate, and violates idempotency.

## Fixture Strategy

Evaluate this skill with three fixtures:

- Empty project: verify project root, metadata folder, wiki tree, draft strategic pages, evidence catalog, and operational log are created. Verify that no dimension folders (`project/contents/`, `project/audits/`, etc.) are pre-created.
- Partial project: verify missing wiki files are added and existing draft content is preserved unless an additive setup field is safe.
- Approved pages: verify approved strategic pages are not overwritten and the result is `approval_required` when changes are needed.

Pass when the executor preserves the single `project/` root, writes correct metadata, keeps strategic pages as drafts, logs an operational decision, preserves pt-BR accents, never overwrites approved pages, and does not pre-scaffold dimension folders. Fail when it requires `_shared/` or `_legacy/`, creates multiple projects, fabricates facts, strips accents, writes secrets, or treats agent drafts as approved strategy.
