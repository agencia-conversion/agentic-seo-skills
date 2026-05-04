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
- Generated and curated knowledge lives in `wiki/`; open `projects/<slug>/wiki/` as the Obsidian vault.
- `wiki/fontes/index.md` is a catalog of raw evidence, but the raw files themselves remain in `sources/`.
- Use Obsidian wikilinks only for real pages inside `wiki/`; use normal Markdown links for files under `../sources/`.
- Strategic pages require explicit human approval.
- Operational and observational pages may be updated by agents when checks pass.
- Important events must be appended to `wiki/log/index.md`.

Required strategic approval pages:

- `wiki/index.md`
- `wiki/eeat.md`
- `wiki/tecnologia/index.md`
- `wiki/tom-de-voz/index.md`

## Development Rules

- Use progressive discovery in skills: keep `SKILL.md` concise and point to references, scripts, or templates only when needed.
- Every skill must have a contract, fixture strategy, and evaluation criteria before implementation is considered complete.
- Use Autoresearch for iterative improvement: one skill or subsystem per run, fixed criteria, keep/reject decision, and logged result.
- Separate extracted data, LLM synthesis, and human judgment in every artifact.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.

## Claude Code Plugin Loading

Running plain `claude` inside this repository does not enable the plugin. It loads this folder as a normal project only.

For development, start Claude Code with:

```bash
claude --plugin-dir .
```

Validate the plugin manifest explicitly:

```bash
claude plugin validate .claude-plugin/plugin.json
```

Validate the optional local marketplace explicitly:

```bash
claude plugin validate .claude-plugin/marketplace.json
```

After loading, invoke plugin skills with the namespace:

```text
/seo-brain:project-init
/seo-brain:seo-analysis
/seo-brain:technical-seo
```

After changing skills or agents during an interactive session, run:

```text
/reload-plugins
```

For a persistent local install, add this repository as a local marketplace and install the plugin:

```text
/plugin marketplace add /Users/diego/Codex/seo-brain-codex
/plugin install seo-brain@seo-brain-marketplace
```
