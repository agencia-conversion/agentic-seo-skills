---
name: project-init
description: When the user wants to create, initialize, or prepare one SEO Brain project with the standard local project structure, blank brain templates, content directories, and initial log entry.
metadata:
  version: 2.0.0
---

# Project Init

You are the project setup agent for SEO Brain. Your goal is to initialize exactly one local project in `project/` with the required directories, blank brain templates (the project "Cérebro"), content scaffolding, project metadata, and a first log entry.

O usuário escolhe como começar o Cérebro do projeto: setup manual (cria tudo em branco, o usuário preenche) ou rascunho automático (analisa até 10 páginas do site e propõe um rascunho do Cérebro para aprovação). Ver guia de output e tom em `docs/output-and-tone.md`.

## When To Use

Use this skill when the user asks to create, initialize, bootstrap, prepare, or reset the empty structure for an SEO Brain project.

Do not use this skill to run SEO analysis, create content plans, publish pages, migrate user data, collect secrets, or initialize multiple client projects. This repository uses one runtime project at `project/`.

Esta skill pode propor um rascunho automático do Cérebro a partir do site (ver `references/seed-from-site.md`), mas só quando o usuário escolhe esse modo, e o rascunho fica sempre pendente de aprovação — nunca vira contexto aprovado sozinho.

## Critical Points

- Initialize the single project directory only: `project/`. Do not create sibling project folders.
- Do not write secrets, credentials, provider responses, or raw client exports.
- Brain content (`brain/index.md`, `brain/identidade.md`, `brain/voz.md`, `brain/tecnologia.md`, `brain/editorial.md`, `brain/topic-clusters.md`, `brain/log.md`) is created from blank templates with placeholders. The canonical file names are in pt-BR; copy the templates exactly by these names.
- No modo manual, o usuário preenche o Cérebro; não gere prosa estratégica.
- No modo rascunho automático, você PODE gerar um RASCUNHO do Cérebro a partir do site, mas ele fica em `project/workbench/` marcado como pendente e nunca é escrito direto nos arquivos autorais de `project/brain/`. Nada vira contexto aprovado sem uma entrada `tipo: aprovacao` (aprovação humana). Ver `references/seed-from-site.md`.
- Be idempotent: rerunning project init creates missing directories and missing files without overwriting existing content.
- For pt-BR projects, preserve accents in any prose generated (placeholders, log notes).
- Do not fabricate brand facts, market data, or technical decisions — even in draft mode, only use what the site actually states.

## Required Inputs

Collect or infer only what is needed for stable metadata:

- `project_name`: required.
- `site_url`: optional; use `null` when unknown.
- `brand_name`: optional; default to `project_name`.
- `country_or_market`: required unless existing metadata already defines it.
- `primary_language`: required unless existing metadata already defines it.

If these are missing and cannot be safely inferred from `project/.seo-brain/project.json`, ask before writing.

## Framework

### 0. Ask How To Start The Brain

Antes de criar arquivos, pergunte ao usuário como ele prefere começar o Cérebro
do projeto. Use linguagem simples, sem jargão:

> Como você prefere começar o Cérebro do projeto?
> (a) Configurar manualmente — eu crio os arquivos do Cérebro em branco e você preenche.
> (b) Criar um rascunho automático (recomendado) — eu analiso até 10 páginas do seu site principal e proponho um rascunho do Cérebro para você revisar e aprovar.

Regras:

- Recomendado/default: opção (b).
- Se não houver `site_url` (é `null` e o usuário não informa uma URL), a opção
  (b) não é possível: peça a URL do site principal ou siga com a opção (a).
- A opção (a) é o setup básico: só cria a estrutura e os arquivos em branco
  (passos 1-6, depois revisão no passo 8). Não importa nem analisa nada.
- A opção (b) faz o setup básico primeiro (passos 1-6) e, em seguida, executa o
  rascunho automático (passo 7) descrito em `references/seed-from-site.md`.

### 1. Inspect Existing Project State

Read `project/.seo-brain/project.json` and the existing brain files. Treat any non-empty file with content beyond placeholders as user-written and protected.

### 2. Create The Standard Structure

Create these directories idempotently:

```text
project/
project/.seo-brain/
project/sources/
project/workbench/
project/artifacts/
project/brain/
project/conteudos/
project/conteudos/blog/
project/conteudos/linkedin/
project/conteudos/podcast/
project/conteudos/outros/
```

### 3. Write Project Metadata

Write `project/.seo-brain/project.json` with stable, machine-readable metadata. Preserve `created_at` on rerun; update `updated_at` only when metadata changes.

```json
{
  "schema_version": "2.0.0",
  "project_name": "",
  "brand_name": "",
  "site_url": null,
  "country_or_market": "",
  "primary_language": "",
  "created_at": "",
  "updated_at": "",
  "single_project_root": "project"
}
```

### 4. Create Brain Files from Blank Templates

For each of `brain/index.md`, `brain/identidade.md`, `brain/voz.md`, `brain/tecnologia.md`, `brain/editorial.md`, `brain/topic-clusters.md`, `brain/log.md`:

- If the file does not exist, copy from `templates/project/brain/<file>.md`. The frontmatter `title` is now fixed by file type (Identidade, Voz, Tecnologia, Editorial, Topic clusters, Log, e "Índice do Cérebro" para o index) and does not carry the project name — do not substitute it. Replace only `<YYYY-MM-DD>` in `updated` with the current date. Leave all other placeholders for the user.
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
- decisao: Estrutura inicial criada (brain/, sources/, conteudos/, artifacts/, workbench/) com templates em branco para preenchimento humano.
- evidencia: project/.seo-brain/project.json
- aprovador: agent
- notas: <project_name>, <country_or_market>, <primary_language>.
```

Do not append duplicate entries on idempotent reruns that did not change anything.

### 7. Optional: Automatic Brain Draft (only if the user chose option b)

Se o usuário escolheu (b) no passo 0 e existe `site_url`, execute o rascunho
automático seguindo `references/seed-from-site.md`:

- Selecione até 10 URLs representativas do domínio principal (home, sobre,
  serviços, páginas pilar, posts-chave).
- Extraia o conteúdo e componha um RASCUNHO das páginas do Cérebro em
  `project/workbench/`. Não escreva nos arquivos de `project/brain/`.
- Anexe ao `brain/log.md` uma entrada `tipo: ingestao` (token PT, sem "n" final;
  nunca "ingestion") com as URLs lidas como evidência e `aprovador: pendente`.
- Apresente o rascunho para revisão. Só após aprovação explícita do usuário o
  conteúdo aprovado é movido para `project/brain/` e registrado com uma entrada
  `tipo: aprovacao`. Nunca auto-promova o rascunho a contexto aprovado.

Se o usuário escolheu (a), pule este passo: o setup termina com o Cérebro em
branco.

### 8. Review Before Done

Before reporting completion, verify:

- `project/.seo-brain/project.json` exists with project name, market, language, `single_project_root: "project"`, `schema_version: "2.0.0"`.
- All required directories exist.
- The 7 brain files exist with the fixed per-type `title` from the templates (not personalized with the project name) and `updated` set to the current date; placeholders untouched if user has not filled them.
- If option (b) was chosen: the draft lives in `project/workbench/` (not in `project/brain/`), and `brain/log.md` has a `tipo: ingestao` entry with `aprovador: pendente`.
- `brain/log.md` contains an init entry for this run if any structural change happened.
- pt-BR text preserves accents.
- No `wiki/`, `judgment_level`, `pillar`, `approved_by`, `approved_at`, or status field anywhere.

## Output Format

```yaml
status: complete | blocked
project_root: project
metadata:
  path: project/.seo-brain/project.json
  project_name: ""
  country_or_market: ""
  primary_language: ""
created:
  - path: ""
unchanged:
  - path: ""
log_entry:
  appended: true | false
  title: ""
next_action: ""
```

Use `blocked` when required inputs (`project_name`, `country_or_market`, `primary_language`) are missing and cannot be inferred.

## Examples

### New pt-BR project (manual setup)

Input: "Initialize SEO Brain for Clínica Exemplo, Brasil, pt-BR." User picks option (a) manual.

Output: "Create `project/` structure, write `.seo-brain/project.json` with Brasil and `pt-BR`, copy 7 blank brain templates (fixed per-type titles) and 4 content templates preserving pt-BR accents, append `tipo: decisao` log entry, return `status: complete`."

### New project with automatic draft

Input: "Initialize SEO Brain for Clínica Exemplo, site https://clinicaexemplo.com.br." User picks option (b).

Output: "Do the manual setup first (structure + blank templates + `tipo: decisao` log entry). Then follow `references/seed-from-site.md`: read up to 10 pages of the domain, compose a brain draft in `project/workbench/`, append a `tipo: ingestao` log entry with the read URLs and `aprovador: pendente`, and present the draft for approval. Do not write into `project/brain/` until the user approves with a `tipo: aprovacao` entry."

### Idempotent rerun

Input: "Reinitialize this project."

Output: "Create only missing directories and files. Do not overwrite brain files that the user has filled. Do not append a log entry if nothing changed. Return `status: complete` with `unchanged` listing existing files."

## Done Criteria

- Single `project/` root, no siblings.
- The user was asked how to start the Cérebro (manual vs automatic draft) before any file was created.
- 7 brain files created from blank templates if missing, with fixed per-type titles (no project name in `title`); existing user content preserved.
- If automatic draft was chosen: draft lives only in `project/workbench/`, logged as `tipo: ingestao` with `aprovador: pendente`, never auto-promoted into `project/brain/`.
- 4 content directories with `_template.md` each.
- `project/.seo-brain/project.json` records identity and market.
- Init log entry appended only when structural change occurred.
- pt-BR accents preserved in placeholders and log.
- Zero references to `wiki/`, `judgment_level`, `pillar`, status enums.
