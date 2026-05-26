---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "technical-seo"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/{{run_slug}}/report.yaml"
summary: "{{summary}}"
score: "{{score}}"
---

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Score
    value: "{{score}}/100"
```

## Meta e indexabilidade

```agentic-table
version: 1
columns:
  - key: signal
    label: Sinal
  - key: value
    label: Valor
rows:
  - signal: Title
    value: "{{title_tag}}"
```

## Prioridades de correção

{{fix_priorities}}

## Apêndice: memória de cálculo

```agentic-table
version: 1
columns:
  - key: check
    label: Check
  - key: severity
    label: Severidade
  - key: status
    label: Status
  - key: weight
    label: Peso
    role: weight
  - key: points
    label: Pontos
    role: points
  - key: loss
    label: Perda
    role: loss
  - key: human_evidence
    label: Evidência humana
rows:
  - check: "{{check}}"
    severity: "{{severity}}"
    status: "{{status}}"
    weight: "{{weight}}"
    points: "{{points}}"
    loss: "{{loss}}"
    human_evidence: "{{human_evidence}}"
```
