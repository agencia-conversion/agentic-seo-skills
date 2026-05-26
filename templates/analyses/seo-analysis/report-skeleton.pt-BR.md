---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "seo-analysis"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/seo-analysis-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Top results
    value: "{{top_results_count}}"
```

## Top resultados

```agentic-table
version: 1
columns:
  - key: position
    label: Posição
  - key: title
    label: Título
  - key: domain
    label: Domínio
  - key: url
    label: URL
rows:
  - position: "{{position}}"
    title: "{{result_title}}"
    domain: "{{domain}}"
    url: "{{url}}"
```

## Lacunas e hipóteses

{{gaps_and_hypotheses}}

## Limitações

{{limitations}}
