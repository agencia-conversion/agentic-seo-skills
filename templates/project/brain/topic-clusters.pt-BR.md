---
title: "Topic Clusters"
contract_version: 1
updated: "<YYYY-MM-DD>"
---

# Topic Clusters

Cada Topic Cluster organiza um tema editorial em torno de um conteúdo pilar e satélites que cobrem subtemas relacionados. Use a tabela abaixo para navegar entre os clusters ativos — cada nome leva à página do cluster com a tabela completa de conteúdos publicados e planejados.

Clusters são agrupados por **áreas editoriais**. Cada área é um H2 cujo corpo é APENAS o bloco automático `agentic-clusters-by-area` (formato de tabela, não prosa), que renderiza os clusters ativos daquela área.

<!--
REGRA (FORMATO DE TABELA): Crie um H2 por área editorial e ponha SÓ o bloco automático
no corpo. O renderer monta a tabela dos clusters com `cluster.yaml.area` igual ao `area`
do bloco e `status: active`. Cada cluster é um manifesto `project/clusters/<slug>/cluster.yaml`
(schema em `docs/specs/topic-clusters-contract.md`), nunca prosa.

## <Nome da Área>

```agentic-clusters-by-area
version: 1
area: <slug-da-area-kebab>
```

NÃO edite o painel/índice entre as sentinelas (regenerado por `cluster-sync`). NÃO crie
subpáginas `brain/topic-clusters/<slug>.md` aqui — isso exige o handoff `approve-cluster`.
-->

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
