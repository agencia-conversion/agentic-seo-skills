---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "topic-cluster"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "clusters/{{run_slug}}/cluster.json"
summary: "{{summary}}"
---

## Executive summary

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Suportes
    value: "{{support_count}}"
```

## Pillar

```agentic-table
version: 1
columns:
  - key: role
    label: Role
  - key: slug
    label: Slug
  - key: keyword
    label: Keyword
  - key: volume
    label: Volume
  - key: intent
    label: Intent
rows:
  - role: "pillar"
    slug: "{{pillar_slug}}"
    keyword: "{{pillar_keyword}}"
    volume: "{{pillar_volume}}"
    intent: "{{pillar_intent}}"
```

## Supports

```agentic-table
version: 1
columns:
  - key: role
    label: Role
  - key: slug
    label: Slug
  - key: keyword
    label: Keyword
  - key: volume
    label: Volume
  - key: intent
    label: Intent
rows:
  - role: "support"
    slug: "{{support_slug_1}}"
    keyword: "{{support_keyword_1}}"
    volume: "{{support_volume_1}}"
    intent: "{{support_intent_1}}"
  - role: "support"
    slug: "{{support_slug_2}}"
    keyword: "{{support_keyword_2}}"
    volume: "{{support_volume_2}}"
    intent: "{{support_intent_2}}"
  - role: "support"
    slug: "{{support_slug_3}}"
    keyword: "{{support_keyword_3}}"
    volume: "{{support_volume_3}}"
    intent: "{{support_intent_3}}"
```

## Apêndice: proveniência

{{provenance}}
