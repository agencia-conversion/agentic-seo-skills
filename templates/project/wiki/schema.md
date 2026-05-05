---
title: "Schema da Wiki"
status: approved
pillar: wiki
owner: agent
last_reviewed: null
approved_by: system
approved_at: null
sources:
  - "docs/wiki-karpathy-validation.md"
judgment_level: operational
---

# Schema da Wiki

Esta Wiki separa fontes brutas, sintese gerada, operacao e julgamento humano.

## Vault Obsidian

Abra `project/wiki/` como vault no Obsidian. A Wiki contem apenas paginas de conhecimento, mapas, sinteses, decisoes, briefings e logs.

Arquivos brutos ficam fora do vault, em `project/sources/`. Para apontar para uma fonte bruta, use link Markdown relativo, por exemplo `[entrevista](../sources/manual/arquivo.md)`. Use wikilinks Obsidian somente para paginas reais dentro de `wiki/`.

## Arquitetura inicial

```text
wiki/
  index.md
  schema.md
  eeat.md
  estrategia/
    index.md
  llm-wiki/
    index.md
  tecnologia/
    index.md
  seo-tecnico/
    index.md
  tom-de-voz/
    index.md
  conteudos/
    index.md
    topic-clusters.md
  dados-e-analise/
    index.md
  fontes/
    index.md
  log/
    index.md
```

## Tipos de pagina

- Mapa: pagina `index.md` que organiza navegacao, status e proximas leituras.
- Estrategica: contexto que muda decisoes de negocio, posicionamento, tecnologia ou tom de voz.
- Operacional: checklist, processo, backlog, decisao tecnica validada por verificacao.
- Observacional: log, fonte catalogada, dado extraido ou resultado de auditoria.
- Editorial: briefing, pauta, artigo, cluster e revisao de conteudo.

## Status

- `draft`: rascunho criado ou alterado por agente. Estado de transicao; nao deve permanecer em paginas estrategicas.
- `needs-review`: precisa de revisao humana por mudanca relevante, contradicao ou desatualizacao.
- `needs-evidence`: humano revisou e marcou que faltam fontes ou provas; bloqueia aprovacao ate que evidencias sejam coletadas.
- `approved`: aprovado explicitamente pelo humano.
- `rejected`: humano rejeitou a versao atual; agente deve reescrever.
- `archived`: preservado para historico, mas fora do contexto ativo.

A wiki nao recebe rascunho ou hipotese permanente. Hipoteses ficam em `project/workbench/` ate serem promovidas por aprovacao humana (paginas estrategicas) ou checks automaticos (paginas operacionais).

## Niveis de julgamento

- `strategic`: exige aprovacao humana.
- `editorial`: agente pode propor; humano calibra.
- `operational`: agente pode atualizar quando verificacoes passam.
- `observational`: dado factual extraido ou log.

## Links

Use links Obsidian para paginas reais da Wiki. Exemplos conceituais devem ser escritos sem colchetes duplos para nao parecerem links quebrados.

## Fontes e evidencias

- `sources/` e imutavel ou append-only.
- `wiki/fontes/index.md` cataloga fontes e aponta para caminhos em `../sources/`.
- Fatos importantes devem citar fonte ou marcar lacuna.
- Sintese de LLM deve dizer de onde veio e quando precisa de julgamento humano.

## Logs

`wiki/log/index.md` e append-only. Use um titulo por evento. Cada entrada declara um `Type`:

- `strategic-approval`: decisao humana sobre pagina estrategica (eeat, tom-de-voz, tecnologia, index e similares).
- `operational-decision`: decisao humana sobre pagina operacional ou editorial (clusters, briefings, configuracoes).

```md
## [YYYY-MM-DD] event-type | Titulo curto

- Type: strategic-approval|operational-decision
- Actor: nome-do-aprovador
- Files: [[index]]
- Decision: approved|rejected|needs-evidence
- Summary: o que mudou
- Notes: observacao opcional
```
