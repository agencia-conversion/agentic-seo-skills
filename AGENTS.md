# SEO Brain Agent Instructions

SEO Brain is a Claude Code-first plugin that should remain portable to Codex, Antigravity, and other agents that read `AGENTS.md`.

## Product Direction

SEO Brain implements Agentic SEO through six pillars:

1. Strategy
2. LLM Wiki
3. Technology
4. Technical SEO
5. Content
6. Data and Analysis

Humans own judgment. Agents execute intelligence. A draft created by an agent is not approved strategic context until the user explicitly approves it.

## Repository Shape

This repository root is the plugin root.

- Claude Code manifest: `.claude-plugin/plugin.json`
- Codex manifest: `.codex-plugin/plugin.json`
- Skills: `skills/<skill-name>/SKILL.md`
- Shared skill references: `skills/_shared/references/`
- Templates: `templates/`
- Utility scripts: `scripts/`
- Runtime project: `project/` and ignored by git except `project/.gitkeep`

## Compatibility Rules

- Keep skill bodies in standard `SKILL.md` directories so Claude Code and Codex can discover them.
- Keep cross-tool behavior in `AGENTS.md`, not only in Claude-specific files.
- Do not rely on terminal output as the primary UX for nontechnical users.
- Prefer local web UI artifacts for previews, approvals, and reports.
- Do not commit secrets, raw user project data, generated runs, or provider responses from real clients.

## Language Fidelity

SEO Brain is English-first and supports Brazilian Portuguese as an official second language, but generated natural-language output should work in any requested language.

- Preserve the spelling, accents, and diacritics of the output language in all human-facing prose, headings, UI text, Markdown, logs, reports, prompts, and review notes.
- For pt-BR, write correct Portuguese with accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- ASCII transliteration is allowed only for slugs, file paths, IDs, enum values, command names, provider payloads, code identifiers, or verbatim source text that originally has no diacritics.
- Never strip accents from user-provided names, titles, claims, excerpts, anchors, or editorial text while summarizing, extracting, reviewing, or rewriting.

## Wiki Rules

Every SEO Brain project should use Obsidian-compatible Markdown and separate sources from synthesis.

- Raw sources live in `sources/` and should be treated as immutable or append-only.
- Generated and curated knowledge lives in `wiki/`; open `project/wiki/` as the Obsidian vault.
- `wiki/fontes/index.md` is a catalog of raw evidence, but the raw files themselves remain in `sources/`.
- Use Obsidian wikilinks only for real pages inside `wiki/`; use normal Markdown links for files under `../sources/`.
- Strategic pages require explicit human approval.
- Operational and observational pages may be updated by agents when checks pass.
- Important events must be appended to `wiki/log/index.md`. Each entry must declare a `type` of `strategic-approval` or `operational-decision` so events can be filtered by audience.
- The wiki never holds drafts or hypotheses. Pages either reflect approved/measured state or do not exist yet. Hypothetical or unverified work lives only under `project/workbench/` until promoted by explicit human approval (for strategic pages) or by passing automated checks (for operational pages).

Required strategic approval pages:

- `wiki/index.md`
- `wiki/eeat.md`
- `wiki/tecnologia/index.md`
- `wiki/tom-de-voz/index.md`

## Browser Handoff

For previews, approvals, sensitive input, and option selection, prefer a local browser handoff over terminal interaction.

- Implementation lives in `scripts/companion.mjs` and templates under `templates/companion/`.
- Each handoff binds to `127.0.0.1` on an ephemeral port, requires a one-time token, validates `Origin`/`Host`, and shuts down on submit, cancel, or TTL expiry.
- Sensitive values (credentials, API keys) are never echoed to agent stdout, never logged in full, and never written to the repo root `.env`. They are stored via Claude Code `userConfig` when running as a plugin, or in `project/.env.local` when running standalone.
- Handoff state lives outside `project/` (in `.companion/handoffs/`, gitignored) so skill `Writes only` contracts remain intact.
- Every handoff submission appends to `wiki/log/index.md` with the appropriate `type`.

## Plugin Development

Use these rules when changing manifests, skills, shared references, templates, scripts, or agent instructions.

- Keep agent files short; put durable workflow detail in `skills/<skill>/SKILL.md`, `skills/_shared/references/`, scripts, fixtures, or templates.
- Treat every skill change as a verifiable workflow change. Before implementation is complete, define the skill contract, inputs, outputs, fixture strategy, and pass/fail criteria.
- Prefer Autoresearch-style loops: one skill or subsystem per run, baseline first, fixed fixtures or budget, explicit metric or rubric, and a keep/reject decision. For deeper context, see `karpathy/autoresearch`. The runtime engine is `scripts/autoresearch.mjs` (skill: `/seo-brain:autoresearch`, doctrine: `program.md`, schemas: `skills/_shared/references/autoresearch-protocol.md`). Use `bin/seo-brain audit-skills` for one-shot quality scoring of all skills.
- Validate meaningful skill changes with sub-agents that run or simulate the target skill against fixtures. Use one executor-style sub-agent and, for nontrivial changes, one reviewer-style sub-agent focused on contract drift, hallucination risk, source separation, and approval gates.
- Sub-agent output is evidence, not approval. The main agent remains responsible for integration, and humans still approve strategic context.
- Keep eval artifacts reviewable. Save development run notes in `.context/skill-evals/`; commit only reusable fixtures, scripts, templates, and concise docs.
- Keep an implementation only when it passes the agreed checks or preserves behavior while simplifying the workflow. Log rejected experiments with the reason.
- Separate extracted data, LLM synthesis, and human judgment in every artifact.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.

## Size & Language Budgets

File-size limits per artifact type. Treat the target as the goal and the max as a hard ceiling — exceeding the max means refactor before merging.

| Artifact | Path | Target | Max | Overflow strategy |
|---|---|---|---|---|
| Skill body | `skills/*/SKILL.md` | ≤ 60 lines | 100 | Move detail to `references/` or `templates/` (progressive discovery). |
| Utility script | `scripts/*.mjs` | ≤ 100 lines | 200 | Extract modules into `scripts/lib/`. |
| Production code | `src/**/*.ts` | ≤ 300 lines | 500 | Split by subcommand or domain into multiple files. |
| Test case | `tests/*.mjs` | ≤ 80 lines | — | Split scenarios into separate files. |

### TypeScript vs MJS

- **TypeScript (`src/**/*.ts`)** — code with reusable shapes, multi-module structure, or that grows over time. The build step pays for itself when ≥ 2 `type`/`interface` are reused across functions or ≥ 3 functions share related signatures.
- **MJS (`scripts/*.mjs`, `tests/*.mjs`)** — linear, fixture-driven, single-purpose scripts under 200 lines. No build, executed directly with `node`.
- Default to MJS for new utilities and tests; promote to TS only when the criteria above are met.

### Known debt

- `src/seo-brain.ts` (1116 lines) violates the 500-line max. Tracked for split-by-subcommand refactor.
