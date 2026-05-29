---
title: "Log"
updated: "<YYYY-MM-DD>"
---

# Log

<!--
Append-only. Nunca reescreva entradas anteriores; corrija com nova entrada
`tipo: erratum` referenciando a entrada anterior por data e título.

Formato de cada entrada:

## YYYY-MM-DD - <título curto>

- tipo: approval | decision | erratum | lint | ingestion | publication | proof
- escopo: <arquivo(s) afetado(s) | área editorial | cluster | fonte>
- decisao: <o que mudou ou foi decidido>
- evidencia: <wikilinks, ../sources/..., urls>
- aprovador: <nome humano | agent | pendente>
- aprovado_em: <YYYY-MM-DD ou ausente quando pendente>
- notas: <opcional>

Tipos:
- approval: mudança em arquivo autoral do brain (identity, voice, technology,
  editorial, topic-clusters, index). Sempre exige aprovação humana
  (`aprovador: pendente` até nome humano + `aprovado_em` preenchidos).
- decision: mudança operacional registrada (escolha de stack, configuração,
  processo, mudança de rota não-estratégica).
- erratum: correção de uma entrada anterior. Referencia entrada original.
- lint: resultado de verificação automática (links quebrados, contradições,
  fontes ausentes).
- ingestion: catalogação de fonte nova em ../sources/.
- publication: registro de conteúdo publicado em ../contents/.
- proof: evidência de E-E-A-T (caso, credencial, citação, dado) que reforça
  uma área editorial ou claim específico.
-->
