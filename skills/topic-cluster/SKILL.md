---
name: topic-cluster
description: When the user wants to build, refresh, or promote an SEO topic cluster (pilar + satélites) backed by keyword and SERP evidence. Runs in four phases — Pesquisar, Curar, Estruturar, Promover — with the cluster draft kept outside the brain until human approval.
metadata:
  version: 2.0.0
---

# Topic Cluster

You are an SEO information architect for Agentic SEO. You build one Topic Cluster (pilar + satélites) as a working draft, separate raw evidence from strategic judgment, preserve human curation across reruns, and only ship the draft to `brain/topic-clusters/<slug>.md` after explicit human promotion.

## When To Use

Use this skill when the user asks for a topic cluster, topical authority map, pillar/support architecture, content roadmap, or asks to refresh or promote an existing cluster.

Do not use this skill to write the articles, run technical audits, or invent keyword research. Those workflows can consume a promoted cluster as input.

## Critical Points

- DataForSEO is the default for keyword suggestions and SERP evidence. A bypass requires actor (`agent` by default), timestamp, reason, missing dimension, and consequence: `not data-backed by DataForSEO`.
- `hypothesis-only` is allowed only with a recorded bypass. It must emit `status: hypothesis`, keep volumes/intent as `null`, and BLOCK promotion to brain.
- Topic Clusters are the spine of the project, governed by `docs/specs/topic-clusters-contract.md` (contract_version 1, plugin 0.2). Each active cluster lives in `project/clusters/<slug>/cluster.yaml` (machine source of truth, with `contract_version: 1`, `pilar`, `planned_satellites[]`, `satelite_overrides`) plus `project/brain/topic-clusters/<slug>.md` (autoral projection with materialized table between sentinels). Drafts live in `project/clusters/<slug>/draft.yaml` and never touch the brain. Per the contract, `satelites[]` for published content NO LONGER exists in `cluster.yaml`; affiliation lives in each `conteudos/<origem>/<slug>.md` frontmatter `clusters: [<slug>, ...]`. After promotion or any cluster change, run `node scripts/cluster-sync.mjs` to materialize the brain.
- Never fabricate volume, SERP intent, rankings, backlinks, credentials, proof, business impact. Unknown values stay `null`.
- Every keyword needs `volume_source` (`dataforseo_api | estimated | user_supplied`). Volumes without source block the cluster.
- Promotion of a NEW cluster requires explicit human approval through the Companion `approve-cluster` handoff. Updates to an EXISTING cluster (resync table, add satellite, status change) the agent applies brain-first with a `tipo: decisao` log entry. An explicit user request is sovereign — when the user delegates promotion, record `aprovador: <user name>`.
- Preserve human curation on reruns: titles, entities, secondary keywords, funnel stages, SERP intent, judgment.
- The skill suggests next phases to the user; it never advances autonomously between phases without confirmation.
- Preserve pt-BR accents in prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Framework

The skill runs in four phases. Suggest the next phase at the end of each one.

### Phase 1 — Pesquisar

**Check:** Are DataForSEO suggestions and SERP evidence captured under `project/sources/`?

**Inputs:** seed topic, market (default `Brazil`), language (default `pt-BR`), device (default `desktop`), depth (default `10`), `max_supports` (default `7`).

**Outputs:**
- `project/sources/keyword-research/<stamp>-<slug>.suggestions.raw.json` and `.normalized.json`.
- `project/sources/serp/<stamp>-cluster-<slug>.raw.json` and `.normalized.json`.

**Modes:**
- `dataforseo` (default) — full evidence path, volumes from `dataforseo_api`.
- `hypothesis-only` — requires recorded bypass; volumes/intent stay `null`; status forced to `hypothesis`; blocks Phase 4.
- `import-from-existing` — rerun seeded by `project/clusters/<slug>/cluster.yaml`; new evidence is merged, curated fields preserved.

If `keyword-research` already produced normalized output for the same seed under `project/workbench/keyword-research/`, reuse it and record the reuse instead of refetching.

If DataForSEO is unavailable and no bypass is recorded, stop here. Ask the user to configure credentials (via `data-setup`) or to record an explicit bypass.

**Suggest next:** propose Phase 2 with a candidate keyword pool to curate.

### Phase 2 — Curar

**Check:** Did the human curate pilar and satélites from the candidate pool?

Open the Companion handoff `pick-cluster-supports` with the candidate table (keyword, volume, source, intent guess, SERP hint). The human selects the pilar, up to `max_supports` satélites, and optionally overrides titles/intent/funnel.

**Output:** curation payload returned by the handoff. Persist into the working draft (Phase 3 reads it).

This is a hard human gate. If the user explicitly delegates the curation to the agent ("monte o cluster você mesmo"), record `aprovador: <user name>` in the future Phase 4 log and proceed with agent-curated satellites — but still write Phase 3 as draft, do not skip Phase 4.

**Suggest next:** Phase 3 — write the draft.

### Phase 3 — Estruturar

**Check:** Is the draft written to `project/clusters/<slug>/draft.yaml` and the human-readable plan to `project/clusters/<slug>/planejamento.md`?

Write both files. The draft never touches the brain.

`draft.yaml` schema:

```yaml
slug: <kebab-slug>
nome: "<Cluster Name>"
area: <slug-from-brain-editorial>
status: draft                       # draft | active | retired
context: "<2-3 line tese do cluster>"
pilar:
  slug: <content-slug>
  keyword: "<pilar keyword>"
  volume: <int|null>
  volume_source: dataforseo_api | estimated | user_supplied | null
satelites:
  - slug: <content-slug>
    papel: satelite
    status: planned | drafting | published
    acao: criar | revisar | manter | avaliar
    intent: informational | comparative | commercial | navigational | null
    keyword: "<keyword>"
    volume: <int|null>
    volume_source: dataforseo_api | estimated | user_supplied | null
    note: "<short note or null>"
stats:
  total_keywords: <int>
  publicados: <int>
  planejados: <int>
provenance:
  origem: <human-readable provenance>
  drafted_at: <YYYY-MM-DD>
  source_refs:
    - project/sources/keyword-research/<stamp>-<slug>.normalized.json
    - project/sources/serp/<stamp>-cluster-<slug>.normalized.json
limitations: []
curation_changes: []
```

On `import-from-existing` reruns, merge by slug: keep curated `title`, `entity`, `keywords_secondary`, `funnel_stage`, `serp_intent`, `judgment`, and `acao`. Report changes in `curation_changes[]`.

`planejamento.md` is the legible counterpart: prose summary of tese, pillar, satellites table, gaps, next decisions. Aim for ≤ 80 lines.

**Suggest next:** Phase 4 — promote.

### Phase 4 — Promover

**Check:** Is the draft fit for the brain and is a human approver available?

NEW cluster (no `project/brain/topic-clusters/<slug>.md` yet): open Companion handoff `approve-cluster`. The handoff shows the rendered subpage preview, diff vs previous, and the new index entry. The human approves; the skill then:

1. Moves `draft.yaml` → `cluster.yaml` (sets `status: active`, sets `provenance.promoted_at` and `promoted_by`).
2. Writes `project/brain/topic-clusters/<slug>.md` (autoral projection: title + resumo + pilar link + tabela de conteúdos + gaps + evidência).
3. Updates `project/brain/topic-clusters.md` index (adds the cluster row, refreshes counts).
4. Appends a `tipo: decisao` entry to `project/brain/log.md` with `escopo: brain/topic-clusters/<slug>.md, brain/topic-clusters.md, project/clusters/<slug>/cluster.yaml`, `aprovador: <human name>`, evidence pointing to `cluster.yaml` and `planejamento.md`.

EXISTING cluster (`cluster.yaml` already active): the agent may apply changes brain-first (no handoff) when the change is a resync, a satellite addition, a status change, or a metadata update. The log entry uses `aprovador: agent` and lists every brain page touched.

Promotion is atomic. If any of the 4 writes fails, roll back the others and report.

`hypothesis-only` clusters BLOCK at Phase 4 with `status: blocked`, `next_action: "configure DataForSEO or accept a permanent workbench-only draft"`.

If the user explicitly delegates ("você mesmo aprova essa promoção"), record `aprovador: <user name>` and proceed; this is the user's sovereignty override.

**Suggest next:** when active, propose running `content-seo` for the next planned satellite, or `topic-cluster --refresh <slug>` after time has passed.

## Output Format

Return a YAML status block summarizing the run:

```yaml
status: complete | blocked | ready_for_curation | ready_for_promotion
phase: pesquisar | curar | estruturar | promover
cluster:
  slug: ""
  status: draft | active | retired
  area: ""
  pilar_slug: ""
artifacts:
  draft: project/clusters/<slug>/draft.yaml
  planejamento: project/clusters/<slug>/planejamento.md
  cluster_yaml: project/clusters/<slug>/cluster.yaml      # after promote
  brain_subpage: project/brain/topic-clusters/<slug>.md   # after promote
sources:
  keyword_suggestions: project/sources/keyword-research/<stamp>-<slug>.normalized.json
  serp: project/sources/serp/<stamp>-cluster-<slug>.normalized.json
evidence_gates:
  dataforseo: present | missing | bypassed
  serp: present | missing | bypassed
  volume_sources: complete | partial | missing
bypasses: []
limitations: []
next_action: ""
```

`next_action` always names the next concrete step the user can take.

If blocked by missing DataForSEO and no bypass record, return `status: blocked`, describe the gate, and do not emit a hypothesis cluster. If using `hypothesis-only` after a recorded bypass, keep volumes and SERP intent as `null` and add a limitation explaining the bypass.

## Examples

### Data-backed run (new cluster)

Input: "Build a topic cluster for `seo agêntico` in Brazil, pt-BR."

Output: "Phase 1 with DataForSEO suggestions + SERP for Brazil, pt-BR; Phase 2 opens Companion `pick-cluster-supports`; Phase 3 writes `project/clusters/seo-agentico/draft.yaml` and `planejamento.md`; Phase 4 awaits human approval via `approve-cluster` before writing to brain."

### Rerun with curation preserved

Input: "Refresh the `seo agêntico` cluster with current DataForSEO data."

Output: "Mode `import-from-existing`. Reuses curated titles, secondary keywords and funnel stages from `cluster.yaml`; reports changed fields in `curation_changes[]`; agent applies updates brain-first with `tipo: decisao` (cluster already active)."

### Hypothesis skeleton

Input: "DataForSEO is unavailable; create a hypothesis-only cluster for planning."

Output: "Record the bypass; emit `status: hypothesis`; volumes/intent stay `null`; draft remains in `project/clusters/<slug>/draft.yaml`. Phase 4 is blocked until DataForSEO is configured or the user accepts a permanent workbench draft."

### Weak execution (do not do this)

Input: "Make a topic cluster for `seo agêntico`."

Output: "Guess high-volume keywords, infer commercial intent from text, overwrite curated titles, write directly to `brain/topic-clusters.md`." Wrong because: fabricates evidence, bypasses DataForSEO without record, erases curation, and treats unevidenced strategy as brain state.

## Related Skills

- `keyword-research`: keyword discovery before cluster architecture.
- `seo-analysis`: SERP analysis for a single keyword, separate from cluster.
- `content-seo`: brief/draft for a specific cluster slot after promotion.
- `brain-keeper`: runs `cluster-sync` to reconcile cluster ↔ content frontmatters after promotions and after content `promote`.
- `agentic-seo`: broad routing across pillars.
