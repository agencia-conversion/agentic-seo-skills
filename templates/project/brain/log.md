---
title: "Log"
updated: "<YYYY-MM-DD>"
---

# Log

<!--
Append-only. Nunca reescreva entradas anteriores; corrija com nova entrada
`tipo: errata` referenciando a entrada anterior por data e título.

Formato de cada entrada:

`## YYYY-MM-DD - <título curto>`

- `tipo`: `aprovacao` | `decisao` | `errata` | `lint` | `ingestao` | `publicacao` | `prova`
- `escopo`: `<arquivo(s) afetado(s) | área editorial | cluster | fonte>`
- `decisao`: <o que mudou ou foi decidido>
- `evidencia`: <wikilinks, `../sources/...`, urls>
- `aprovador`: <nome humano | `agent`>
- `aprovado_em`: <`YYYY-MM-DD` opcional para entradas legadas de aprovação>
- `notas`: <opcional>

Tipos:
- `aprovacao`: valor legado para aprovações antigas; novas mudanças autorais
  devem usar `tipo: decisao` com evidência e ator registrados.
- `decisao`: mudança operacional registrada (escolha de stack, configuração,
  processo, mudança de rota não-estratégica).
- `errata`: correção de uma entrada anterior. Referencia entrada original.
- `lint`: resultado de verificação automática (links quebrados, contradições,
  fontes ausentes).
- `ingestao`: catalogação de fonte nova em `../sources/`.
- `publicacao`: registro de conteúdo publicado em `../conteudos/`.
- `prova`: evidência de E-E-A-T (caso, credencial, citação, dado) que reforça
  uma área editorial ou claim específico.
-->
