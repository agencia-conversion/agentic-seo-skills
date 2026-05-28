# Agentic SEO Documentation

Reference layer for the Agentic SEO plugin. The top-level `AGENTS.md` carries the short runtime contract every agent reads. This folder holds the long-form material.

## For users

Start here if you installed the plugin and want to use it.

- [Getting started](getting-started.md) — install, start a project, open your first artifact in the Web Companion.
- [Web Companion](web-companion.md) — what the Companion is, sidebar tour, reports, decisions, sensitive-input handoffs.
- [Brain](brain.md) — the authorial knowledge layer that compounds across sessions. Obsidian-compatible.
- [Topic Clusters](clusters.md) — the editorial spine. How clusters and content relate, how the sync works, how the Companion surfaces them.

## For contributors

Start here if you are editing the plugin (skills, scripts, templates, manifests).

- [Architecture](architecture.md) — repo shape, plugin manifests, skills, scripts, tools, templates, runtime project layout, CLI.
- [Contributing](contributing.md) — skill categories and close contracts, eval and sub-agent protocol, size and language budgets, TypeScript vs MJS, validator, Claude Code dev setup, cross-tool portability.
- [Refactor status](refactor-status.md) — continuity log for ongoing structural work. Read before resuming structural changes.

## Specifications

Versioned contracts that downstream code, skills, and templates rely on.

- [`specs/topic-clusters-contract.md`](specs/topic-clusters-contract.md) — Topic Clusters schema, sync algorithm, lint catalogue, performance budgets.
- [`specs/topic-clusters-iteration-3.md`](specs/topic-clusters-iteration-3.md) — Historical iteration; kept for context.
- [`specs/en-rename-map.md`](specs/en-rename-map.md) — Authoritative pt-BR → English vocabulary map.
- [`specs/companion-links-and-sources.md`](specs/companion-links-and-sources.md) — Companion link rules and source viewer contract.

## Operational notes

- [`project-persistence.md`](project-persistence.md) — How the local runtime project folder is synchronised across workspaces.
- [`dataforseo-integration.md`](dataforseo-integration.md) — DataForSEO provider integration.
- [`dataforseo-live-test.md`](dataforseo-live-test.md) — Live test notes for the DataForSEO CLI.
- [`obsidian-vault.md`](obsidian-vault.md) — How to open the brain folder as an Obsidian vault.
- [`plans/`](plans/) — Implementation plans for in-flight features.

## Authority

When two pieces of guidance disagree, the order is:

1. The skill's own `SKILL.md` body — runtime authority for that workflow.
2. `AGENTS.md` — cross-tool runtime contract.
3. This folder — deeper reference, never overrides the two above.
4. `docs/specs/*` — versioned contracts for downstream consumers; bumping their version is the breaking-change protocol.
