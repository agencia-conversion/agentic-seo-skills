---
title: "Log"
updated: "<YYYY-MM-DD>"
---

# Log

<!--
Append-only. Nunca reescreva entradas anteriores; corrija com nova entrada
`type: erratum` referenciando a entrada anterior por data e título.

Formato de cada entrada (contract_version 2 — chaves em EN, conteúdo em
pt-BR; ver docs/specs/en-rename-map.md):

## YYYY-MM-DD - <título curto>

- type: approval | decision | erratum | lint | ingestion | publication | proof
- scope: <arquivo(s) afetado(s) | área editorial | cluster | fonte>
- decision: <o que mudou ou foi decidido>
- evidence: <wikilinks, ../sources/..., urls>
- approver: <nome humano | agent>
- approved_at: <YYYY-MM-DD opcional para entradas legadas de aprovação>
- notes: <opcional>

Tipos:
- approval: valor legado para aprovações antigas; novas mudanças autorais
  devem usar `type: decision` com evidência e ator registrados.
- decision: mudança operacional registrada (escolha de stack, configuração,
  processo, mudança de rota não-estratégica).
- erratum: correção de uma entrada anterior. Referencia entrada original.
- lint: resultado de verificação automática (links quebrados, contradições,
  fontes ausentes).
- ingestion: catalogação de fonte nova em ../sources/.
- publication: registro de conteúdo publicado em ../content/.
- proof: evidência de E-E-A-T (caso, credencial, citação, dado) que reforça
  uma área editorial ou claim específico.
-->
