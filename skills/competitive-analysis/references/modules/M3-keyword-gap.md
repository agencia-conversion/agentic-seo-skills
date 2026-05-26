# M3 — Keyword Gap & Striking Distance

Keywords competitors rank for in the top 20 that the target does not, plus the target's own striking-distance opportunities.

## Inputs

- `attach_m1_keyword_packets`: paths to the M1 `ranked_keywords` payloads for each player. M3 must reuse them; never re-fetch the same player.
- `gap_position_threshold`: default top 20 for competitor; target absent (no rank or rank > 100) to count as gap.
- `striking_band`: default positions 4-20 for the target.

## Compute rules

```
gap(keyword) := keyword ∈ ranked_top20(competitor_x) AND keyword ∉ ranked_top100(target)
                   for any competitor_x

striking(keyword) := keyword ∈ ranked_4_20(target)
opportunity_score(keyword) := volume(keyword) × max(0, ctr(pos1) − ctr(pos_actual))
```

Sort gap rows by `Σ_competitors (volume × ranking_intensity)` descending where `ranking_intensity = ctr(competitor_position) / ctr(target_position_or_floor)`; ties break by `volume` descending. Sort striking rows by `opportunity_score` descending.

Universe: the union of all competitors' top-20 ∪ target's top-20. Surface the universe size and the count of rows surviving the gap filter.

## Row shape (YAML)

```yaml
gap_table:
  - keyword: ""
    volume: null
    target_position: null
    competitor_positions:
      - player: ""
        position: 0
    intent_hint: informational | commercial | transactional | navigational | unknown
    serp_features_present: []
    evidence_path: project/sources/competitive/<run-slug>/dataforseo/m1/<player>.raw.json
striking_distance:
  - keyword: ""
    volume: null
    target_position: 0
    ctr_uplift_modeled: 0.0
    tag: Modelado
    curve_id: ""
universe:
  total_keywords_in_union: 0
  gap_rows: 0
  striking_rows: 0
```

## Edge cases

- Target ranks 1-3 for many cluster keywords: striking table can legitimately be small. Report it instead of padding.
- A keyword has no provider volume: keep it in gap output with `volume: null`, exclude from sort weight, list in `keywords_without_volume`.
- Multiple competitors share the same keyword: emit one row with `competitor_positions[]` listing each.
- Intent hint: only emit when provider returns `search_intent_info` or when SERP features make it unambiguous; otherwise `unknown`.

## Anti-patterns

- Computing gap by re-fetching `ranked_keywords` instead of reusing M1's packet.
- Treating `striking_distance` as a guarantee. Each row carries `tag: Modelado` and references the active CTR curve.
- Estimating "missed clicks" totals from striking distance without a transparent CTR-uplift formula.
