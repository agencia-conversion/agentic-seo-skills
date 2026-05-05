# SEO Brain

SEO Brain is a Claude Code-first plugin for operating one Agentic SEO project with persistent wiki context, deterministic SEO workflows, and human approval for strategic judgment. The repository root is the plugin root.

The current repository state includes the plugin manifests, skill contracts, Wiki templates, implementation plan, Autoresearch loop, and validation script.

## Core Idea

SEO Brain turns SEO work into an AI-first operating system:

- humans define strategy, judgment, positioning, and approval;
- agents execute repeatable intelligence with explicit criteria;
- the project Wiki compounds decisions, sources, feedback, and operating rules;
- technical implementation favors Next.js, SSG, Payload CMS, Vercel, and deterministic SEO checks;
- every skill is tested independently before it becomes part of the default workflow.

## Local Secrets

Credentials must stay in `.env`, which is gitignored. Commit only `.env.example` when the implementation starts.

## Development

Install the TypeScript toolchain:

```bash
npm install
npm run build
```

Validate the Claude Code plugin:

```bash
claude plugin validate .claude-plugin/plugin.json
```

Validate the optional local marketplace:

```bash
claude plugin validate .claude-plugin/marketplace.json
```

Validate SEO Brain skill contracts:

```bash
node scripts/validate_skills.mjs
```

Load locally in Claude Code:

```bash
claude --plugin-dir .
```

Running plain `claude` from this repository does not load the plugin. It only opens the repository as a normal project. Plugin skills are available only after loading with `--plugin-dir` or installing the plugin from a marketplace.

Once loaded, skills are namespaced:

```text
/seo-brain:project-init
/seo-brain:seo-analysis
/seo-brain:technical-seo
```

For a persistent local install in Claude Code:

```text
/plugin marketplace add /Users/diego/Codex/seo-brain-codex
/plugin install seo-brain@seo-brain-marketplace
```

Run the offline v0.1 smoke test:

```bash
npm test
```

Use the local CLI directly:

```bash
bin/seo-brain project-init "Meu projeto"
bin/seo-brain data-setup
bin/seo-brain keyword-research --keyword "seo agentico"
bin/seo-brain serp-extract --keyword "seo agentico"
bin/seo-brain seo-analysis --keyword "seo agentico"
bin/seo-brain topic-cluster --seed "seo agentico"
bin/seo-brain eeat --claim "Prova de autoridade" --status gap
bin/seo-brain content-seo --topic "O que e SEO agentico"
bin/seo-brain backlink-analysis --target example.com --mode standard --limit 10
bin/seo-brain technical-seo --html-file tests/fixtures/technical-seo-home.html --page-type inicial
bin/seo-brain technical-seo --html-file tests/fixtures/technical-seo-ecommerce-product.html --page-type produto-ecommerce
bin/seo-brain technical-seo --html-file tests/fixtures/technical-seo-service.html --page-type produto-ou-servico
bin/seo-brain technical-seo --html-file tests/fixtures/technical-seo-valid.html --page-type blog
bin/seo-brain technical-seo --html-file tests/fixtures/technical-seo-about.html --page-type quem-somos
bin/seo-brain next-website-creator
bin/seo-brain payload-cms
```

Provider calls can consume credits unless `--mode offline` or DataForSEO sandbox is used. DataForSEO defaults to `--mode standard` for SERP and keyword data. Backlink analysis accepts `standard` but maps it to DataForSEO live-only endpoints and records that in the report. Use `--mode live` for ultrafast results and `--mode async` for callback-based SERP/keyword tasks. See `docs/dataforseo-integration.md`.

## Main Planning Docs

- `docs/product-spec-v0.1.md`
- `docs/wiki-karpathy-validation.md`
- `docs/skill-quality-criteria.md`
- `docs/plans/implementation-plan-v0.1.md`
- `program.md`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `AGENTS.md`
- `CHANGELOG.md`
