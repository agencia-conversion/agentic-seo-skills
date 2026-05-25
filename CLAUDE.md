@AGENTS.md

## Refactor Continuity

Current state is checkpointed in `docs/refactor-status.md`. Read that file before continuing structural refactor work.

**Project Subfolders.** Skill artifacts live under one folder per dimension per slug: `project/contents/<slug>/`, `project/keywords/<seed>/`, `project/audits/<slug>/`, `project/clusters/<seed>/`, `project/eeat/<slug>/`. Canonical report pages live under `project/analyses/<module>/<run-slug>/report.md`, render in the Web Companion, and are editable human presentation artifacts governed by the shared `page-report` skill; structured report fences use YAML `version: 1` for new reports, with JSON only as legacy compatibility. Raw evidence stays in `source_artifact` plus module evidence folders. The brain (`project/brain/`) is the only authorial knowledge layer; changes must be logged as decisions with evidence. See `AGENTS.md` § Brain Rules → Project Subfolders.

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

## Claude Code Plugin Loading

Running plain `claude` inside this repository does not enable the plugin. It loads this folder as a normal project only.

When the plugin is loaded, the `SessionStart` hook injects Agentic SEO runtime context. The canonical user-facing context skill is:

```text
/agentic-seo:agentic-seo
```

`AGENTS.md` and `CLAUDE.md` remain development guidance. Use `/agentic-seo:agentic-seo` to orient user-facing SEO work before selecting a specific workflow skill.

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
/agentic-seo:project-init
/agentic-seo:agentic-seo
/agentic-seo:seo-analysis
/agentic-seo:technical-seo
/agentic-seo:autoresearch
/agentic-seo:brain-keeper
```

`/agentic-seo:autoresearch` runs a Karpathy-style autonomous research loop on any artifact. Engine: `node scripts/autoresearch.mjs <subcommand>`. Doctrine: `program.md`.

The optional Claude Code statusline is not shipped through plugin settings because plugin default settings do not own the main `statusLine`. Install it explicitly:

```bash
node scripts/install-statusline.mjs --dry-run
node scripts/install-statusline.mjs --apply
```

The installer preserves any existing statusline by wrapping it and appending `Agentic SEO: carregado` when the `SessionStart` marker exists.

After changing skills or agents during an interactive session, run:

```text
/reload-plugins
```

For a persistent local install, add this repository as a local marketplace and install the plugin:

```text
/plugin marketplace add /path/to/agentic-seo-skills
/plugin install agentic-seo@agentic-seo-skills-marketplace
```
