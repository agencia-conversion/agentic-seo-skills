---
title: "Revisão"
updated: "<YYYY-MM-DD>"
---

# Revisão

<!--
Sede canônica de revisão deste projeto. Carrega a regra editorial universal
(jornalística imparcial, anti-IA-slop, anti-Conversion-explainer) que se
aplica a tudo em brain/ e conteudos/, mais particularidades deste projeto
que crescem com o aprendizado de revisões. Tom de voz fica em [[voz]];
schema de frontmatter e schema do log ficam na skill brain-keeper.

Como evoluir esta página:
- Estilística menor (novo termo IA-slop, novo verbo Conversion-explainer,
  typo recorrente): agente edita direto e registra `tipo: decisao` em
  [[log]] com `aprovador: agent`.
- Mudança de checklist (princípio novo, item em "Erros comuns" que muda o
  comportamento do reviewer para drafts futuros do projeto): agente
  registra `tipo: lint` em [[log]] e aguarda decisão humana antes de
  alterar esta página.
-->

## Regra editorial universal

### Voz e estrutura

- Lead na primeira frase: o que é, para quem, por quê.
- Atribuição visível: "segundo X", "documento Y diz", "conforme [[log#YYYY-MM-DD ...]]".
- Sujeito + verbo + objeto. Frases curtas.
- Sem opinião dissimulada como fato. Opinião editorial vai em [[topic-clusters]] ou em conteúdos publicados.

### Evitar

- IA-slop: "crucial", "robust", "comprehensive", "nuanced", "fundamental", "significant".
- Voz Conversion-explainer: "vamos entender", "neste artigo", "como você pode ver".
- Adjetivos promocionais sem prova: "líder", "referência", "consagrado".
- Em dashes em prosa pt-BR.

### Sempre

- Citar fonte ou marcar `gap` explicitamente.
- Preservar acentuação pt-BR: `página`, `conteúdo`, `análise`, `aprovação`, `não`.
- Wikilinks `[[...]]` apenas para arquivos reais em `brain/`. Markdown links para `../sources/`, `../conteudos/`, URLs externas.

### Bom

> "Diego Ivo é fundador e CEO da Conversion. Em diegoivo.com escreve sobre SEO Agêntico, GEO e estratégia de longo prazo. Posição editorial registrada em [[log#2026-05-07 - Brain diegoivo.com registrado]]."

### Ruim

> "Diego Ivo é uma referência consagrada e líder reconhecido em SEO. Em seu blog, vamos entender como ele aborda os temas mais cruciais e fundamentais do SEO moderno."

## Princípios de revisão deste projeto

<!-- 3-7 princípios curtos. Crescem com aprendizado das revisões. Imperativos. -->

- <princípio 1>

## Checklist estilística do projeto

<!-- Itens específicos que o reviewer verifica neste projeto. -->

- [ ] <item>

## Erros comuns observados

<!-- Cada linha é um padrão observado em ≥2 drafts. Origem aponta para a entrada de log que documentou o achado. -->

| Erro | Como evitar | Origem |
| --- | --- | --- |
| <erro> | <correção> | [[log#YYYY-MM-DD - título]] |

## O que NÃO está aqui

- Tom de voz e registro: ver [[voz]].
- Schema de frontmatter público e schema do log: skill `brain-keeper`.
- Brandbook narrativo (aposto, público, canais): ver [[identidade]].
- Clusters editoriais e teses: ver [[topic-clusters]].
