# Architecture

The repo root is the plugin root. Every artefact below ships with the plugin or supports development of it.

## Repo shape

| Path | Purpose |
|---|---|
| `.claude-plugin/plugin.json` | Claude Code plugin manifest. |
| `.codex-plugin/plugin.json` | Codex plugin manifest (best-effort cross-tool compatibility). |
| `.claude-plugin/marketplace.json` | Local marketplace manifest for installing the plugin without the public marketplace. |
| `skills/<skill-name>/SKILL.md` | One folder per skill. The `SKILL.md` body is the runtime contract; `references/`, `templates/`, and `evals/` siblings hold supporting material. |
| `templates/` | Project, Companion, and brain subpage scaffolds copied into runtime projects. |
| `scripts/` | Utility scripts and helpers (`scripts/lib/` for shared modules). MJS, linear, fixture-driven. |
| `src/` | TypeScript sources for the deterministic CLI behind `bin/agentic-seo`. Split by subcommand in `src/commands/`. |
| `dist/` | Built CLI output. Produced by `npm run build`. |
| `bin/agentic-seo` | Thin shim that invokes the built CLI. |
| `tools/` | Deterministic provider CLIs. `tools/clis/dataforseo.js` is the canonical example; `tools/REGISTRY.md` is the index. |
| `apps/companion/` | The Next.js Web Companion. |
| `shared/` | Versioned reference data (e.g. `shared/ctr-curves/`) and shared utilities (`shared/locale.mjs`, `shared/locale.d.ts`). |
| `tests/` | Test cases. MJS, executed directly with `node`. Provider integration tests live in `tests/tools/`. |
| `docs/` | This documentation tree. `docs/specs/` for versioned contracts; `docs/plans/` for in-flight implementation plans. |
| `agents/` | Cross-tool agent prompts surfaced through the plugin (e.g. for paid advertising audits). |
| `program.md` | Karpathy-style Autoresearch doctrine; the engine is `scripts/autoresearch.mjs`. |
| `project/` | Runtime workspace for a single project. Gitignored except `project/.gitkeep`. |

## Runtime project layout

Created by `project-init` and consumed by every workflow skill. Brain pages are the only authorial knowledge layer; every other folder holds evidence, working analysis, drafts, or per-run deliverables.

```
project/
  brain/
    index.md
    identity.md
    voice.md
    technology.md
    topic-clusters.md
    topic-clusters/
      <slug>.md
    review.md
    log.md
  sources/
  contents/
    blog/<slug>.md
    linkedin/<slug>.md
    podcast/<slug>.md
    other/<slug>.md
  clusters/
    <slug>/
      cluster.yaml
      draft.yaml
      planning.md
      sources/
  analyses/
    <module>/<run-slug>/report.md
  artifacts/
    contents/<slug>/
  workbench/
    content/<slug>/
    topic-cluster/
    migrations/
  audits/<slug>/
  keywords/<seed-slug>/
  eeat/<entity-or-run-slug>/
  .agentic-seo/
    project.json           # name, language, runtime metadata
    trash/                 # soft-delete buckets, one per origin
```

`project/contents/` is canonical. The legacy singular `project/content/` is not read; the Companion warns when it sees either form, and `node scripts/check-project-dirs.mjs --root=project` prints a suggested `mv` command.

## Source separation

Keep evidence, synthesis, deliverables, and authorial knowledge in distinct folders:

- **Raw sources** — `project/sources/`. Immutable once captured. Provider responses (DataForSEO, scrape snapshots) live here.
- **Working analysis** — `project/workbench/`. Drafts, hypotheses, intermediate reasoning.
- **Report pages** — `project/analyses/`. Editable Markdown built by the shared `page-report` contract.
- **Complete non-report deliverables** — `project/artifacts/`. Briefs, drafts, specs, checks, import summaries.
- **Public content** — `project/contents/`. Flat files per origin (`blog`, `linkedin`, `podcast`, `other`).
- **Authorial knowledge** — `project/brain/`. The only place that compounds across sessions.

Skills must keep evidence, synthesis, and judgment separate in every artifact. Wikilinks `[[name]]` only inside the brain; standard Markdown links for everything else.

## CLI commands

`bin/agentic-seo` exposes:

```text
project-init          # create the brain structure and seed blank templates
project-browser       # open the local Web Companion project browser
brain-lint            # lint the brain
brain-approve         # approve a brain page change
brain-ingest          # catalogue a new source under project/sources/
data-setup            # collect/validate/mask/repair DataForSEO credentials
keyword-research      # keyword metrics, suggestions, CPC, competition, clustering inputs
kw-volume             # keyword volume lookup
serp-extract          # raw and normalised SERP snapshots
seo-analysis          # SERP comparison, gap analysis, page scoring
backlink-analysis     # backlinks, referring domains, anchors, link gap
competitive-analysis  # multi-surface domain or URL comparison; composes other skills
topic-cluster         # build, refresh, or promote one Topic Cluster
content-seo           # briefs, drafts, refreshes, rewrites, reviews, publication
technical-seo         # deterministic page audits
eeat                  # experience, expertise, authoritativeness, trust evaluation
audit-skills          # validate skills against contracts and rubrics
```

Website creation, CMS setup, deployment, and frontend implementation commands are intentionally not exposed. `technical-seo` audits existing URLs, HTML, templates, or audit JSON only.

## Shared utilities

- `shared/locale.mjs` — `getProjectLanguage`, `normalizeLanguage`, `formatNumber`, `formatPercent`, `canonicalKeyword`, `asciiFold`, `slugify`. Skills format numbers and deduplicate near-duplicate keywords through this module; the Companion mirrors `formatNumber` / `formatPercent` via `useI18n()` for render-time formatting.
- `shared/ctr-curves/` — Versioned CTR distributions used by Share of Voice / Share of Clicks modelling. One file per published edition, validated by `shared/ctr-curves/loader.mjs`. See `shared/ctr-curves/_schema.md`.
- `scripts/lib/brain-page.mjs` — Brain page helpers used by the Companion server and CLI.
- `scripts/lib/project-browser-files.mjs` — File contracts behind the Companion project browser.
- `scripts/lib/clusters-apply.mjs` — Idempotent helper for writing `cluster.yaml`, content frontmatter, and brain subpages.

## Plugin manifests

- `.claude-plugin/plugin.json` declares the plugin to Claude Code: slug, version, skill discovery rules, hooks.
- `.codex-plugin/plugin.json` mirrors the Codex side for best-effort portability.
- `.claude-plugin/marketplace.json` declares the local marketplace for installing the plugin from a checkout.

The `SessionStart` hook (`scripts/session-bootstrap.mjs`) injects runtime context on every Claude Code session start. The `UserPromptSubmit` hook (`scripts/delivery-checkpoint.mjs`) reinforces the Delivery Checkpoint per turn. Both are Claude Code only.

## Persistence

The local runtime `project/` is gitignored. The mirror and sync flow for moving a single runtime project across workspaces is documented in [`project-persistence.md`](project-persistence.md).
