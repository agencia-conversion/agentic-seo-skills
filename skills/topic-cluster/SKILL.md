---
name: topic-cluster
description: Build SEO topic clusters with entity, primary keyword + volume, secondary keywords with volume, funnel stage, and SERP-derived intent. Default path uses DataForSEO keyword suggestions and SERP batches; --hypothesis-only emits a curatable skeleton without provider calls.
---

# Topic Cluster

Use this skill when the user asks for clusters, topical authority, content architecture, pillar pages, or SEO roadmap structure.

Read first when needed:

- `skills/keyword-research/SKILL.md`
- `skills/_shared/references/operating-model.md`
- `project/wiki/conteudos/topic-clusters.md` when present.

## Contract

Inputs:

- `--seed "X"` (required) — the term that anchors the cluster.
- `--max-supports N` (default 7) — number of supporting pages drawn from the suggestions pool.
- `--language pt-BR`, `--location Brazil`, `--device desktop`, `--depth 10` — DataForSEO query parameters.
- `--mode live|standard|async|offline` — DataForSEO call mode.
- `--hypothesis-only` — skip provider calls; emit a curatable skeleton with null volumes/intent.
- `--render-only` — re-render `wiki/conteudos/topic-clusters.md` from the existing JSONs without re-fetching data.

Writes only:

- `project/sources/keyword-research/<stamp>-<slug>.suggestions.{raw,normalized}.json`
- `project/workbench/keyword-research/<stamp>-<slug>.suggestions.json`
- `project/sources/serp/<stamp>-cluster-<slug>.{raw,normalized}.json`
- `project/workbench/topic-cluster/<seed-slug>.json`
- `project/wiki/conteudos/topic-clusters.md` (auto-generated, projection of all cluster JSONs)

## Hard Precondition

Production-grade clusters use DataForSEO suggestions and SERP batch evidence. If credentials are missing, or `--hypothesis-only` is explicit, emit a cluster with `status: hypothesis` and null metrics rather than fabricating data.

## Required Behavior

- Default path runs DataForSEO `keyword_suggestions` for the seed and a SERP batch (`serp/google/organic`) for pillar + selected supports. The SERP listing alone is enough; do not fetch article HTML.
- Each page (pillar and support) carries `role`, `slug`, `title`, `entity`, `keyword_principal: { keyword, volume }`, `keywords_secondary: [{ keyword, volume }]`, `funnel_stage`, `serp_intent`, `judgment`, `serp_evidence: { provider, organic_top, serp_features } | null`.
- Supports are picked from the suggestions pool sorted by volume; the agent then revises titles, entities, and selects which `keywords_secondary` to attach to each support from the same pool. The full pool stays in `keyword_pool` for reference.
- `serp_intent` is classified by the agent reading `serp_evidence` (organic top 5 + serp_features). The CLI never auto-classifies based on title heuristics.
- Re-runs preserve curation: title, entity, keywords_secondary, funnel_stage, serp_intent, judgment merge from the existing JSON by page slug. Pages no longer in the fresh top-N are kept as carry-over so agent-added supports survive.
- The Wiki page is regenerated as a projection of every JSON in `workbench/topic-cluster/`. Edit the JSONs, not the Wiki.
- `--hypothesis-only` emits an empty support list, null volumes, and null `serp_intent`; status is `hypothesis`. Use it when DataForSEO is not configured or for early ideation.

## Done Criteria

- Cluster JSON has `status` in `{draft, hypothesis}`.
- Pillar exists with `keyword_principal.keyword` populated. In `draft`, `keyword_principal.volume` is a number; in `hypothesis`, it can be `null`.
- Each supporting page has the seven judgment fields above (nulls allowed in `hypothesis`; in `draft`, the agent must fill `entity`, `keywords_secondary`, `funnel_stage`, and `serp_intent` before promoting).
- Provenance records suggestions and SERP providers (or carries `hypothesis_only: true`).
- `wiki/conteudos/topic-clusters.md` reflects the JSONs and renders the seven required columns: Papel, Entidade, KW principal, Volume, KW Secundárias, Funil, Intenção de Busca.
