---
title: "Topic Clusters"
contract_version: 1
updated: "<YYYY-MM-DD>"
---

# Topic Clusters

Um Topic Cluster organiza um tema editorial em torno de um conteúdo pilar e satélites que cobrem subtemas relacionados. O pilar carrega a definição central do tema e ancora a rede de links internos; os satélites entram em profundidade em recortes específicos e linkam de volta para o pilar.

Topic Clusters são a espinha dorsal do projeto. Conteúdos vivem em relação N:N com clusters — um post pode pertencer a múltiplos clusters quando faz sentido editorial. Contrato técnico: `docs/specs/topic-clusters-contract.md`.

Clusters são agrupados por **áreas editoriais**: camadas estratégicas macro (1 área : N clusters operacionais) que definem o território coberto pela marca. Cada área é um H2 cujo corpo é um bloco automático `agentic-clusters-by-area` que renderiza, em tabela, os clusters ativos daquela área. A tabela-índice ao final lista todos os clusters ativos do projeto com seu pilar.

<!--
REGRA (FORMATO DE TABELA, não prosa): Crie uma seção H2 por área editorial macro
(ex.: `## Fundamentos`, `## Estratégia`, `## Conteúdo`, `## Tecnologia`). O CORPO de
cada H2 é APENAS o bloco automático abaixo — sem prosa de tese/diferenciação/audiência/
provas na página do Cérebro. O renderer (`agentic-clusters-by-area`) monta a tabela dos
clusters ativos cuja `cluster.yaml.area` casa com o `area` do bloco.

## <Nome da Área>

```agentic-clusters-by-area
version: 1
area: <slug-da-area-kebab>
```

Cada cluster é um manifesto `project/clusters/<slug>/cluster.yaml` (schema em
`docs/specs/topic-clusters-contract.md`), NÃO prosa. O campo `cluster.yaml.area` aponta
para o `<slug-da-area-kebab>` do bloco. Atenção: o bloco só renderiza clusters com
`status: active`; áreas sem cluster ativo mostram "_Nenhum cluster ativo nesta área._".
NÃO edite o painel/índice entre as sentinelas — ele é regenerado por `cluster-sync`.
NÃO crie subpáginas `brain/topic-clusters/<slug>.md` aqui — isso exige o handoff
`approve-cluster`.
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
