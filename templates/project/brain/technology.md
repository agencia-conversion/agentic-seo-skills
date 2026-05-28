---
title: "Tecnologia"
updated: "<YYYY-MM-DD>"
---

# Tecnologia

<!--
PROPOSITO: Stack observado e mapa de SEO técnico do site da marca. Este
arquivo e exclusivamente operacional: o que foi observado no site, o que
foi decidido, o que falta verificar. NÃO documenta opiniao editorial sobre stack
("preferimos sites estaticos", "rejeitamos WordPress", "acreditamos em
edge rendering"). Tese editorial sobre tecnologia vive em [[topic-clusters]]
ou em conteudos publicados em `contents/`. Cada linha factual aqui tem
evidência de observacao direta em ## Evidência no rodape ou ancora para
[[log]]. Comentarios <!-- REGRA: --> sao vinculantes e devem ser
REMOVIDOS quando o arquivo for preenchido.
-->

## Contexto técnico

<!--
REGRA: Cada linha = uma observacao direta com fonte. Estado observado:
o que voce viu rodando, não o que voce supos. Quando algo não foi
verificado, deixa "pendente" e registra a pendencia em
## Pendencias tecnicas. NÃO escrever "tese sobre stack" aqui.
-->

| Área | Estado observado | Evidência |
| --- | --- | --- |
| Domínio/DNS | <observado \| desconhecido> | <link ou nota> |
| Hosting/CDN | <observado \| desconhecido> | <link ou nota> |
| Frontend/CMS | <observado \| desconhecido> | <link ou nota> |
| Analytics | <observado \| desconhecido \| nenhum> | <link ou nota> |
| Rastreamento e renderização | <observado \| pendente> | <link ou nota> |
| Indexação | <observado \| pendente> | <link ou nota> |
| Dados estruturados | <observado \| pendente> | <link ou nota> |

## Decisões técnicas registradas

<!--
REGRA: Lista de decisoes tecnicas tomadas no projeto, cada uma com
ancora para a entrada correspondente em [[log]] (tipo: decisao). A
decisao em si vive no log; aqui fica apenas o titulo navegavel. NÃO
escrever justificativa editorial aqui — ela esta no log.
-->

- <decisão> — [[log#YYYY-MM-DD - título]]

## Mapa de SEO técnico

<!--
REGRA: Mapa de verificacao continua. "Ultima verificacao" exige data;
sem data, fica "pendente". "Evidência" exige link para um audit em
`project/audits/` ou para uma nota em sources/. Status:
- ok: verificado e dentro do esperado.
- gap: verificado e fora do esperado, com problema conhecido.
- pendente: ainda não verificado.
-->

| Área | Status | Última verificação | Evidência |
| --- | --- | --- | --- |
| Indexação | <ok \| gap \| pendente> | <YYYY-MM-DD ou ausente> | <link> |
| Metadados | <ok \| gap \| pendente> | | |
| Canonicals | <ok \| gap \| pendente> | | |
| Sitemap e robots | <ok \| gap \| pendente> | | |
| Dados estruturados | <ok \| gap \| pendente> | | |
| Performance | <ok \| gap \| pendente> | | |
| Links internos | <ok \| gap \| pendente> | | |

## Pendências técnicas

<!--
REGRA: Itens em aberto que demandam observacao, audit ou decisao.
Cada item em uma linha factual, sem editorializar. Quando o item for
resolvido, ele sai daqui e (se for decisao) vira entrada em
[[log]] referenciada acima.
-->

- <item>

## Evidência

<!--
REGRA: Fontes que sustentam o "Contexto técnico" e o "Mapa de SEO
técnico". Markdown links para `../audits/`, `../sources/`, e URLs
externas (ex.: relatorio do PageSpeed, snapshot do Wayback). Cada
bullet referencia 1 fonte e diz, em uma frase, o que ela sustenta.
-->

- <bullet evidência 1>
- <bullet evidência 2>
