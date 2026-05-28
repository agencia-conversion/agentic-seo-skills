# Brain

Every Agentic SEO project keeps authorial knowledge in one place: `project/brain/`. Open it as an Obsidian vault, edit it with the Companion, or let the agent maintain it brain-first. Public content, evidence, and intermediate artifacts live outside `brain/` so the brain stays small and editable.

## Layout

```
project/
  brain/
    index.md              # map + short dashboard
    identity.md           # narrative brand book (positioning, paragraph, signature line, audience, channels)
    voice.md              # voice and register principles
    technology.md         # observed technical context + technical SEO
    topic-clusters.md     # macro editorial areas (H2) + auto-generated index of active clusters
    topic-clusters/
      <slug>.md           # one subpage per active cluster (authorial prose + materialised table)
    review.md             # canonical seat for review rules (universal + project-specific)
    log.md                # append-only, authorial
  sources/                # raw evidence, immutable
  contents/               # public output (flat files, no per-slug folders)
    blog/<slug>.md
    linkedin/<slug>.md
    podcast/<slug>.md
    other/<slug>.md
  clusters/               # source of truth for each cluster (one folder per cluster)
    <slug>/
      cluster.yaml        # active manifest
      draft.yaml          # draft before promotion (replaces cluster.yaml until promote)
      planning.md         # human-readable view
      sources/            # DataForSEO evidence specific to the cluster
  artifacts/              # complete non-report deliverables and drafts
  workbench/              # working notes before they become brain entries
```

The brain is extensible. New top-level pages such as `brain/products.md` or `brain/partnerships.md` are valid authorial pages when they:

1. Carry frontmatter `title` + `updated`.
2. Are wikilinked from `brain/index.md` or from a parent subpage index.
3. Have their creation registered as `type: decision` in `brain/log.md` with `approver: <human>`.

The Companion sidebar auto-discovers any `.md` directly under `brain/` (excluding files prefixed with `_` or `.`). The CLI commands `brain-approve` and the Companion `approve-page` flow validate both the canonical set and the extensible `brain/<name>.md` pattern.

## Frontmatter

**Brain pages.** `title`, `updated`. No `status`, `judgment_level`, `owner`, `approved_by`, `approved_at` — confidence comes from the log. This applies to `index`, `identity`, `voice`, `technology`, `topic-clusters`, `topic-clusters/<slug>`, and `review`.

**Public content** (`contents/<origin>/<slug>.md`): `title`, `slug`, `published_at`, `source_url`, `origin` (`blog | linkedin | podcast | other`), `clusters` (array of slugs that exist as folders in `project/clusters/<slug>/`), and the optional `role` (object `{cluster-slug: pillar | satellite}` when the piece plays a specific role in a cluster).

The legacy singular `area:` field on content frontmatter is no longer read. Content↔cluster affiliation lives in the `clusters: [...]` array — the single source of truth. Each cluster declares its own editorial area via `cluster.yaml.area`, pointing at an H2 section in `brain/topic-clusters.md` (1 area : N clusters).

## Authorial editing rules

- **Brain pages may be edited directly by the agent** when the evidence and the decision are recorded in `brain/log.md` as `type: decision` with `approver: agent` or a human name.
- **Creating a new cluster subpage** in `brain/topic-clusters/<slug>.md` requires human approval via the Companion `approve-cluster` handoff. The agent never creates a new cluster autonomously.
- **Updating an existing cluster subpage** (refreshing the materialised table, updating the summary, syncing affiliated content) the agent applies brain-first and logs as `type: decision`.
- **Explicit user delegation overrides defaults.** The user may delegate cluster creation to the agent, in which case the agent records `approver: <human-name>`.
- **For `review.md`:** minor stylistic additions (a new AI-slop term, a new Conversion-explainer verb, a recurring typo) auto-apply with `approver: agent`. Checklist changes (new principle, addition to "Common observed errors", any item that alters reviewer behaviour) go to `log.md` as `type: lint` and wait for human approval before touching the page.
- **Operational changes** (catalogue a source, register a lint, register a publication, note an erratum, sync cluster↔content) go straight to the `log.md` with `approver: agent` or a human name.

The log is append-only. Errata are new entries that reference the prior entry, never rewrites.

## No-gap rule (consumable for other agents)

Brain pages, public content, and reports are read by other agents in other sessions. Every file must be self-sufficient.

- Never leave `gap`, `<fill>`, `TODO`, "to be confirmed", "to be defined", `[?]`, empty table cells, or headings with no body in brain files, `contents/`, or report pages.
- When evidence is missing, do one of three things: gather more (scrape, provider call, existing source), rewrite the section without the item, or move the pending item to `brain/log.md` as `type: decision` with the criterion to reintroduce it. The authorial file stays clean.
- Mandatory structures may omit entire subsections when there is no basis. What is not allowed is a heading with `gap` in the body.

## Log types

`brain/log.md` is append-only. Each entry uses:

```markdown
## YYYY-MM-DD - <title>

- type: approval | decision | correction | lint | ingestion | publication | evidence
- scope: <file(s) | area | cluster | source>
- decision: <what changed>
- evidence: <wikilinks, ../sources/..., urls>
- approver: <human-name | agent>
- approved_at: <YYYY-MM-DD optional, for legacy approval entries>
- notes: <optional>
```

| Type | When |
|---|---|
| `approval` | Legacy compatibility for older log history. New entries use `decision` instead. |
| `decision` | A brain change, a routing decision, a cluster promotion, a strategic call. |
| `correction` | An erratum referencing a prior entry. |
| `lint` | A lint finding logged for the human to address. |
| `ingestion` | A new source catalogued under `project/sources/`. |
| `publication` | A content piece published; references the file under `project/contents/`. |
| `evidence` | A new EEAT proof catalogued; replaces older standalone `editorial.md` references. |

## Wikilinks

Use Obsidian wikilinks `[[name]]` only for real files inside `brain/`. Use standard Markdown links for `../sources/`, `../contents/`, and external URLs. The Companion renders both correctly; Obsidian uses the wikilinks for backlinks and graph view.

## Review rules (editorial)

The canonical seat for review rules is `brain/review.md`. The page carries the universal editorial rule (lead in the first sentence, visible attribution, no disguised opinion, anti-AI-slop, anti-Conversion-explainer, pt-BR accent preservation) and project-specific particulars that grow with each review. Voice and register stay in `brain/voice.md`. The `content-seo` skill loads `brain/review.md` during the `check` phase and references the page rather than duplicating it.

## Public content

Public content lives in `project/contents/<origin>/<slug>.md` as flat Markdown files — no per-slug subfolders. Drafts and reviews stay in `project/workbench/content/<slug>/` and `project/artifacts/contents/<slug>/` (workbench and artifacts remain per-slug to preserve process evidence). The `clusters:` array in the frontmatter must list cluster slugs that exist as folders in `project/clusters/<slug>/`; content with no cluster is blocked at promote.

Each content piece appears in the table of `brain/topic-clusters/<slug>.md` for every cluster it declares — an N:N denormalised relation. The full contract lives at [`specs/topic-clusters-contract.md`](specs/topic-clusters-contract.md). For a narrative tour, see [`clusters.md`](clusters.md).

## Project subfolders

Skill artifacts live in one folder per dimension per slug, separate from the brain. The brain remains the only authorial knowledge layer; these dimension folders hold provider evidence, working analysis, drafts, and per-run deliverables.

| Dimension | Canonical root | Layout |
|---|---|---|
| Content (workbench) | `project/workbench/content/<slug>/` | `research.yaml`, `competitor-evidence.yaml`, `context-evidence.yaml`, `market-consensus.md`, `brand-pov.md`, `outline.md`, `brief.yaml`, `brief.md` |
| Content (artifacts) | `project/artifacts/contents/<slug>/` | `draft.md`, `checks.yaml` |
| Content (published) | `project/contents/<origin>/<slug>.md` | single file; never a per-slug subfolder |
| Keywords | `project/keywords/<seed-slug>/` | `sources/`, `report.yaml` |
| Audits (technical-seo, seo-analysis, internal-links, backlink-analysis, serp-extract) | `project/audits/<slug>/` | `sources/`, `report.yaml` |
| Topic cluster | `project/clusters/<slug>/` | `cluster.yaml` (active) or `draft.yaml` (draft), `planning.md`, `sources/` |
| EEAT | `project/eeat/<entity-or-run-slug>/` | `sources/`, `report.md` |
| Companion reports | `project/analyses/<module>/<run-slug>/` | `report.md` |
| Brain (authorial) | `project/brain/` | direct edits allowed when recorded as `type: decision`; new cluster subpages require the `approve-cluster` handoff |

Every content production phase uses the three folders above (workbench → artifacts → contents).

Skills read the brain for context (`identity`, `voice`, `technology`, `topic-clusters`, `review`) and may write brain changes when the decision, evidence, and limitations are recorded in `brain/log.md`. `content-seo` specifically loads `brain/review.md` during the `check` phase as the canonical seat of editorial review rules, and reads `brain/topic-clusters/<slug>.md` for each cluster declared in `clusters: [...]` to extract the thesis, adjacent satellites (for internal linking), and the inherited editorial tone.

## Brain subpage templates

Brain subpages created from the Companion (the `+` button in the sidebar) or regenerated by skills load a scaffold per parent from `templates/project/brain/<parent>/_subpage-template.md`. Each file is the single source of truth for its scaffold (DRY between the TypeScript companion and the MJS skills). Minimum variables: `{{title}}`, `{{updated}}`, `{{parent_slug}}`, `{{parent_label}}`. The `topic-clusters` template accepts extra placeholders (`{{heading}}`, `{{resumo}}`, `{{area}}`, `{{pillar_line}}`, `{{contents_table}}`, `{{next_actions}}`, `{{provenance}}`) used by the cluster sync when projecting from `cluster.yaml`.

To edit a parent's scaffold: change the template file and regenerate via `node scripts/regenerate-clusters-brain.mjs` (for clusters) or simply create a new subpage from the UI (for the other parents).
