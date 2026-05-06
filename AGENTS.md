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
- Legacy quarantine during the v1 rewrite: `_legacy/`
- Refactor continuity: `docs/refactor-status.md`
- Shared skill references: removed from canonical v1 skills; old references live only in `_legacy/`
- Tools: `tools/` for deterministic provider CLIs after Phase 2
- Templates: `templates/`
- Utility scripts: `scripts/`
- Runtime project: `project/` and ignored by git except `project/.gitkeep`

## Compatibility Rules

- Keep skill bodies in standard `SKILL.md` directories so Claude Code and Codex can discover them.
- Keep cross-tool behavior in `AGENTS.md`, not only in Claude-specific files.
- Keep user-facing runtime behavior in the canonical `seo-brain` skill; `AGENTS.md` and `CLAUDE.md` are development guidance.
- Do not rely on terminal output as the primary UX for nontechnical users.
- Prefer local web UI artifacts for previews, approvals, and reports.
- Do not commit secrets, raw user project data, generated runs, or provider responses from real clients.

## Process Integrity

The default is to follow the full documented process. Do not skip analysis, approval, review, lint, source separation, or other gates because the user gave a narrow request, because an old artifact exists, or because a shortcut seems sufficient.

- A process step may be skipped only when the current user explicitly asks to skip that specific step or confirms the bypass after the agent names the missing step and consequence.
- Existing drafts, previous briefings, homepage-only context, or agent confidence do not waive preconditions.
- When a bypass is explicit, record it in the artifact and log before presenting the result. State clearly that the artifact is not data-backed for the skipped dimension.
- Approval of an artifact is not approval of an undisclosed bypass. Approval requests must show missing analysis, missing sources, and skipped checks before the user decides.
- If a required process cannot run, stop at the gate, run the local browser handoff as the agent when possible, and present only a friendly user instruction. Do not hand bash commands to the user as the UX for approvals or gates.

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
- The wiki never holds drafts or hypotheses. Pages either reflect approved/measured state or do not exist yet.
- `project/workbench/` is only for construction: research, briefing, auxiliary analysis, and intermediate context.
- Complete deliverables, including v0 artifacts, live in `project/artifacts/`; content drafts live in `project/artifacts/contents/<slug>/`.
- Public content also lives in `project/wiki/conteudos/` only after final approval and `status: published`.
- Hypothetical or unverified strategic work stays outside the Wiki until explicit human approval; operational pages may be promoted only after automated checks pass.

Required strategic approval pages:

- `wiki/index.md`
- `wiki/eeat.md`
- `wiki/tecnologia/index.md`
- `wiki/tom-de-voz/index.md`

## Browser Handoff

For previews, approvals, sensitive input, and option selection, prefer a local browser handoff over terminal interaction.

- Implementation lives in `scripts/companion.mjs` and templates under `templates/companion/`.
- Do not show users raw `node scripts/companion.mjs ...` commands as the primary handoff UX. Ask whether you may open a local browser window for the approval, preview, or sensitive input flow, then run the companion yourself when the user agrees.
- Each handoff binds to `127.0.0.1` on an ephemeral port, requires a one-time token, validates `Origin`/`Host`, and shuts down on submit, cancel, or TTL expiry.
- Sensitive values (credentials, API keys) are never echoed to agent stdout, never logged in full, and never written to the repo root `.env`. They are stored via Claude Code `userConfig` when running as a plugin, or in `project/.env.local` when running standalone.
- Handoff state lives outside `project/` (in `.companion/handoffs/`, gitignored) so skill `Writes only` contracts remain intact.
- Every handoff submission appends to `wiki/log/index.md` with the appropriate `type`.

## Plugin Development

Use these rules when changing manifests, skills, shared references, templates, scripts, or agent instructions.

- Before continuing the v1 refactor, read `docs/refactor-status.md` and resume from the latest checkpoint.
- `_legacy/` is a versioned quarantine snapshot. Main agents must not read it as ordinary context. Only sub-agents assigned a specific refactor, parity, or review task may consult it, following `_legacy/CONSULT-RULES.md`.
- Do not execute binaries, scripts, tests, or generated artifacts from `_legacy/`.
- Canonical v1 skills should be self-sufficient narrative `SKILL.md` files. Do not reintroduce required cross-skill reads through `skills/_shared/`.
- Deterministic provider and audit behavior belongs in `tools/`, `scripts/`, or `src/commands/`, not hidden inside natural-language skill contracts.
- Keep agent files short; put durable workflow detail in `skills/<skill>/SKILL.md`, local skill references, scripts, fixtures, or templates.
- Treat every skill change as a verifiable workflow change. Before implementation is complete, define the skill contract, inputs, outputs, fixture strategy, and pass/fail criteria.
- Prefer Autoresearch-style loops: one skill or subsystem per run, baseline first, fixed fixtures or budget, explicit metric or rubric, and a keep/reject decision. For deeper context, see `karpathy/autoresearch`. The runtime engine is `scripts/autoresearch.mjs`; doctrine lives in `program.md`. The v0 protocol schema is quarantined in `_legacy/skills/_shared/references/autoresearch-protocol.md` until the v1 meta-skills replace it. Use `bin/seo-brain audit-skills` for one-shot quality scoring of all skills after the command dispatcher is restored.
- Validate meaningful skill changes with sub-agents that run or simulate the target skill against fixtures. Use one executor-style sub-agent and, for nontrivial changes, one reviewer-style sub-agent focused on contract drift, hallucination risk, source separation, and approval gates.
- Sub-agent output is evidence, not approval. The main agent remains responsible for integration, and humans still approve strategic context.
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

- `src/seo-brain.ts` has been removed from canonical source during Phase 0. Phase 5 restores it as a slim dispatcher and splits behavior into `src/commands/`.
