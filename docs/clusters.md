# Topic Clusters

Topic Clusters are the editorial spine of Agentic SEO. A cluster gathers a pillar piece and its satellite pieces around a strategic theme. Content lives in an N:N relation with clusters: one article can belong to multiple clusters at the same time.

For the versioned schema, lint catalogue, sync algorithm, and performance budgets, see [`specs/topic-clusters-contract.md`](specs/topic-clusters-contract.md). This page is the narrative tour.

## The three artifacts

Each active cluster has three files that the runtime keeps in sync:

| Path | Role | Source of |
|---|---|---|
| `project/clusters/<slug>/cluster.yaml` | Structured editorial manifest | Thesis, pillar, planned satellites, overrides, evidence |
| `project/contents/<origin>/<slug>.md` | Public content with frontmatter | **Cluster affiliation** (the `clusters:` field) |
| `project/brain/topic-clusters/<slug>.md` | Authorial brain subpage with materialised projection | Editorial prose + a read-only table between sentinels |

Plus:

- `project/brain/topic-clusters.md` — the index aggregator (authorial prose + a projected dashboard).
- `project/clusters/<slug>/draft.yaml` — the draft before promotion, same schema, different status.
- `project/clusters/<slug>/planning.md` — the human-readable view, optional.

## Principles

1. **One relation, one source.** Drift between sources is a lint, not a merge.
2. **An LLM reads a file in isolation and understands it.** The materialised table lives in the brain; agents do not need to scan a hundred content files.
3. **Humans edit where it makes sense to edit.** Prose in the brain, affiliation in the content frontmatter, editorial manifest in the YAML.
4. **Obsidian works without a plugin.** Bases (Obsidian core 2024+) is a bonus, not a requirement.
5. **Sync is explicit + a server-side hook.** Local watcher daemons are deferred.
6. **The CLI is the contract; the UI is convenience.** Everything is operable via CLI only.
7. **Idempotent.** Running `cluster-sync` N times converges.

## Content frontmatter

Each piece of content declares its clusters in the frontmatter:

```yaml
---
contract_version: 1
title: "Skills for Agentic SEO"
slug: skills-for-agentic-seo
published_at: 2026-04-12
source_url: "https://conversion.com.br/blog/skills-for-agentic-seo"
origin: blog                                # blog | linkedin | podcast | other
clusters: [agentic-seo, artificial-intelligence]
role:                                       # optional
  agentic-seo: satellite                    # default is satellite; redundant but explicit
  artificial-intelligence: satellite
---
```

Rules:

- `clusters` is required (minimum one slug). Each slug must exist as a folder in `clusters/`. Otherwise → lint `content.cluster-missing` (block at pre-commit, warn at sync).
- `role` is optional. Absence means `satellite`. A `role` key for a cluster outside `clusters: [...]` → lint `content.role-orphan`.
- `cluster.yaml.pillar.slug` pointing at this piece **forces** Pillar even if `role:` says otherwise — and emits `cluster.pillar.divergence`.
- A piece is the pillar of **at most one cluster**. Violation → lint `cluster.unique-pillar` (block).

## The materialised table

Each `brain/topic-clusters/<slug>.md` subpage carries authorial prose plus a materialised table of every content piece in the cluster, between explicit sentinels:

```markdown
<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->
## Content

| Role | Content | Keyword (vol.) | Intent | Status | Action | Updated | Also in |
|---|---|---|---|---|---|---|---|
| Pillar | [What is Agentic SEO](../../contents/blog/what-is-agentic-seo.md) | agentic seo (1.2k) | Informational | Published | — | 2026-04-20 | — |
| Satellite | [Skills for Agentic SEO](../../contents/blog/skills-for-agentic-seo.md) | skills for agentic seo (290) | Informational | Published | — | 2026-04-12 | artificial-intelligence |
| Planned | _agentic research agents_ | agentic research agents (320) | Informational | Planned | Brief | — | — |

<!-- END cluster-content-table:auto -->
```

The sections outside the sentinels are authorial — preserved on every regeneration. The block between the sentinels is generated — rewritten on every `cluster-sync`. Manual edits inside the sentinels are overwritten (v1) or blocked visually (v2 Tiptap).

The same `BEGIN cluster-index-table:auto:v1:do-not-edit` / `END cluster-index-table:auto` sentinel pair governs the index dashboard in `brain/topic-clusters.md`.

## The sync command

```text
node scripts/cluster-sync.mjs [--cluster=<slug>] [--check]
```

The algorithm:

1. Load all `clusters/*/cluster.yaml` (parse YAML).
2. Load frontmatter from all `contents/**/*.md`. Cache invalidates by `mtime`.
3. For each cluster (or only `<slug>` when `--cluster=` is passed):
   - Resolve the pillar content via `cluster.yaml.pillar.slug`.
   - Gather published content where `clusters: [...]` includes the cluster slug.
   - Gather `planned_satellites[]` from the YAML.
   - Resolve the role for each published row (see precedence below).
   - For each content row, compute the "Also in" column = `clusters: [...]` minus this cluster.
   - Apply `satellite_overrides[]` to the relevant columns.
   - Render the table using the label dictionary for `project.json.language`.
4. Compute an SHA-256 fingerprint of the materialised output.
5. Compare against `clusters/<slug>/.sync-fingerprint` (gitignored). If identical → no-op.
6. Rewrite the region between sentinels on the subpage + write the fingerprint.
7. Update `stats.published`, `stats.planned`, `stats.updated` in `cluster.yaml`.
8. Regenerate `brain/topic-clusters.md` (the index).
9. Emit lints to `brain/log.md` (`type: lint`).

Flags:

- `--check` — zero writes; exits with code 1 if any lint of severity `block` fires or if the fingerprint diverges. Used in pre-commit and CI.
- `--dry-run` — prints the expected diff without applying.
- `--cluster=<slug>` — limits the run to one cluster.

## Role precedence

From strongest to weakest:

1. `cluster.yaml.pillar.slug == <content-slug>` → **Pillar** (emits `cluster.pillar.divergence` when the frontmatter disagrees).
2. `frontmatter.role[<cluster-slug>]` → the declared value.
3. Default → `satellite`.

## Composite operations

Atomic multi-file operations; never exposed as manual edits.

| Command | What it does |
|---|---|
| `brain-keeper rename-cluster --from=<old> --to=<new>` | Moves the folder, rewrites `slug:` in the YAML, updates N frontmatters, regenerates the brain. Lockfile + single commit. |
| `brain-keeper retire-cluster --slug=<X> [--reassign-to=<Y>]` | Removes a cluster while preserving content. Without `--reassign-to`: removes the slug from each content's `clusters: [...]` (blocks if the array would become empty). With `--reassign-to=<Y>`: replaces it. |
| `brain-keeper cluster-doctor` | Read-only diagnostic: prints drift, pending lints, conflicts. |

Promoting a brand-new cluster always goes through the Companion `approve-cluster` handoff — the agent never creates a cluster autonomously.

## Hooks

**Server-side (Web Companion).** After `POST /api/project/file` on `contents/` or `cluster.yaml`:

1. Verify the `mtime` sent by the client; on mismatch → 409 Conflict + reload + diff.
2. Apply the write.
3. Trigger `cluster-sync --cluster=<affected>` in the background.
4. Update the fingerprint.

**Pre-commit (opt-in).** Installed via `node scripts/install-cluster-sync-hook.mjs --apply`. Preserves any existing hook (concatenates). Runs `cluster-sync --check`. The Companion offers a one-time banner.

## Companion surface

The Companion sidebar exposes Topic Clusters under **Brain → Topic Clusters → \<Name\>**. The Contents section is a single table for every published piece, with multi-select filters by cluster, origin, status, and free-text search. Individual content pages remain accessible by clicking a row.

There are no per-slug subfolders under `contents/` — a content piece is a single Markdown file.
