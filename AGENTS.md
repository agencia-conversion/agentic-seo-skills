# Agentic SEO Agent Instructions

Agentic SEO is a Claude Code-first plugin that should remain portable to Codex, Antigravity, and other agents that read `AGENTS.md`.

## Product Direction

Agentic SEO implements Agentic SEO through six pillars:

1. Strategy
2. Brain
3. Technology
4. Technical SEO
5. Content
6. Data and Analysis

Humans own judgment. Agents execute intelligence. Agent decisions may update project files directly when evidence and checks are recorded in `project/brain/log.md`; `tipo: aprovacao` remains valid only for legacy log history.

## Repository Shape

This repository root is the plugin root.

- Claude Code manifest: `.claude-plugin/plugin.json`
- Codex manifest: `.codex-plugin/plugin.json`
- Skills: `skills/<skill-name>/SKILL.md`
- Refactor continuity: `docs/refactor-status.md`
- Tools: `tools/` for deterministic provider CLIs.
- Templates: `templates/`
- Utility scripts: `scripts/`
- Versioned reference data: `shared/ctr-curves/` for CTR distributions used by Share of Voice / Share of Clicks modeling. One file per published edition, validated by `shared/ctr-curves/loader.mjs`. See `shared/ctr-curves/_schema.md`.
- Competitive analysis orchestrator: `scripts/competitive-analysis.mjs`. Invoked via `node dist/agentic-seo.js competitive-analysis` (handler `commandCompetitiveAnalysis` in `src/commands/runtime.ts`). Composes M1-M7 from DataForSEO Labs + Backlinks, sitemaps, and homepage HTML; writes `audits/competitive-<run-slug>/report.yaml` + `analyses/competitive-analysis/<run-slug>/report.md` and appends `tipo: decisao` to `brain/log.md`.
- Runtime project: `project/` and ignored by git except `project/.gitkeep`
- Local persistence for ignored runtime projects is handled by `scripts/project-sync.mjs`; see `docs/project-persistence.md`.

## Compatibility Rules

- Keep skill bodies in standard `SKILL.md` directories so Claude Code and Codex can discover them.
- Keep cross-tool behavior in `AGENTS.md`, not only in Claude-specific files.
- Keep user-facing runtime behavior in the canonical `agentic-seo` skill; `AGENTS.md` and `CLAUDE.md` are development guidance.
- Do not rely on terminal output as the primary UX for nontechnical users.
- Prefer local web UI artifacts for previews, decisions, and reports.
- Do not commit secrets, raw user project data, generated runs, or provider responses from real clients.

## Process Integrity

The default is to follow the full documented process. Do not skip analysis, decision recording, review, lint, source separation, or other gates because the user gave a narrow request, because an old artifact exists, or because a shortcut seems sufficient.

- A process step may be skipped only when the current user explicitly asks to skip that specific step or confirms the bypass after the agent names the missing step and consequence.
- Existing drafts, previous briefings, homepage-only context, or agent confidence do not waive preconditions.
- When a bypass is explicit, record it in the artifact and append a `tipo: decisao` entry to `project/brain/log.md` before presenting the result. State clearly that the artifact is not data-backed for the skipped dimension.
- A decision on an artifact is not acceptance of an undisclosed bypass. Decision requests must show missing analysis, missing sources, and skipped checks before the user decides.
- If a required process cannot run, stop at the gate, run the local browser handoff as the agent when possible, and present only a friendly user instruction. Do not hand bash commands to the user as the UX for decisions or gates.

## Language Fidelity

Agentic SEO is English-first and supports Brazilian Portuguese as an official second language, but generated natural-language output should work in any requested language.

- Preserve the spelling, accents, and diacritics of the output language in all human-facing prose, headings, UI text, Markdown, logs, reports, prompts, and review notes.
- For pt-BR, write correct Portuguese with accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- ASCII transliteration is allowed only for slugs, file paths, IDs, enum values, command names, provider payloads, code identifiers, or verbatim source text that originally has no diacritics.
- Never strip accents from user-provided names, titles, claims, excerpts, anchors, or editorial text while summarizing, extracting, reviewing, or rewriting.

## Brain Rules

Every Agentic SEO project keeps authorial knowledge in one place: `project/brain/`. Open it as the Obsidian vault. Public content, evidence, and intermediate artifacts live outside `brain/` so the brain stays small and editable.

### Layout

```
project/
  brain/
    index.md          # mapa + dashboard curto
    identidade.md     # brandbook narrativo (aposto, parágrafo, frase-marca, público, canais)
    voz.md            # princípios de tom e registro
    tecnologia.md     # contexto técnico observado + SEO técnico
    editorial.md      # áreas de conteúdo
    topic-clusters.md # clusters semânticos
    revisao.md        # sede canônica das regras de revisão (universal + projeto)
    log.md            # append-only, autoral
  sources/            # raw, imutável
  conteudos/          # produto público
    blog/<slug>.md
    linkedin/<slug>.md
    podcast/<slug>.md
    outros/<slug>.md
  artifacts/          # entregáveis intermediários e drafts
  workbench/          # rascunhos antes de virar entrada no brain
```

### Frontmatter

Brain pages: `title`, `updated`. No `status`, `judgment_level`, `pillar`, `owner`, `approved_by`, `approved_at`. Confiança vem do log.

Public content (`conteudos/<origem>/<slug>.md`): `title`, `slug`, `published_at`, `source_url`, `origem` (`blog | linkedin | podcast | outros`), `area` (slug que existe como seção em `brain/editorial.md`).

### Consumível (no-gap)

Brain pages, conteúdos e reports são lidos por outros agentes em outras sessões. Cada arquivo precisa ser auto-suficiente.

- Nunca deixar `gap`, `<preencher>`, `TODO`, "a confirmar", "a definir", `[?]`, células vazias ou cabeçalhos sem corpo em arquivos do brain, `conteudos/` ou `relatorios/`.
- Se a evidência falta: buscar mais (scrape, provider call, fonte existente), reescrever a seção sem o item, ou mover o pendente para `brain/log.md` como `tipo: decisao` com critério de reintroduzir. O arquivo autoral fica limpo.
- Estruturas obrigatórias podem omitir subseções inteiras quando não há base. O que não pode é cabeçalho com `gap` no corpo.

### Brain-first protocol

- Mudança em arquivo autoral do brain (`identidade`, `voz`, `tecnologia`, `editorial`, `topic-clusters`, `revisao`, `index`) pode ser aplicada diretamente quando a evidência e a decisão forem registradas em `brain/log.md` como `tipo: decisao` com `aprovador: agent` ou nome humano.
- Para `revisao.md`: estilística menor (novo termo IA-slop, novo verbo Conversion-explainer, typo recorrente) o agente aplica direto com `aprovador: agent`. Mudança de checklist (princípio novo, entrada em "Erros comuns observados", item que altera comportamento do reviewer) vai a `log.md` como `tipo: lint` e aguarda decisão humana antes de tocar a página.
- Mudança operacional (catalogar fonte, registrar lint, registrar publicação, anotar errata) vai direto pro `log.md` com `aprovador: agent` ou nome humano.
- O log é append-only. Erratas são novas entradas referenciando a entrada anterior, não reescrita.

### Tipos de log

`aprovacao`, `decisao`, `errata`, `lint`, `ingestao`, `publicacao`, `prova`. Schema completo na skill `brain-keeper`.

### Wikilinks

Use Obsidian wikilinks `[[...]]` apenas para arquivos reais dentro de `brain/`. Use Markdown links normais para `../sources/`, `../conteudos/`, e URLs externas.

### Regra editorial

A sede canônica das regras de revisão é `brain/revisao.md`. A página carrega a regra editorial universal (lead na primeira frase, atribuição visível, sem opinião dissimulada, anti-IA-slop, anti-Conversion-explainer, preservação de acentos pt-BR) e particularidades do projeto que crescem com o aprendizado das revisões. Tom de voz e registro permanecem em `brain/voz.md`. A skill `brain-keeper` lê `brain/revisao.md` antes de revisar prosa e referencia a página em vez de duplicá-la.

### Public content

Public content lives in `project/conteudos/<origem>/<slug>.md`. Drafts and reviews stay in `project/workbench/content/<slug>/` and `project/artifacts/contents/<slug>/`. The `area:` field in the frontmatter must match a section slug in `brain/editorial.md`.

Canonical report pages live in `project/analyses/<module>/<run-slug>/report.md` and are displayed by the Web Companion under the virtual `Análises` section. The shared `page-report` skill owns this contract. Report pages are editable presentation Markdown with structured fences (`agentic-kpis`, `agentic-chart`, `agentic-table`); new fence payloads use YAML with `version: 1`, while JSON fence bodies are legacy compatibility only. Creation and deletion of reports stay blocked in the Companion v1. Reports must be human-first, use the project language from `project/.agentic-seo/project.json.language` (`pt-BR` and `en` fully supported in v1), keep raw evidence separate in `source_artifact` plus `sources/`, `audits/`, `workbench/`, or module-specific normalized files, and never paste raw JSON/object dumps into the visual body.

### Project Subfolders

Skill artifacts live under one folder per dimension per slug, separate from the brain. The brain remains the only authorial knowledge layer; these dimension folders hold provider evidence, working analysis, drafts, and per-run deliverables.

| Dimension | Canonical root | Layout |
|---|---|---|
| Content | `project/contents/<slug>/` | `workbench/`, `sources/`, `draft.md`, `published.md`, `checks.yaml` |
| Keywords | `project/keywords/<seed-slug>/` | `sources/`, `report.yaml` |
| Audits (technical-seo, seo-analysis, internal-links, backlink-analysis, serp-extract) | `project/audits/<slug>/` | `sources/`, `report.yaml` |
| Topic cluster | `project/clusters/<seed-slug>/` | `sources/`, `cluster.json`, optional projection |
| EEAT | `project/eeat/<entity-or-run-slug>/` | `sources/`, `report.md` |
| Companion reports | `project/analyses/<module>/<run-slug>/` | `report.md` |
| Brain (authorial) | `project/brain/` | direct edits allowed when recorded as `tipo: decisao` in `brain/log.md` |

Skills read the brain for context (identidade, tom de voz, tecnologia, editorial, revisao) and may write brain changes when the decision, evidence, and limitations are recorded in `brain/log.md`. `content-seo` specifically loads `brain/revisao.md` during the `check` phase as the canonical seat of editorial review rules.

## Browser Handoff

For previews, decisions, sensitive input, and option selection, prefer a local browser handoff over terminal interaction.

- Implementation lives in `scripts/companion.mjs` and templates under `templates/companion/`.
- Do not show users raw `node scripts/companion.mjs ...` commands as the primary handoff UX. Ask whether you may open a local browser window for the decision, preview, or sensitive input flow, then run the companion yourself when the user agrees.
- Each handoff binds to `127.0.0.1` on an ephemeral port, requires a one-time token, validates `Origin`/`Host`, and shuts down on submit, cancel, or TTL expiry.
- Sensitive values (credentials, API keys) are never echoed to agent stdout, never logged in full, and never written to the repo root `.env`. They are stored via Claude Code `userConfig` when running as a plugin, or in `project/.env.local` when running standalone.
- Handoff state lives outside `project/` (in `.companion/handoffs/`, gitignored) so skill `Writes only` contracts remain intact.
- Every handoff submission appends to `project/brain/log.md` with the appropriate `tipo:`.

## Plugin Development

Use these rules when changing manifests, skills, templates, scripts, or agent instructions.

- Read `docs/refactor-status.md` for the current refactor state before starting work.
- Canonical skills should be self-sufficient narrative `SKILL.md` files. Do not reintroduce required cross-skill reads through `skills/_shared/`.
- Data/report skills should reference `page-report` for the shared report contract instead of duplicating the full Web Companion report rules.
- Deterministic provider and audit behavior belongs in `tools/`, `scripts/`, or `src/commands/`, not hidden inside natural-language skill contracts.
- Keep agent files short; put durable workflow detail in `skills/<skill>/SKILL.md`, local skill references, scripts, fixtures, or templates.
- Treat every skill change as a verifiable workflow change. Before implementation is complete, define the skill contract, inputs, outputs, fixture strategy, and pass/fail criteria.
- Prefer Autoresearch-style loops: one skill or subsystem per run, baseline first, fixed fixtures or budget, explicit metric or rubric, and a keep/reject decision. For deeper context, see `karpathy/autoresearch`. The runtime engine is `scripts/autoresearch.mjs`; doctrine lives in `program.md`.
- Validate meaningful skill changes with sub-agents that run or simulate the target skill against fixtures. Use one executor-style sub-agent and, for nontrivial changes, one reviewer-style sub-agent focused on contract drift, hallucination risk, source separation, and decision/check gates.
- Sub-agent output is evidence, not a final decision. The main agent remains responsible for integration and log entries.
- Keep eval artifacts reviewable. Save development run notes in `.context/skill-evals/`; commit only reusable fixtures, scripts, templates, and concise docs.
- Keep an implementation only when it passes the agreed checks or preserves behavior while simplifying the workflow. Log rejected experiments with the reason.
- Separate extracted data, LLM synthesis, and human judgment in every artifact.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.

## Size & Language Budgets

Use size as an editorial principle, not as a contract that forces under-explained skills. Keep artifacts focused, but let user-facing skills carry enough context to guide agents without excessive reference chasing.

| Artifact | Path | Guideline | Structural trigger | Overflow strategy |
|---|---|---|---|---|
| Skill body | `skills/*/SKILL.md` | 60-120 lines for most skills | >250 lines means review structure | Move durable detail to `references/`, `templates/`, or a specific skill. Canonical/router skills may be longer when it improves routing, safety, or reduces scattered context. |
| Utility script | `scripts/*.mjs` | ≤ 100 lines | 200 lines is a hard ceiling | Extract modules into `scripts/lib/`. |
| Production code | `src/**/*.ts` | ≤ 300 lines | 500 lines is a hard ceiling | Split by subcommand or domain into multiple files. |
| Test case | `tests/*.mjs` | ≤ 80 lines | — | Split scenarios into separate files. |

Skill bodies should still use progressive discovery. The point of the 250-line trigger is to prompt review, not to reward long prompts. Prefer a longer skill only when the extra guidance prevents predictable workflow mistakes.

### TypeScript vs MJS

- **TypeScript (`src/**/*.ts`)** — code with reusable shapes, multi-module structure, or that grows over time. The build step pays for itself when ≥ 2 `type`/`interface` are reused across functions or ≥ 3 functions share related signatures.
- **MJS (`scripts/*.mjs`, `tests/*.mjs`)** — linear, fixture-driven, single-purpose scripts under 200 lines. No build, executed directly with `node`.
- Default to MJS for new utilities and tests; promote to TS only when the criteria above are met.

### Known debt

- `src/agentic-seo.ts` is a slim dispatcher; behavior is split into `src/commands/`.
