---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "backlink-analysis"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/backlinks-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Backlinks
    value: "{{backlinks}}"
  - label: Domínios ref.
    value: "{{referring_domains}}"
  - label: Rank
    value: "{{rank}}"
  - label: Spam
    value: "{{spam}}"
```

## Comparativo

```agentic-table
version: 1
columns:
  - key: target
    label: Target
  - key: backlinks
    label: Backlinks
  - key: referring_domains
    label: Domínios ref.
  - key: rank
    label: Rank
  - key: spam
    label: Spam
rows:
  - target: "{{target}}"
    backlinks: "{{backlinks}}"
    referring_domains: "{{referring_domains}}"
    rank: "{{rank}}"
    spam: "{{spam}}"
```

## Amostra de backlinks

{{backlink_sample}}

<!-- The sections below are emitted only when mode == multi-competitor. Drop them entirely on single-mode reports. -->

## Link Gap

```agentic-table
version: 1
columns:
  - key: referring_domain
    label: Domínio referenciador
  - key: intersect_strength
    label: Força do overlap
  - key: rank
    label: Rank
  - key: observed_on
    label: Observado em
  - key: first_seen
    label: Primeiro registro
  - key: sample
    label: Backlink de amostra
rows: []
```

## Link Intersect

```agentic-table
version: 1
columns:
  - key: referring_domain
    label: Domínio referenciador
  - key: anchors_target
    label: Âncoras (alvo)
  - key: anchors_competitors
    label: Âncoras (concorrentes)
  - key: backlinks_target
    label: Backlinks (alvo)
  - key: backlinks_competitors
    label: Backlinks (concorrentes)
rows: []
```

## Anchor Distribution

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: branded
    label: Marca (%)
  - key: exact_match
    label: Exato (%)
  - key: partial_match
    label: Parcial (%)
  - key: naked
    label: URL nua (%)
  - key: generic
    label: Genérico (%)
  - key: image_or_empty
    label: Imagem/vazio (%)
rows: []
```

## Quality Mix

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: editorial
    label: Editorial
  - key: directory
    label: Diretório
  - key: ugc
    label: UGC
  - key: news
    label: Imprensa
  - key: suspected_spam_network
    label: Spam suspeito
  - key: unknown
    label: Desconhecido
rows: []
```

## Velocidade de aquisição

```agentic-kpis
version: 1
items:
  - label: Janela
    value: "{{time_window_days}} dias"
  - label: Novos RDs (alvo)
    value: "{{target_new_rds}}"
  - label: Perdidos RDs (alvo)
    value: "{{target_lost_rds}}"
```

```agentic-chart
version: 1
type: bar
x_label: Player
y_label: RDs (novos vs perdidos)
series:
  - name: Novos
    data: []
  - name: Perdidos
    data: []
```

## Page-Level Link Gap

<!-- URL mode only. Drop on domain mode. -->

```agentic-table
version: 1
columns:
  - key: target_url
    label: URL alvo
  - key: competitor_url
    label: URL concorrente
  - key: rds_only_competitor
    label: RDs só no concorrente
  - key: sample
    label: Backlink de amostra
rows: []
```

## Brand Mention Gap

<!-- Optional. Drop if --with-brand-mentions was not active. -->

```agentic-table
version: 1
columns:
  - key: domain
    label: Domínio
  - key: page_url
    label: Página
  - key: mentions_competitor
    label: Menciona concorrente
  - key: excerpt
    label: Trecho
rows: []
```

## Riscos e próximos passos

{{risks_and_next_actions}}
