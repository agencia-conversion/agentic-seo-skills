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
- Runtime projects: `projects/` and ignored by git except `projects/.gitkeep`

## Compatibility Rules

- Keep skill bodies in standard `SKILL.md` directories so Claude Code and Codex can discover them.
- Keep cross-tool behavior in `AGENTS.md`, not only in Claude-specific files.
- Do not rely on terminal output as the primary UX for nontechnical users.
- Prefer local web UI artifacts for previews, approvals, and reports.
- Do not commit secrets, raw user projects, generated runs, or provider responses from real clients.

## Wiki Rules

Every SEO Brain project should use Obsidian-compatible Markdown and separate sources from synthesis.

- Raw sources live in `sources/` and should be treated as immutable or append-only.
- Generated and curated knowledge lives in `wiki/`.
- Strategic pages require explicit human approval.
- Operational and observational pages may be updated by agents when checks pass.
- Important events must be appended to `wiki/log/index.md`.

Required strategic approval pages:

- `wiki/index.md`
- `wiki/eeat.md`
- `wiki/tecnologia/index.md`
- `wiki/tom-de-voz/index.md`

## Plugin Development

Use these rules when changing manifests, skills, shared references, templates, scripts, or agent instructions.

- Keep agent files short; put durable workflow detail in `skills/<skill>/SKILL.md`, `skills/_shared/references/`, scripts, fixtures, or templates.
- Treat every skill change as a verifiable workflow change. Before implementation is complete, define the skill contract, inputs, outputs, fixture strategy, and pass/fail criteria.
- Prefer Autoresearch-style loops: one skill or subsystem per run, baseline first, fixed fixtures or budget, explicit metric or rubric, and a keep/reject decision. For deeper context, see `karpathy/autoresearch`.
- Validate meaningful skill changes with sub-agents that run or simulate the target skill against fixtures. Use one executor-style sub-agent and, for nontrivial changes, one reviewer-style sub-agent focused on contract drift, hallucination risk, source separation, and approval gates.
- Sub-agent output is evidence, not approval. The main agent remains responsible for integration, and humans still approve strategic context.
- Keep eval artifacts reviewable. Save development run notes in `.context/skill-evals/`; commit only reusable fixtures, scripts, templates, and concise docs.
- Keep an implementation only when it passes the agreed checks or preserves behavior while simplifying the workflow. Log rejected experiments with the reason.
- Separate extracted data, LLM synthesis, and human judgment in every artifact.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.
