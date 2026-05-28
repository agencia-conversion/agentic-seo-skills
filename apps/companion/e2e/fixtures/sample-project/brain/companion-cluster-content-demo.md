---
title: "Companion cluster-content demo"
updated: "2026-05-27"
---

# Companion cluster-content demo

Fixture page for the inline-edit Playwright spec. Renders the
`agentic-cluster-content` fence so the hydrator can attach editable cells
and the e2e spec can assert that writes persist to disk.

```agentic-cluster-content
version: 1
cluster: sample-cluster
materialized: |-
  | Papel | Conteúdo | Keyword (vol.) | Intenção | Status | Ação | Atualizado | Também em |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Pilar | [Sample Pilar](../../contents/blog/sample-pilar.md) | sample pilar (1.2k) | informational | Publicado | — | 2026-04-01 | — |
  | Satélite | [Sample Satellite](../../contents/blog/sample-satellite.md) | sample satellite (90) | informational | Publicado | — | 2026-04-15 | — |
materialized_at: 2026-05-27
materialized_fingerprint: 3da2cd2d5c94
```
