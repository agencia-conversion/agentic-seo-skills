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

## Resumo executivo

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Score E-E-A-T
    value: "{{score}}/100"
```

## Avaliação por pilar

```agentic-table
version: 1
columns:
  - key: pillar
    label: Pilar
  - key: score
    label: Score
rows:
  - pillar: Experiência
    score: "{{experience_score}}"
  - pillar: Expertise
    score: "{{expertise_score}}"
  - pillar: Autoridade
    score: "{{authority_score}}"
  - pillar: Confiança
    score: "{{trust_score}}"
```

## Lacunas priorizadas

```agentic-table
version: 1
columns:
  - key: gap
    label: Lacuna
  - key: pillar
    label: Pilar
  - key: impact
    label: Impacto
  - key: action
    label: Ação recomendada
rows:
  - gap: "{{gap}}"
    pillar: "{{pillar}}"
    impact: "{{impact}}"
    action: "{{action}}"
```

## Limitações

{{limitations}}
