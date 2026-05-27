---
title: "Companion row-drag demo"
updated: "2026-05-27"
---

# Companion row-drag demo

Fixture page for the row-drag Playwright spec. Two `agentic-clusters-by-area`
fences with different `area` params so the spec can simulate dragging the
sample cluster from `fundamentos` to `outra-area` and back.

## Fundamentos

```agentic-clusters-by-area
version: 1
area: fundamentos
order: name-asc
materialized: |-
  | Cluster | Nome | Pilar | Publicados | Planejados |
  | --- | --- | --- | --- | --- |
  | [🧪 Sample Cluster](topic-clusters/sample-cluster.md) | Sample Cluster | [Sample Pilar](../contents/blog/sample-pilar.md) | 2 | 0 |
materialized_at: 2026-05-27
materialized_fingerprint: ef6a23f4da93
```

## Outra área

```agentic-clusters-by-area
version: 1
area: outra-area
order: name-asc
materialized: _Nenhum cluster ativo nesta área._
materialized_at: 2026-05-27
materialized_fingerprint: 86abb13a04f8
```
