---
title: "Topic Clusters"
contract_version: 1
updated: "<YYYY-MM-DD>"
---

# Topic Clusters

Cada Topic Cluster organiza um tema editorial em torno de um conteúdo pilar e satélites que cobrem subtemas relacionados. Use a tabela abaixo para navegar entre os clusters ativos — cada nome leva à página do cluster com a tabela completa de conteúdos publicados e planejados.

O modelo tem uma única tabela plana: todos os clusters ativos do projeto aparecem juntos, sem agrupamento por área. Cada cluster é um manifesto `project/clusters/<slug>/cluster.yaml` (schema em `docs/specs/topic-clusters-contract.md`), nunca prosa.

<!--
REGRA: NÃO crie seções por área editorial. O bloco automático `agentic-clusters`
monta a tabela de todos os clusters com `status: active`, ordenada por nome. NÃO edite
o painel/índice entre as sentinelas (regenerado por `cluster-sync`). NÃO crie subpáginas
`brain/topic-clusters/<slug>.md` aqui — isso exige o handoff `approve-cluster`.
-->

```agentic-clusters
version: 1
order: name-asc
```

<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->
## Painel

| Indicador | Valor |
| --- | --- |
| Clusters ativos | 0 |
| Conteúdos publicados | 0 |
| Satélites planejados | 0 |
| Conteúdos órfãos | 0 |
| Última sincronização | — |

## Clusters ativos

<!-- Nenhum cluster ativo. Use `topic-cluster` para criar o primeiro. -->

<!-- END cluster-index-table:auto -->

## Próximas ações

<!-- Vazio até que um cluster esteja em rascunho ou promoção. -->
