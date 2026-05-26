---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "internal-links"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/internal-links-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Executive summary

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Opportunities
    value: "{{recommendation_count}}"
```

## Recommendations

```agentic-table
version: 1
columns:
  - key: source_url
    label: Source
  - key: target_url
    label: Destination
  - key: anchor_text
    label: Anchor
  - key: before
    label: Before
  - key: after
    label: After
  - key: status
    label: Status
  - key: action
    label: Recommended action
rows:
  - source_url: "{{source_url}}"
    target_url: "{{target_url}}"
    anchor_text: "{{anchor_text}}"
    before: "{{before_excerpt}}"
    after: "{{after_excerpt}}"
    status: "needs_review"
    action: "{{recommended_action}}"
```

## Blocked candidates

{{blocked_candidates}}

## Limitations

{{limitations}}
