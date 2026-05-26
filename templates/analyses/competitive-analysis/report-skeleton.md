---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "competitive-analysis"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/competitive-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Executive summary

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Mode
    value: "{{mode}}"
  - label: Players
    value: "{{players_count}}"
  - label: Preset
    value: "{{preset}}"
  - label: CTR curve
    value: "{{ctr_curve_id}}"
```

## Players

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: role
    label: Role
  - key: type
    label: Type
  - key: source
    label: Source
rows:
  - player: "{{target}}"
    role: "target"
    type: "{{target_type}}"
    source: "user"
```

<!-- Sections below are emitted only when the matching module status is in {complete, partial}. Drop entirely otherwise. -->

## M1. Footprint

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: organic_keywords
    label: Organic keywords
  - key: organic_etv
    label: Estimated traffic (ETV)
  - key: domain_rank
    label: DataForSEO Rank
  - key: top_3
    label: Top 1-3
  - key: top_10
    label: Top 4-10
rows: []
```

## M2. Share of Voice

```agentic-kpis
version: 1
items:
  - label: CTR curve
    value: "{{ctr_curve_id}}"
    tag: Modeled
  - label: Keyword universe
    value: "{{universe_total}}"
  - label: AIO adjusted
    value: "{{aio_adjusted_keywords}}"
    tag: Modeled
```

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: keywords_in_top_20
    label: Keywords top 20
  - key: keywords_in_top_3
    label: Keywords top 1-3
  - key: sov_pct
    label: SoV (%) [Modeled]
  - key: soc_modeled
    label: SoC [Modeled]
rows: []
```

## M3. Keyword Gap

```agentic-table
version: 1
columns:
  - key: keyword
    label: Keyword
  - key: volume
    label: Volume
  - key: target_position
    label: Target pos.
  - key: competitor_positions
    label: Competitor pos.
  - key: intent_hint
    label: Intent
rows: []
```

## M3. Striking Distance

```agentic-table
version: 1
columns:
  - key: keyword
    label: Keyword
  - key: volume
    label: Volume
  - key: target_position
    label: Current position
  - key: ctr_uplift_modeled
    label: Uplift [Modeled]
rows: []
```

## M4. Link Gap (resumo)

```agentic-kpis
version: 1
items:
  - label: Link Gap rows
    value: "{{total_link_gap_rows}}"
  - label: Link Intersect rows
    value: "{{total_link_intersect_rows}}"
  - label: Largest velocity delta
    value: "{{velocity_delta_value}} ({{velocity_delta_largest_player}})"
  - label: Full report
    value: "[Abrir]({{backlink_run_report_md}})"
```

## M5. Content Coverage

```agentic-table
version: 1
columns:
  - key: subtopic
    label: Subtopic
  - key: target
    label: Alvo
  - key: competitor_a
    label: Concorrente A
  - key: competitor_b
    label: Concorrente B
rows: []
```

## M5. Freshness

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: urls_total
    label: URLs in scope
  - key: median_age_days
    label: Median age (days)
  - key: updated_within_window_pct
    label: Updated within window (%)
rows: []
```

## M6. Head-to-Head

<!-- URL mode only. -->

```agentic-table
version: 1
columns:
  - key: pair_id
    label: Par
  - key: word_count_delta
    label: Δ useful words
  - key: h2_delta
    label: Δ H2
  - key: schema_only_competitor
    label: Schema only on competitor
  - key: serp_features_only_competitor
    label: SERP features only on competitor
rows: []
```

## M7. Positioning and messaging

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: h1
    label: H1
  - key: subhead
    label: Subhead
  - key: cta_pressure
    label: Conversion pressure
  - key: pricing_visibility
    label: Pricing visibility
rows: []
```

## M7. Social proof

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: proof_type
    label: Proof type
  - key: excerpt
    label: Excerpt (literal)
  - key: source_or_attribution
    label: Source
rows: []
```

## Hypotheses and next investigations

{{hypotheses_and_next_actions}}

## Limitations

{{limitations}}

## Next actions

{{next_actions}}
