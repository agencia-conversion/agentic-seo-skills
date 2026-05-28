---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "seo-analysis"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/seo-analysis-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Executive summary

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Top results
    value: "{{top_results_count}}"
```

## Top results

```agentic-table
version: 1
columns:
  - key: position
    label: Position
  - key: title
    label: Title
  - key: domain
    label: Domain
  - key: url
    label: URL
rows:
  - position: "{{position}}"
    title: "{{result_title}}"
    domain: "{{domain}}"
    url: "{{url}}"
```

## Gaps and hypotheses

{{gaps_and_hypotheses}}

## Limitations

{{limitations}}
