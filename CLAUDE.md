@AGENTS.md

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

- `src/seo-brain.ts` (~1500 lines) violates the 500-line max. Tracked for split-by-subcommand refactor.

## Claude Code Plugin Loading

Running plain `claude` inside this repository does not enable the plugin. It loads this folder as a normal project only.

When the plugin is loaded, the `SessionStart` hook injects SEO Brain runtime context. The canonical user-facing context skill is:

```text
/seo-brain:seo-brain
```

`AGENTS.md` and `CLAUDE.md` remain development guidance. Use `/seo-brain:seo-brain` to orient user-facing SEO work before selecting a specific workflow skill.

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
/seo-brain:seo-brain
/seo-brain:seo-analysis
/seo-brain:technical-seo
/seo-brain:autoresearch
```

`/seo-brain:autoresearch` runs a Karpathy-style autonomous research loop on any artifact. Engine: `node scripts/autoresearch.mjs <subcommand>`. Doctrine: `program.md`. Schemas: `skills/_shared/references/autoresearch-protocol.md`.

The optional Claude Code statusline is not shipped through plugin settings because plugin default settings do not own the main `statusLine`. Install it explicitly:

```bash
node scripts/install-statusline.mjs --dry-run
node scripts/install-statusline.mjs --apply
```

The installer preserves any existing statusline by wrapping it and appending `SEO Brain: carregado` when the `SessionStart` marker exists.

After changing skills or agents during an interactive session, run:

```text
/reload-plugins
```

For a persistent local install, add this repository as a local marketplace and install the plugin:

```text
/plugin marketplace add /Users/diego/Codex/seo-brain-codex
/plugin install seo-brain@seo-brain-marketplace
```
