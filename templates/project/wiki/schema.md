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

Esta Wiki separa fontes brutas, síntese gerada, operação e julgamento humano.

## Vault Obsidian

Abra `project/wiki/` como vault no Obsidian. A Wiki contém apenas páginas de conhecimento, mapas, sínteses, decisões, briefings e logs.

Arquivos brutos ficam fora do vault, em `project/sources/`. Para apontar para uma fonte bruta, use link Markdown relativo, por exemplo `[entrevista](../sources/manual/arquivo.md)`. Use wikilinks Obsidian somente para páginas reais dentro de `wiki/`.

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

## Tipos de página

- Mapa: página `index.md` que organiza navegação, status e próximas leituras.
- Estratégica: contexto que muda decisões de negócio, posicionamento, tecnologia ou tom de voz.
- Operacional: checklist, processo, backlog, decisão técnica validada por verificação.
- Observacional: log, fonte catalogada, dado extraído ou resultado de auditoria.
- Editorial: briefing, pauta, artigo, cluster e revisão de conteúdo.

## Status

- `draft`: rascunho criado ou alterado por agente. Estado de transição; não deve permanecer em páginas estratégicas.
- `needs-review`: precisa de revisão humana por mudança relevante, contradição ou desatualização.
- `needs-evidence`: humano revisou e marcou que faltam fontes ou provas; bloqueia aprovação até que evidências sejam coletadas.
- `approved`: aprovado explicitamente pelo humano.
- `rejected`: humano rejeitou a versão atual; agente deve reescrever.
- `archived`: preservado para histórico, mas fora do contexto ativo.

A wiki não recebe rascunho ou hipótese permanente. Hipóteses ficam em `project/reports/` até serem promovidas por aprovação humana (páginas estratégicas) ou checks automáticos (páginas operacionais).

## Níveis de julgamento

- `strategic`: exige aprovação humana.
- `editorial`: agente pode propor; humano calibra.
- `operational`: agente pode atualizar quando verificações passam.
- `observational`: dado factual extraído ou log.

## Links

Use links Obsidian para páginas reais da Wiki. Exemplos conceituais devem ser escritos sem colchetes duplos para não parecerem links quebrados.

## Fontes e evidências

- `sources/` é imutável ou append-only.
- `wiki/fontes/index.md` cataloga fontes e aponta para caminhos em `../sources/`.
- Fatos importantes devem citar fonte ou marcar lacuna.
- Síntese de LLM deve dizer de onde veio e quando precisa de julgamento humano.

## Logs

`wiki/log/index.md` é append-only. Use um título por evento. Cada entrada declara um `Type`:

- `strategic-approval`: decisão humana sobre página estratégica (eeat, tom-de-voz, tecnologia, index e similares).
- `operational-decision`: decisão humana sobre página operacional ou editorial (clusters, briefings, configurações).

```md
## [YYYY-MM-DD] event-type | Título curto

- Type: strategic-approval|operational-decision
- Actor: nome-do-aprovador
- Files: [[index]]
- Decision: approved|rejected|needs-evidence
- Summary: o que mudou
- Notes: observação opcional
```
