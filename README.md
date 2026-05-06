# SEO Brain

SEO Brain is officially available as a Claude Code plugin.

It is an Agentic SEO framework for building strategy with human judgment and agent scale. Humans approve strategic context; agents execute research, analysis, content workflows, technical checks, and Wiki maintenance.

## Install in Claude Code

Run these commands in a terminal where Claude Code is available as `claude`:

```bash
claude plugin marketplace add agencia-conversion/seo-brain
claude plugin install seo-brain@seo-brain-marketplace
```

Then restart Claude Code or run:

```text
/reload-plugins
```

Start SEO Brain with:

```text
/seo-brain:start
```

If you installed an older private beta from another GitHub repository, remove that marketplace first and then run the install commands above.

## Update

```bash
claude plugin marketplace update seo-brain-marketplace
claude plugin update seo-brain@seo-brain-marketplace
```

Then restart Claude Code or run `/reload-plugins`.

## Test Locally Without Installing

To load the plugin from a local checkout without installing it:

```bash
git clone https://github.com/agencia-conversion/seo-brain.git
cd seo-brain
claude --plugin-dir .
```

Running plain `claude` from this repository opens the folder as a normal project. Plugin skills are available only after loading with `--plugin-dir` or installing SEO Brain through the Claude Code plugin marketplace.

For local development, validate the plugin and marketplace manifests:

```bash
npm install
npm run build
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
npm test
```

## Other IDEs and Agents

SEO Brain is officially supported only as a Claude Code plugin in v0.1.

Other IDEs and agents can test the portable parts of the framework, but not the complete plugin experience. What can be tested:

- reading `AGENTS.md` for cross-agent operating rules;
- reading `skills/<skill-name>/SKILL.md` files as portable skill instructions;
- running the local CLI commands after cloning the repository;
- using `templates/` and `docs/` as reference material;
- validating source separation, Wiki layout, and approval-aware workflows manually.

What is Claude Code-specific and should not be expected to work in other IDEs:

- `/seo-brain:*` plugin slash commands;
- Claude Code plugin installation through `.claude-plugin/plugin.json`;
- `SessionStart` hooks and plugin runtime context injection;
- Claude Code `userConfig` for sensitive settings;
- plugin-scoped browser handoff behavior;
- marketplace install/update semantics.

Codex compatibility is best-effort through `AGENTS.md`, `.codex-plugin/plugin.json`, and standard `skills/<skill-name>/SKILL.md` directories. Cursor, Windsurf, Copilot, and similar tools may be able to use the Markdown instructions after opening or copying the repository, but this is not the official distribution path.

## How SEO Brain Works

SEO Brain organizes Agentic SEO around six pillars:

1. Strategy
2. LLM Wiki
3. Technology
4. Technical SEO
5. Content
6. Data and Analysis

The operating model is simple:

- humans own strategy, judgment, positioning, and approvals;
- agents execute repeatable intelligence with explicit criteria;
- project knowledge compounds in an Obsidian-compatible Wiki;
- raw sources stay separate from synthesized knowledge;
- strategic pages require explicit human approval before they become canonical context.

SEO Brain is English-first and officially supports Brazilian Portuguese. Generated prose preserves spelling, accents, and diacritics in the requested language.

## Main Workflows

Once installed, skills are namespaced under `/seo-brain`.

```text
/seo-brain:start
/seo-brain:seo-brain
/seo-brain:project-init
/seo-brain:seo-analysis
/seo-brain:technical-seo
/seo-brain:content-seo
/seo-brain:keyword-research
/seo-brain:topic-cluster
/seo-brain:eeat
```

The local CLI also exposes deterministic commands used by the skills and tests:

```bash
bin/seo-brain project-init "My project"
bin/seo-brain data-setup
bin/seo-brain keyword-research --keyword "agentic seo"
bin/seo-brain serp-extract --keyword "agentic seo"
bin/seo-brain seo-analysis --keyword "agentic seo"
bin/seo-brain topic-cluster --seed "agentic seo"
bin/seo-brain content-seo --topic "What is agentic SEO"
bin/seo-brain technical-seo --html-file tests/fixtures/technical-seo-home.html --page-type inicial
```

Provider calls can consume credits unless an offline mode or provider sandbox is used. DataForSEO defaults to `standard` mode for SERP and keyword data.

## Release

SEO Brain 0.1.0 is distributed through:

- GitHub repository: `agencia-conversion/seo-brain`
- Claude Code marketplace: `.claude-plugin/marketplace.json`
- Claude Code plugin id: `seo-brain@seo-brain-marketplace`
- Claude plugin release tag: `seo-brain--v0.1.0`

## Security

Do not commit secrets, raw client data, generated runs, or provider responses from real clients. Credentials belong in Claude Code plugin user configuration or local ignored environment files.
