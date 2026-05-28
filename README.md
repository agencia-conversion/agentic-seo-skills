# Agentic SEO Skills

Agentic SEO is officially available as a Claude Code plugin. It is a framework for executing SEO with human judgment and agent scale: agents do the research, analysis, content drafting, technical checks, and brain maintenance while logging decisions, evidence, and limitations. The Web Companion is where you read and approve every deliverable.

## Install

Run these commands in a terminal where Claude Code is available as `claude`:

```bash
claude plugin marketplace add agencia-conversion/agentic-seo-skills
claude plugin install agentic-seo@agentic-seo-skills-marketplace
```

Then restart Claude Code or run `/reload-plugins` inside an active session.

## Start

```text
/agentic-seo:start
```

The agent orients the session, runs `project-init` when needed, and routes every substantive deliverable through the Web Companion. For a five-minute walkthrough, see [`docs/getting-started.md`](docs/getting-started.md).

## Update

```bash
claude plugin marketplace update agentic-seo-skills-marketplace
claude plugin update agentic-seo@agentic-seo-skills-marketplace
```

Then restart Claude Code or run `/reload-plugins`.

## How it works

- Humans own strategy, judgment, and positioning.
- Agents execute repeatable intelligence with explicit criteria.
- The Web Companion is the delivery surface — chat is for short conversation; deliverables are read in the Companion.
- Project knowledge compounds in an Obsidian-compatible brain at `project/brain/`.
- Raw sources, working analysis, deliverables, public content, and authorial knowledge stay in distinct folders.

Six pillars: Strategy · Brain · Technology · Technical SEO · Content · Data and Analysis.

Agentic SEO is English-first and officially supports Brazilian Portuguese. Generated prose preserves spelling, accents, and diacritics in the requested language.

## Documentation

| For | Start here |
|---|---|
| Users | [`docs/getting-started.md`](docs/getting-started.md), [`docs/web-companion.md`](docs/web-companion.md), [`docs/brain.md`](docs/brain.md), [`docs/clusters.md`](docs/clusters.md) |
| Contributors | [`docs/architecture.md`](docs/architecture.md), [`docs/contributing.md`](docs/contributing.md), [`docs/refactor-status.md`](docs/refactor-status.md) |
| Specifications | [`docs/specs/`](docs/specs/) |

The full index is at [`docs/README.md`](docs/README.md).

## Local development

To load the plugin from a local checkout without installing it:

```bash
git clone https://github.com/agencia-conversion/agentic-seo-skills.git
cd agentic-seo-skills
npm install
npm run build
claude --plugin-dir .
```

Running plain `claude` from this repository opens the folder as a normal project; plugin skills are only available after loading with `--plugin-dir` or installing through the Claude Code plugin marketplace.

Validate the manifests and run the tests:

```bash
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
npm test
node scripts/validate_skills.mjs
```

For the full development workflow, see [`docs/contributing.md`](docs/contributing.md).

## Other IDEs and Agents

Agentic SEO is officially supported only as a Claude Code plugin in the current release.

Other IDEs and agents can test the portable parts of the framework, but not the complete plugin experience. What can be tested:

- reading `AGENTS.md` for the cross-agent runtime contract;
- reading `skills/<skill-name>/SKILL.md` files as portable skill instructions;
- running the local CLI commands after cloning the repository;
- using `templates/` and `docs/` as reference material;
- validating source separation, brain layout, and decision-aware workflows manually.

What is Claude Code-specific and should not be expected to work in other IDEs: `/agentic-seo:*` plugin slash commands, plugin installation through `.claude-plugin/plugin.json`, `SessionStart` hooks and runtime context injection, Claude Code `userConfig` for sensitive settings, plugin-scoped browser handoff behaviour, and marketplace install/update semantics.

Codex compatibility is best-effort through `AGENTS.md`, `.codex-plugin/plugin.json`, and standard `skills/<skill-name>/SKILL.md` directories.

## Release

Agentic SEO 0.2.0 is distributed through:

- GitHub repository: `agencia-conversion/agentic-seo-skills`
- Claude Code marketplace: `.claude-plugin/marketplace.json`
- Claude Code plugin id: `agentic-seo@agentic-seo-skills-marketplace`
- Claude plugin release tag: `agentic-seo--v0.2.0`

## Security

Do not commit secrets, raw client data, generated runs, or provider responses from real clients. Credentials belong in Claude Code plugin user configuration or local ignored environment files.
