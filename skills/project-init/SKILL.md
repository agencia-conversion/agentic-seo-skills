---
name: project-init
description: When the user wants to create, initialize, or prepare one Agentic SEO project with the standard local project structure, blank brain templates, content directories, and initial log entry.
metadata:
  version: 2.0.0
---

# Project Init

You are the project setup agent for Agentic SEO. Your goal is to initialize exactly one local project in `project/` with the required directories, blank brain templates, content scaffolding, project metadata, and a first log entry. The user fills brain content manually.

## When To Use

Use this skill when the user asks to create, initialize, bootstrap, prepare, or reset the empty structure for an Agentic SEO project.

Do not use this skill to write strategic content, draft brand identity, run SEO analysis, create content plans, publish pages, migrate user data, collect secrets, or initialize multiple client projects. This repository uses one runtime project at `project/`.

## Critical Points

- Initialize the single project directory only: `project/`. Do not create sibling project folders.
- Do not write secrets, credentials, provider responses, or raw client exports.
- Brain content (`brain/index.md`, `brain/identidade.md`, `brain/voz.md`, `brain/tecnologia.md`, `brain/editorial.md`, `brain/topic-clusters.md`, `brain/revisao.md`) is created from blank templates with placeholders. `brain/revisao.md` ships with the universal editorial review rules already populated; project-specific sections (Princípios, Checklist, Erros comuns) carry placeholders for the user to fill. Do not generate strategic prose.
- Be idempotent: rerunning project init creates missing directories and missing files without overwriting existing content.
- For pt-BR projects, preserve accents in any prose generated (placeholders, log notes).
- Do not fabricate brand facts, market data, or technical decisions.

## Required Inputs

Collect or infer only what is needed for stable metadata:

- `name`: required.
- `site_url`: optional; use `null` when unknown.
- `market`: required unless existing metadata already defines it.
- `country`: optional; default to `market` when unknown.
- `language`: required unless existing metadata already defines it. Use `pt-BR` or `en` when the project needs fully translated UI/report copy in v1.

If these are missing and cannot be safely inferred from `project/.agentic-seo/project.json`, ask before writing.

## Framework

### 1. Inspect Existing Project State

Read `project/.agentic-seo/project.json` and the existing brain files. Treat any non-empty file with content beyond placeholders as user-written and protected.

### 2. Create The Standard Structure

Create these directories idempotently:

```text
project/
project/.agentic-seo/
project/sources/
project/workbench/
project/artifacts/
project/audits/
project/keywords/
project/clusters/
project/eeat/
project/analises/
project/analises/technical-seo/
project/analises/internal-links/
project/analises/seo-analysis/
project/analises/keyword-research/
project/analises/serp-extract/
project/analises/backlink-analysis/
project/analises/topic-cluster/
project/analises/eeat/
project/brain/
project/brain/topic-clusters/
project/conteudos/
project/conteudos/blog/
project/conteudos/linkedin/
project/conteudos/podcast/
project/conteudos/outros/
```

### 3. Write Project Metadata

Write `project/.agentic-seo/project.json` with stable, machine-readable metadata. Preserve `created_at` on rerun; update `updated_at` only when metadata changes.

```json
{
  "schema_version": "2.0.0",
  "name": "",
  "site_url": null,
  "market": "",
  "country": "",
  "language": "pt-BR",
  "created_at": "",
  "updated_at": "",
  "single_project_root": "project"
}
```

### 4. Create Brain Files from Blank Templates

For each of `brain/index.md`, `brain/identidade.md`, `brain/voz.md`, `brain/tecnologia.md`, `brain/editorial.md`, `brain/topic-clusters.md`, `brain/revisao.md`, `brain/log.md`:

- If the file does not exist, copy from `templates/project/brain/<file>.md`. Replace `<Nome do projeto>` and `<YYYY-MM-DD>` in frontmatter with the project name and the current date. Leave all other placeholders for the user.
- If the file exists with substantive content, leave untouched.

### 5. Create Content Templates

For each of `conteudos/blog/_template.md`, `conteudos/linkedin/_template.md`, `conteudos/podcast/_template.md`, `conteudos/outros/_template.md`:

- If missing, copy from `templates/project/conteudos/<origem>/_template.md`.
- If present, leave untouched.

### 6. Append First Log Entry

Append to `brain/log.md` exactly one entry per init run that creates or completes structure:

```markdown
## YYYY-MM-DD - Project initialized

- tipo: decisao
- escopo: project/
- decisao: Estrutura inicial criada (brain/, sources/, conteudos/, artifacts/, workbench/, audits/, keywords/, clusters/, eeat/, analises/) com templates em branco para preenchimento humano.
- evidencia: project/.agentic-seo/project.json
- aprovador: agent
- notas: <name>, <market>, <language>.
```

Do not append duplicate entries on idempotent reruns that did not change anything.

### 7. Review Before Done

Before reporting completion, verify:

- `project/.agentic-seo/project.json` exists with project name, market, canonical `language`, `single_project_root: "project"`, `schema_version: "2.0.0"`. `pt-BR` and `en` are the fully translated UI/report languages in v1; other project language values require future UI/report copy or fall back during report rendering.
- All required directories exist.
- The 8 brain files exist with frontmatter populated (title and updated only); placeholders untouched if user has not filled them. `brain/revisao.md` carries the universal editorial review rules populated by the template.
- `brain/log.md` contains an init entry for this run if any structural change happened.
- pt-BR text preserves accents.
- No `wiki/`, `judgment_level`, `pillar`, `approved_by`, `approved_at`, or status field anywhere.

## Output Format

```yaml
status: complete | blocked
project_root: project
metadata:
  path: project/.agentic-seo/project.json
  name: ""
  market: ""
  country: ""
  language: "pt-BR"
created:
  - path: ""
unchanged:
  - path: ""
log_entry:
  appended: true | false
  title: ""
next_action: ""
```

Use `blocked` when required inputs (`name`, `market`, `language`) are missing and cannot be inferred.

## Examples

### New pt-BR project

Input: "Initialize Agentic SEO for Clínica Exemplo, Brasil, pt-BR."

Output: "Create `project/` structure, write `.agentic-seo/project.json` with Brasil and `pt-BR`, copy 8 blank brain templates (revisao.md ships with universal editorial review rules pre-populated) and 4 content templates preserving pt-BR accents, append `tipo: decisao` log entry, return `status: complete`."

### Idempotent rerun

Input: "Reinitialize this project."

Output: "Create only missing directories and files. Do not overwrite brain files that the user has filled. Do not append a log entry if nothing changed. Return `status: complete` with `unchanged` listing existing files."

## Done Criteria

- Single `project/` root, no siblings.
- 8 brain files created from blank templates if missing; existing user content preserved.
- 4 content directories with `_template.md` each.
- `project/.agentic-seo/project.json` records identity and market.
- Init log entry appended only when structural change occurred.
- pt-BR accents preserved in placeholders and log.
- Zero references to `wiki/`, `judgment_level`, `pillar`, status enums.
