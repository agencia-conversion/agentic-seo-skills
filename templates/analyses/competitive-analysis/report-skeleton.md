---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "competitive-analysis"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/competitive-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Resumo executivo

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
  - label: Curva CTR
    value: "{{ctr_curve_id}}"
```

## Players

```agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: role
    label: Papel
  - key: type
    label: Tipo
  - key: source
    label: Origem
rows:
  - player: "{{target}}"
    role: "alvo"
    type: "{{target_type}}"
    source: "user"
```

<!-- Sections below are emitted only when the matching module status is in {complete, partial}. Drop entirely otherwise. -->

## M1. Footprint

```agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: organic_keywords
    label: Keywords orgânicas
  - key: organic_etv
    label: Tráfego estimado (ETV)
  - key: domain_rank
    label: Rank DataForSEO
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
  - label: Curva CTR
    value: "{{ctr_curve_id}}"
    tag: Modelado
  - label: Universo de keywords
    value: "{{universe_total}}"
  - label: AIO ajustado
    value: "{{aio_adjusted_keywords}}"
    tag: Modelado
```

```agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: keywords_in_top_20
    label: Keywords top 20
  - key: keywords_in_top_3
    label: Keywords top 1-3
  - key: sov_pct
    label: SoV (%) [Modelado]
  - key: soc_modeled
    label: SoC [Modelado]
rows: []
```

## M3. Keyword Gap

```agentic-table
version: 1
columns:
  - key: keyword
    label: Palavra-chave
  - key: volume
    label: Volume
  - key: target_position
    label: Pos. alvo
  - key: competitor_positions
    label: Pos. concorrentes
  - key: intent_hint
    label: Intenção
rows: []
```

## M3. Striking Distance

```agentic-table
version: 1
columns:
  - key: keyword
    label: Palavra-chave
  - key: volume
    label: Volume
  - key: target_position
    label: Posição atual
  - key: ctr_uplift_modeled
    label: Uplift [Modelado]
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
  - label: Maior delta de velocidade
    value: "{{velocity_delta_value}} ({{velocity_delta_largest_player}})"
  - label: Relatório completo
    value: "[Abrir]({{backlink_run_report_md}})"
```

## M5. Cobertura de Conteúdo

```agentic-table
version: 1
columns:
  - key: subtopic
    label: Subtópico
  - key: target
    label: Alvo
  - key: competitor_a
    label: Concorrente A
  - key: competitor_b
    label: Concorrente B
rows: []
```

## M5. Frescor

```agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: urls_total
    label: URLs no recorte
  - key: median_age_days
    label: Idade mediana (dias)
  - key: updated_within_window_pct
    label: Atualizado na janela (%)
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
    label: Δ palavras úteis
  - key: h2_delta
    label: Δ H2
  - key: schema_only_competitor
    label: Schema só no concorrente
  - key: serp_features_only_competitor
    label: SERP features só no concorrente
rows: []
```

## M7. Posicionamento e mensagem

```agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: h1
    label: H1
  - key: subhead
    label: Subhead
  - key: cta_pressure
    label: Pressão de conversão
  - key: pricing_visibility
    label: Visibilidade de preço
rows: []
```

## M7. Prova social

```agentic-table
version: 1
columns:
  - key: player
    label: Participante
  - key: proof_type
    label: Tipo de prova
  - key: excerpt
    label: Trecho (literal)
  - key: source_or_attribution
    label: Fonte
rows: []
```

## Hipóteses e próximas investigações

{{hypotheses_and_next_actions}}

## Limitações

{{limitations}}

## Próximas ações

{{next_actions}}
