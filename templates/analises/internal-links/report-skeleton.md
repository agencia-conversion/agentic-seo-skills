---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "internal-links"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/internal-links-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Oportunidades
    value: "{{recommendation_count}}"
```

## Recomendações

```agentic-table
version: 1
columns:
  - key: source_url
    label: Fonte
  - key: target_url
    label: Destino
  - key: anchor_text
    label: Anchor
  - key: before
    label: Antes
  - key: after
    label: Depois
  - key: status
    label: Status
  - key: action
    label: Ação recomendada
rows:
  - source_url: "{{source_url}}"
    target_url: "{{target_url}}"
    anchor_text: "{{anchor_text}}"
    before: "{{before_excerpt}}"
    after: "{{after_excerpt}}"
    status: "needs_review"
    action: "{{recommended_action}}"
```

## Candidatos bloqueados

{{blocked_candidates}}

## Limitações

{{limitations}}
