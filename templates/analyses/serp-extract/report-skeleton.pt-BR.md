---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "serp-extract"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/serp-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Resultados orgânicos
    value: "{{organic_count}}"
```

## Resultados orgânicos

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

## SERP features

{{serp_features}}
