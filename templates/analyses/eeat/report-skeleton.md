---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "eeat"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "workbench/eeat/{{run_slug}}/report.json"
summary: "{{summary}}"
score: "{{score}}"
---

## Executive summary

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Score E-E-A-T
    value: "{{score}}/100"
```

## Score by pillar

```agentic-table
version: 1
columns:
  - key: pillar
    label: Pillar
  - key: score
    label: Score
rows:
  - pillar: Experience
    score: "{{experience_score}}"
  - pillar: Expertise
    score: "{{expertise_score}}"
  - pillar: Authority
    score: "{{authority_score}}"
  - pillar: Trust
    score: "{{trust_score}}"
```

## Prioritized gaps

```agentic-table
version: 1
columns:
  - key: gap
    label: Gap
  - key: pillar
    label: Pillar
  - key: impact
    label: Impact
  - key: action
    label: Recommended action
rows:
  - gap: "{{gap}}"
    pillar: "{{pillar}}"
    impact: "{{impact}}"
    action: "{{action}}"
```

## Limitations

{{limitations}}
