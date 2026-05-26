---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "keyword-research"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "keywords/{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Keywords
    value: "{{keyword_count}}"
```

## Keywords

```agentic-table
version: 1
columns:
  - key: keyword
    label: Keyword
  - key: volume
    label: Volume
  - key: cpc
    label: CPC
  - key: competition
    label: Competição
rows:
  - keyword: "{{keyword}}"
    volume: "{{volume}}"
    cpc: "{{cpc}}"
    competition: "{{competition}}"
```

## Nota

{{note}}
