# Contributing

Use this guide when editing manifests, skills, scripts, templates, agent prompts, or shared utilities.

## Before you start

- Read [`refactor-status.md`](refactor-status.md) for the current refactor state before resuming structural work.
- Read [`architecture.md`](architecture.md) for the repo shape.
- Canonical skills are self-sufficient narrative `SKILL.md` files. Do not reintroduce required cross-skill reads through `skills/_shared/`.

## Claude Code dev setup

Running plain `claude` inside this repository loads the folder as a normal project and does not enable the plugin. For development, start Claude Code with:

```bash
claude --plugin-dir .
```

Validate the manifests explicitly:

```bash
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
```

After loading, skills are namespaced under `/agentic-seo`:

```text
/agentic-seo:start
/agentic-seo:agentic-seo
/agentic-seo:project-init
/agentic-seo:seo-analysis
/agentic-seo:technical-seo
/agentic-seo:content-seo
/agentic-seo:keyword-research
/agentic-seo:topic-cluster
/agentic-seo:eeat
/agentic-seo:brain-keeper
/agentic-seo:autoresearch
```

After changing skills or agents during an interactive session, run:

```text
/reload-plugins
```

For a persistent local install, add this repository as a local marketplace and install:

```text
/plugin marketplace add /path/to/agentic-seo-skills
/plugin install agentic-seo@agentic-seo-skills-marketplace
```

The optional statusline is not shipped through plugin settings — Claude Code plugin defaults do not own the main `statusLine`. Install it explicitly:

```bash
node scripts/install-statusline.mjs --dry-run
node scripts/install-statusline.mjs --apply
```

The installer preserves any existing statusline by wrapping it and appending `Agentic SEO: loaded` when the `SessionStart` marker exists.

## Cross-tool portability

Agentic SEO is Claude Code first but should remain readable by any agent that follows `AGENTS.md` and standard `SKILL.md` directories.

- Keep skill bodies in standard `SKILL.md` directories so Claude Code and Codex can discover them.
- Keep cross-tool behaviour in `AGENTS.md`, not only in Claude-specific files.
- Keep user-facing runtime behaviour inside the canonical `agentic-seo` skill body.
- Do not rely on terminal output as the primary UX for nontechnical users.
- Prefer local web UI artifacts for previews, decisions, and reports.
- Do not commit secrets, raw user runtime data, generated runs, or provider responses from real clients.

The `UserPromptSubmit` hook that reinforces the Delivery Checkpoint per turn (`scripts/delivery-checkpoint.mjs`) is Claude Code only. The canonical Delivery Checkpoint lives in `skills/agentic-seo/SKILL.md` and is honoured by Codex/Antigravity through standard `SKILL.md` + `AGENTS.md` reading.

What is Claude Code-specific and should not be expected to work in other IDEs:

- `/agentic-seo:*` plugin slash commands.
- Claude Code plugin installation through `.claude-plugin/plugin.json`.
- `SessionStart` hooks and plugin runtime context injection.
- Claude Code `userConfig` for sensitive settings.
- Plugin-scoped browser handoff behaviour.
- Marketplace install/update semantics.

## Skill categories and close contracts

Every skill declares `metadata.category` in the frontmatter. Valid values:

| Category | What it writes |
|---|---|
| `report` | `project/analyses/<module>/<run-slug>/report.md` via the shared `page-report` contract. |
| `delivery` | `project/{workbench,artifacts,brain,contents,clusters,keywords,eeat}/...`. |
| `setup` | Masked status to `project/.agentic-seo/project.json`. Sensitive input uses browser handoff. |
| `meta` | Outside `project/` (e.g. `.context/`, `skills/`, `tools/`). |
| `router` | Defines the close pattern for downstream skills; no own artifact. |
| `contract` | Same as `router`. |
| `alias` | Delegates to another skill. |

Categories `report`, `delivery`, and `setup` MUST include a literal YAML `browser_prompt:` block in the Output Format with the canonical consent line for their category — `Posso abrir o Web Companion para você ver a análise?` (reports) or `Posso abrir o Web Companion para você revisar esta entrega?` (delivery, setup). Categories `meta` and `alias` MUST NOT declare a delivery `browser_prompt:` block. `router` and `contract` may demonstrate the YAML as exemplars.

Skill creation via `seo-skills-creator` enforces category + close contract through the template at `skills/seo-skills-creator/references/template-skill.md` and the rubric Automatic Blocker at `skills/seo-skills-creator/references/approval-rubric.md`. The validator `scripts/validate_skills.mjs` reads `metadata.category` directly; legacy skills without the field fall back to hardcoded sets with a WARN until migration completes.

## Deterministic tooling

Deterministic provider and audit behaviour belongs in `tools/`, `scripts/`, or `src/commands/`, not hidden inside natural-language skill contracts. The DataForSEO CLI is the reference: `tools/clis/dataforseo.js`, indexed in `tools/REGISTRY.md`, attributions in `tools/ATTRIBUTIONS.md`.

Skill bodies stay short. Durable workflow detail goes into `skills/<skill>/SKILL.md`, local skill references, scripts, fixtures, or templates.

## Verifiable changes (Autoresearch loops)

Treat every skill change as a verifiable workflow change. Before implementation is complete, define the skill contract, inputs, outputs, fixture strategy, and pass/fail criteria.

Prefer Autoresearch-style loops:

- One skill or subsystem per run.
- Baseline first.
- Fixed fixtures or budget.
- Explicit metric or rubric.
- A keep/reject decision.

For deeper context, see `program.md`. The runtime engine is `scripts/autoresearch.mjs`.

## Sub-agent protocol

Validate meaningful skill changes with sub-agents that run or simulate the target skill against fixtures.

- Use one executor-style sub-agent.
- For nontrivial changes, also use one reviewer-style sub-agent focused on contract drift, hallucination risk, source separation, and decision/check gates.
- Sub-agent output is evidence, not a final decision. The main agent remains responsible for integration and log entries.

Keep eval artifacts reviewable. Save development run notes in `.context/skill-evals/`; commit only reusable fixtures, scripts, templates, and concise docs.

Keep an implementation only when it passes the agreed checks or preserves behaviour while simplifying the workflow. Log rejected experiments with the reason.

## Process integrity

The default is to follow the full documented process. Do not skip analysis, decision recording, review, lint, source separation, or other gates because the user gave a narrow request, an old artifact exists, or a shortcut seems sufficient.

- A process step may be skipped only when the user explicitly asks to skip it or confirms the bypass after the agent names the missing step and consequence.
- Existing drafts, previous briefings, homepage-only context, or agent confidence do not waive preconditions.
- When a bypass is explicit, record it in the artifact and append a `type: decision` entry to `project/brain/log.md` before presenting the result. State clearly that the artifact is not data-backed for the skipped dimension.
- A decision on an artifact is not acceptance of an undisclosed bypass. Decision requests must show missing analysis, missing sources, and skipped checks before the user decides.
- If a required process cannot run, stop at the gate, run the local browser handoff as the agent when possible, and present only a friendly user instruction. Do not hand bash commands to the user as the UX for decisions or gates.

Always keep extracted data, LLM synthesis, and human judgment separate in every artifact. Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.

## Size and language budgets

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

## Validator and tests

```bash
npm install
npm run build
npm test
node scripts/validate_skills.mjs
```

The validator reads `metadata.category` and the close contract for each skill. Legacy skills without the field hit a WARN until migration completes; do not silence the WARN with empty placeholders.

## Known debt

- `src/agentic-seo.ts` is a slim dispatcher; behaviour is split into `src/commands/`.

## Working with the runtime project

The local runtime `project/` is gitignored. The mirror and sync flow for moving a single runtime project across workspaces is documented in [`project-persistence.md`](project-persistence.md). When the directory layout drifts (legacy `project/content/`, conflicting siblings), `node scripts/check-project-dirs.mjs --root=project` prints a status line plus a suggested `mv` command; `--json` is available for tooling, and `--strict` exits 2 on any issue.
