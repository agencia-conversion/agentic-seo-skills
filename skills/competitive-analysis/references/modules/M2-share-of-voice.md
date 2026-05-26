# M2 — Share of Voice & SERP Universe

Modeled Share of Voice / Share of Clicks over a finite keyword universe, plus SERP feature ownership by player.

## Inputs

- `keyword_set`: one of
  - `attach_topic_cluster_ref: <seed-slug>` → reads `project/clusters/<seed>/cluster.json`.
  - `keyword_set: [...]` → explicit list.
  - `attach_keyword_research_run: <slug>` → reads normalized YAML.
- `ctr_curve_id` (optional): preferred curve id from `shared/ctr-curves/`.
- `aio_delta_curve_id` (optional): defaults to `ahrefs_2025_12_aio_deltas` when AIO is detected on ≥10% of the universe.
- `serp_features_of_interest[]` (optional): defaults to `[ai_overview, featured_snippet, people_also_ask, video, image, local_pack, shopping, sitelinks]`.

## Provider surfaces

- `POST /v3/dataforseo_labs/google/ranked_keywords/live` per player (cap at `keyword_limit`).
- `POST /v3/serp/google/organic/task_post|task_get` — reused via `attach_serp_extract_run` when available; otherwise scheduled as sub-runs.
- `shared/ctr-curves/loader.mjs#selectPrimary` + `applyDelta` when AIO detected.

## Compute rules

Define `K` = keyword universe (deduplicated, language-locked).

```
visibility(player, keyword) = ctr(position_in_player[keyword]) if 1..20 else 0
ctr is taken from the resolved primary curve; when AIO is observed on the keyword, apply applyDelta(curve, aio_delta)
volume(keyword) = provider search_volume; if null, exclude from weight denominator and add to keywords_without_volume

SoV(player) = Σ_keyword (volume(keyword) × visibility(player, keyword))
            ÷ Σ_keyword (volume(keyword) × Σ_player_all visibility(player_all, keyword))
```

`SoC_modeled(player)` is the same numerator divided by Σ volumes (no denominator share). It is reported as modeled clicks.

SERP feature ownership: count, per `serp_features_of_interest`, how many keywords have the feature owned by the player (URL inside the feature payload matches the player domain).

## Row shape (YAML)

```yaml
sov_table:
  - player: ""
    role: target | competitor
    keywords_in_top_20: 0
    keywords_in_top_3: 0
    weighted_visibility_sum: 0.0
    sov_pct: 0.0
    soc_modeled: 0.0
    tag: Modelado
    curve_id: ""
    aio_adjusted: false
serp_features_table:
  - feature: ""
    by_player:
      - player: ""
        owned_count: 0
        sample_keywords: []
keywords_without_volume:
  - ""
universe:
  source: cluster_ref | keyword_set | attach_keyword_research_run
  total: 0
  excluded_from_weight: 0
```

## Edge cases

- All keywords missing volume: emit `sov_pct: null` and a limitation; do not normalize the denominator with zero.
- Player ranks for a keyword but the provider returns position > 100: count as 0 visibility.
- AIO detection < 10% of the universe: skip AIO delta application; record the decision in `provider.ctr_curve.aio_delta_id: null` with a note.
- Duplicate keywords across language variants: dedup by exact string before computing; emit a limitation when dedup discarded > 5% of the universe.

## Anti-patterns

- Presenting `soc_modeled` as observed clicks. Always carry the `Modelado` tag.
- Computing SoV against an unbounded "all keywords in the market". Universe must be finite and named.
- Applying AIO deltas to commercial/transactional keywords without surfacing the Ahrefs methodology caveat (the delta study is informational).
- Reusing the same curve across periods when the curve `captured_at` is older than the comparison window without disclosing it.
