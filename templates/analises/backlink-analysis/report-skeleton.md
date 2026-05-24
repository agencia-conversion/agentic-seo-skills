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
