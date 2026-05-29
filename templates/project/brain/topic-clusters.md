---
title: "Topic Clusters"
contract_version: 1
updated: "<YYYY-MM-DD>"
---

# Topic Clusters

Um Topic Cluster organiza um tema editorial em torno de um conteúdo pilar e satélites que cobrem subtemas relacionados. O pilar carrega a definição central do tema e ancora a rede de links internos; os satélites entram em profundidade em recortes específicos e linkam de volta para o pilar.

Topic Clusters são a espinha dorsal do projeto. Conteúdos vivem em relação N:N com clusters — um post pode pertencer a múltiplos clusters quando faz sentido editorial. Cada cluster é um manifesto `project/clusters/<slug>/cluster.yaml` (schema em `docs/specs/topic-clusters-contract.md`), nunca prosa. O bloco automático abaixo renderiza, em uma única tabela, todos os clusters ativos do projeto.

<!--
REGRA: NÃO crie seções por área editorial — o modelo tem uma única tabela plana de
clusters. O bloco `agentic-clusters` monta a tabela de todos os clusters com
`status: active`, ordenada por nome. NÃO edite o painel/índice entre as sentinelas —
ele é regenerado por `cluster-sync`. NÃO crie subpáginas `brain/topic-clusters/<slug>.md`
aqui — isso exige o handoff `approve-cluster`.
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
