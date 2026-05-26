---
title: Topic Clusters — Contract
contract_version: 2
plugin_version: ">= 0.3.0"
status: proposal
updated: 2026-05-26
---

# Topic Clusters Contract v2

Espinha dorsal do plugin Agentic SEO. Define como Topic Clusters e Conteúdos se relacionam, são armazenados, sincronizados e consultados — por humanos (Obsidian, Web Companion) e por agentes (Claude Code, Codex, Antigravity, CLI).

Este documento é o contrato público do subsistema. Mudanças incrementam `contract_version`. A versão atual é **2** (rename de domínio pt-BR → EN, plugin 0.3).

## Migration v1 → v2

Keys renamed to align with the EN-first vocabulary in `docs/specs/en-rename-map.md`. Readers accept both forms during the transition; writers emit v2 only.

| v1 (pt-BR) | v2 (EN) |
|---|---|
| `nome` | `name` |
| `tese` | `thesis` |
| `pilar` | `pillar` (cognate alias accepted) |
| `satelite_overrides` | `satellite_overrides` |
| `papel: pilar` | `role: pillar` |
| `papel: satelite` | `role: satellite` |
| `stats.publicados` | `stats.published` |
| `stats.planejados` | `stats.planned` |
| content `origem` | content `origin` |
| content `origem: outros` | content `origin: other` |
| content `papel: { <slug>: pilar }` | content `role: { <slug>: pillar }` |

Both `cluster-sync` and the Companion `cluster-yaml` normalizer accept v1 and add v2 aliases at parse time, so downstream code can read either side. The one-off Belo Horizonte brain migration (PR 3 of the bilingual refactor) rewrites all v1 files to v2 in place.

## 1. Objetivo

Resolver "edit anywhere, sync everywhere" sobre arquivos Markdown + frontmatter, com:

- compatibilidade Obsidian zero-plugin,
- legibilidade direta por LLM (sem runtime tipo Dataview),
- CRUD bidirecional via CLI, Web Companion, e edição manual em qualquer editor,
- drift detectável e logado, nunca silenciosamente "corrigido".

## 2. Princípios

1. **Uma relação tem uma fonte única.** Drift entre fontes é lint, não merge.
2. **LLM lê um arquivo isolado e entende.** A tabela materializada vive no brain; LLM não precisa varrer 100 conteúdos.
3. **Humano edita onde faz sentido editar.** Prosa no brain, afiliação no frontmatter do conteúdo, manifest editorial no YAML.
4. **Obsidian funciona sem plugin.** Bases (core 2024+) é bônus.
5. **Sync é explícito + hook server-side.** Watchers daemon são adiados.
6. **CLI é o contrato; UI é facilidade.** Tudo é operável só por CLI.
7. **Idempotência total.** Rodar `cluster-sync` N vezes converge.

## 3. Artefatos (3 fontes)

| # | Caminho | Papel | Fonte de... |
|---|---|---|---|
| A | `project/clusters/<slug>/cluster.yaml` | Manifest editorial estruturado | Tese, pilar, planejados, overrides, evidência |
| B | `project/conteudos/<origem>/<slug>.md` | Conteúdo publicado + frontmatter | **Afiliação a clusters** (campo `clusters:`) |
| C | `project/brain/topic-clusters/<slug>.md` | Página autoral + projeção materializada | Prosa editorial + tabela read-only entre sentinels |

Plus:

- `project/brain/topic-clusters.md` — índice agregador (autoral + projeção).
- `project/clusters/<slug>/draft.yaml` — rascunho antes da promoção (mesmo schema, status diferente).
- `project/clusters/<slug>/planejamento.md` — visão humana legível, opcional.

## 4. Schema: `cluster.yaml`

```yaml
contract_version: 1
slug: seo-agentico                # kebab-case lowercase; deve casar com nome da pasta
nome: SEO Agêntico                # exibição humana, com acentos
area: fundamentos-do-seo-agentico # aponta para seção em brain/editorial.md
status: active                    # active | drafting | proposed | archived
tese: |
  Tese editorial em 1-3 parágrafos. Quem é, para quem, por que importa.

pilar:                            # obrigatório se status=active; pode ser null em drafting/proposed
  slug: o-que-e-seo-agentico      # casa com conteúdo publicado ou aponta para slug planejado
  keyword: "seo agêntico"
  intent: informational           # informational | transactional | comparative | navigational
  volume: 1200                    # número ou null
  volume_source: dataforseo:2026-04   # provider:período; null quando volume é null

planned_satellites:               # APENAS keywords sem conteúdo publicado
  - slug: agentes-de-pesquisa-seo
    keyword: "agentes de pesquisa seo"
    intent: informational
    volume: 320
    volume_source: dataforseo:2026-04
    papel: satelite               # default; quase nunca pilar
    editorial_status: draft       # draft | in-review | approved | published
    note: "considerar como pilar se o autor migrar"

satelite_overrides:               # opcional; só quando conteúdo publicado precisa de
                                  # display_title/keyword/editorial_status diferentes do título do post
  agente-de-seo:
    display_title: "O que é um agente de SEO"
    keyword: "agente de seo"
    volume: 480
    volume_source: dataforseo:2026-04
    editorial_status: published   # draft | in-review | approved | published

stats:                            # gerado por cluster-sync, não autoral
  publicados: 9
  planejados: 1
  updated: 2026-05-25

provenance:
  created_at: 2026-05-10
  created_by: agent | human
  decision_log: "log.md#cluster-seo-agentico-2026-05-10"

evidence:
  - path: clusters/seo-agentico/sources/dataforseo-keywords.json
    note: "Volume e SERP dos satélites publicados + planejados"
```

**Regras:**

- `contract_version` obrigatório no topo.
- `slug` kebab-case lowercase, ≤ 60 caracteres, casando com nome da pasta.
- `status: active` exige `pilar.slug` não-nulo. Lint `cluster.pilar.missing` (block) caso contrário.
- `satelite_overrides[<slug>]` válido apenas quando `<slug>` existe como conteúdo publicado que declara este cluster.

## 5. Schema: frontmatter de `conteudos/<origem>/<slug>.md`

```yaml
---
contract_version: 1
title: "Skills para SEO Agêntico"
slug: skills-para-seo
published_at: 2026-04-12
source_url: "https://conversion.com.br/blog/skills-para-seo"
origem: blog                      # blog | linkedin | podcast | outros
clusters: [seo-agentico, inteligencia-artificial]   # obrigatório, >=1
papel:                            # opcional
  seo-agentico: satelite          # default seria satelite; redundante mas explícito
  inteligencia-artificial: satelite
---
```

**Regras:**

- `clusters` obrigatório (mínimo 1 slug). Cada slug deve existir como pasta em `clusters/`. Caso contrário → lint `content.cluster-missing` (block no pre-commit, warn no sync).
- `papel` opcional. Ausência = `satelite`. Chave para cluster fora de `clusters:[]` = lint `content.papel-orphan`.
- `cluster.yaml.pilar.slug` apontando para este conteúdo **força** "Pilar" mesmo se `papel:` diz outro — e emite lint `cluster.pilar.divergence`.
- Conteúdo é **pilar de no máximo 1 cluster**. Violação = lint `cluster.unique-pilar` (block).

## 6. Estrutura: `brain/topic-clusters/<slug>.md`

```markdown
---
title: SEO Agêntico
contract_version: 1
updated: 2026-05-25
---

# SEO Agêntico

## Resumo
<prosa autoral livre — preservada por cluster-sync>

## Tese editorial
<prosa autoral livre — preservada>

## Pilar
<prosa autoral livre, com link explícito para o conteúdo-pilar>

<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->
## Conteúdos

| Papel | Conteúdo | Keyword (vol.) | Intenção | Status | Ação | Atualizado | Também em |
|---|---|---|---|---|---|---|---|
| Pilar | [O que é SEO Agêntico](../../conteudos/blog/o-que-e-seo-agentico.md) | seo agêntico (1.2k) | Informacional | Publicado | — | 2026-04-20 | — |
| Satélite | [Skills para SEO](../../conteudos/blog/skills-para-seo.md) | skills para seo (290) | Informacional | Publicado | — | 2026-04-12 | inteligencia-artificial |
| Planejado | _agentes de pesquisa seo_ | agentes de pesquisa seo (320) | Informacional | Planejado | Briefing | — | — |

<!-- END cluster-content-table:auto -->

## Próximas ações
<prosa autoral livre — preservada>

## Evidência
<prosa autoral livre + links a sources/ — preservada>
```

**Regras:**

- Seções fora do bloco sentineled são **autorais**: preservadas em qualquer regeneração.
- Bloco entre `<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->` e `<!-- END cluster-content-table:auto -->` é **gerado**: reescrito a cada `cluster-sync`. Edição manual é sobrescrita (v1) ou bloqueada visualmente (V2 Tiptap).
- O `## Conteúdos` heading vive **dentro** da região gerada (sentinel é a verdade do parser; heading é UX para Obsidian/humano).
- Links na coluna "Conteúdo" usam path relativo `../../conteudos/<origem>/<slug>.md` (gera backlink Obsidian + funciona em Reading mode).

## 7. Estrutura: `brain/topic-clusters.md` (índice)

```markdown
---
title: Topic Clusters
contract_version: 1
updated: 2026-05-25
---

# Topic Clusters

<prosa autoral livre — preservada>

<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->
## Painel

- **Clusters ativos:** 4
- **Conteúdos publicados:** 16
- **Satélites planejados:** 3
- **Conteúdos órfãos (sem cluster):** 0
- **Última sincronização:** 2026-05-25

## Clusters ativos

| Cluster | Área | Pilar | Publicados | Planejados |
|---|---|---|---|---|
| [SEO Agêntico](topic-clusters/seo-agentico.md) | Fundamentos | O que é SEO Agêntico | 9 | 1 |

<!-- END cluster-index-table:auto -->

## Próximas ações
<prosa autoral livre — preservada>
```

## 8. Sentinels (formato canônico)

| Sentinel | Onde | O que delimita |
|---|---|---|
| `<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->` ... `<!-- END cluster-content-table:auto -->` | subpágina | Tabela de conteúdos do cluster |
| `<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->` ... `<!-- END cluster-index-table:auto -->` | índice | Painel + tabela de clusters |

**Comportamento do parser:**

- Sentinel ausente: sync reconstrói no lugar canônico (logo após `## Pilar` na subpágina; logo após `# Topic Clusters` no índice) + emite `cluster.table.sentinel-missing`.
- Múltiplos sentinels do mesmo tipo no arquivo: sync remove todos, escreve um único, emite `cluster.table.duplicate-block`.
- `BEGIN` sem `END` correspondente: aborta sync com erro recuperável + emite `cluster.table.corrupt`.

## 9. Resolução de papel

Ordem de precedência (do mais forte ao mais fraco):

1. `cluster.yaml.pilar.slug == <conteudo-slug>` → **Pilar** (emite `cluster.pilar.divergence` se frontmatter discordar).
2. `frontmatter.papel[<cluster-slug>]` → valor declarado.
3. Default → `satelite`.

## 10. Comando `cluster-sync`

```text
brain-keeper cluster-sync [--cluster=<slug>] [--check] [--dry-run]
```

**Algoritmo:**

1. Carrega todos `clusters/*/cluster.yaml` (parse YAML).
2. Carrega frontmatter de todos `conteudos/**/*.md`. Cache invalidado por `mtime`.
3. Para cada cluster (ou só `<slug>` se `--cluster=`):
   - Determina o conteúdo-pilar via `cluster.yaml.pilar.slug`.
   - Coleta conteúdos publicados onde `clusters:[]` inclui o slug do cluster.
   - Coleta `planned_satellites[]` do YAML.
   - Resolve papel para cada linha publicada (§ 9).
   - Para cada conteúdo, calcula coluna "Também em" = `clusters:[] \ [<este-cluster>]`.
   - Aplica `satelite_overrides[]` em colunas relevantes.
   - Renderiza tabela via label dictionary do `project.json.language`.
4. Calcula fingerprint SHA-256 do output materializado.
5. Compara com `clusters/<slug>/.sync-fingerprint` (gitignored). Se idêntico → no-op.
6. Reescreve região entre sentinels na subpágina + grava fingerprint.
7. Atualiza `stats.publicados`, `stats.planejados`, `stats.updated` em `cluster.yaml`.
8. Regenera `brain/topic-clusters.md` (índice).
9. Emite lints em `brain/log.md` (`tipo: lint`).

**Flags:**

- `--check`: zero writes; exit code 1 se algum lint de severidade `block` ou se fingerprint diverge. Usado em pre-commit + CI.
- `--dry-run`: imprime diff esperado sem aplicar.
- `--cluster=<slug>`: limita a um cluster.

## 11. Catálogo de lints

| Código | Severidade | Detecção | Ação do sync |
|---|---|---|---|
| `content.cluster-missing` | block | Frontmatter declara cluster que não existe como pasta | Conteúdo gravado; tabela do cluster ausente é log |
| `content.no-clusters` | warn | Arquivo em `conteudos/` sem `clusters:[]` | Conteúdo aparece em "órfãos" no painel do índice |
| `content.cluster-fanout` | warn | Conteúdo em >= 4 clusters | Tabela em cada cluster; sinal de tagging frouxo |
| `content.papel-orphan` | warn | `papel:{<cluster>}` para cluster fora de `clusters:[]` | Ignorado |
| `cluster.pilar.divergence` | warn | `pilar.slug` aponta para conteúdo cujo `papel:` diz outro | YAML vence; warning visual |
| `cluster.pilar.missing` | block | `status: active` sem `pilar.slug` | Pre-commit falha |
| `cluster.unique-pilar` | block | Mesmo conteúdo é pilar em >= 2 clusters | Pre-commit falha |
| `cluster.planned-collision` | warn | `planned_satellites[]` colide com conteúdo publicado | Sync migra para `satelite_overrides` + `tipo: decisao` no log |
| `cluster.table.sentinel-missing` | warn | BEGIN/END ausente | Reconstrói no lugar canônico |
| `cluster.table.duplicate-block` | warn | Múltiplos sentinels do mesmo tipo | Remove todos, regrava um |
| `cluster.table.corrupt` | block | BEGIN sem END | Aborta sync |
| `cluster.slug.case-mismatch` | warn | Slug em uppercase ou mista | Sugere lowercase; sync normaliza para comparação |

## 12. Comandos compostos

Operações multi-arquivo atômicas; nunca expostas como edição manual.

| Comando | O que faz |
|---|---|
| `brain-keeper rename-cluster --from=<old> --to=<new>` | Move pasta, reescreve `slug:` em YAML, atualiza N frontmatters, regenera brain. Lockfile + commit único. |
| `brain-keeper retire-cluster --slug=<X> [--reassign-to=<Y>]` | Remove cluster preservando conteúdos. Sem `--reassign-to`: remove o slug dos `clusters:[]` de cada conteúdo (bloqueia se sobrar `[]`). Com `--reassign-to=<Y>`: substitui. |
| `brain-keeper cluster-doctor` | Diagnóstico read-only: imprime drift, lints pendentes, conflitos. |

Promoção de cluster novo continua via handoff humano `approve-cluster` (Web Companion).

## 13. Hooks

### Server-side (Web Companion)

Após `POST /api/project/file` em `conteudos/` ou `cluster.yaml`:

1. Verifica `mtime` enviado pelo cliente; mismatch → 409 Conflict + reload + diff.
2. Aplica escrita.
3. Dispara `cluster-sync --cluster=<afetado>` em background.
4. Atualiza fingerprint.

### Pre-commit (opt-in)

Instalado via `node scripts/install-cluster-sync-hook.mjs --apply`. Preserva hook existente (concatena). Roda `cluster-sync --check`. Companion oferece banner uma vez.

## 14. Performance budget

| Escala (clusters × conteúdos) | `sync` full | `sync --cluster=<X>` |
|---|---|---|
| 5 × 20 | < 200ms | < 50ms |
| 50 × 200 | < 2s | < 200ms |
| 200 × 1000 | < 10s | < 500ms |

**Implementação obrigatória:**

- Cache de frontmatter por `mtime` em `.agentic-seo/.cache/contents.json` (gitignored).
- `--cluster=` filtra conteúdos antes de parse completo.
- Bench fixture em `tests/fixtures/scale-50/` + regressão no CI.

## 15. i18n

Plugin oficial pt-BR + en (v1). Labels da tabela materializada vêm de dicionário, não hardcoded:

```typescript
const labels: Record<string, Record<string, string>> = {
  'pt-BR': { papel: 'Papel', conteudo: 'Conteúdo', keyword: 'Keyword (vol.)', intent: 'Intenção',
             status: 'Status', acao: 'Ação', updated: 'Atualizado', tambem_em: 'Também em',
             pilar: 'Pilar', satelite: 'Satélite', planejado: 'Planejado' },
  'en':    { papel: 'Role', conteudo: 'Content', keyword: 'Keyword (vol.)', intent: 'Intent',
             status: 'Status', acao: 'Action', updated: 'Updated', tambem_em: 'Also in',
             pilar: 'Pillar', satelite: 'Satellite', planejado: 'Planned' }
};
```

Mudança em `project.json.language` regenera todas as tabelas materializadas no próximo `cluster-sync`.

## 16. Cenários extremos (resumo)

Comportamentos canonical (catalogados no stress test de 2026-05-25):

- Conteúdo sem `clusters:` → órfão visível no painel; warn (não block) no save.
- Conteúdo com cluster inexistente → grava + lint block no pre-commit.
- Pilar em 2 clusters → lint block.
- Renomear cluster → comando dedicado (lockfile + atomic commit).
- Excluir cluster → comando `retire-cluster` (com reassign opcional).
- Promote com cluster novo → bloqueia; exige `approve-cluster`.
- >= 4 clusters por conteúdo → warn fanout.
- Sentinel deletado → reconstrói + lint.
- 2+ tabelas materializadas → consolida + lint.
- Planejado colide com publicado → migra campos para `satelite_overrides` + log `tipo: decisao`.
- Edição concorrente Obsidian↔Companion → mtime check + 409.
- Loop watcher↔hook → fingerprint no-op.
- Cluster ativo sem pilar → block.

## 17. Não-objetivos / V2

Conscientemente fora do v1:

- Read-only node no Tiptap para a região materializada (warning visual em v1).
- Watcher daemon local (Companion + CLI + pre-commit cobrem 95%).
- Audit trail navegável por conteúdo (git cobre).
- `display_title` rot detection automática (sync não zera; humano decide).
- Filesystem com mtime quebrado (Dropbox/iCloud) — documentado como limitação.
- Permissions/multi-user collaboration — single-user v1.
- Suporte a contratos anteriores. Plugin está em 0.2 (pre-release); sem migração legacy.

## 18. Plano de PRs

1. **PR 1: Spec + docs.** Este documento + atualização de `AGENTS.md`, `CLAUDE.md`, skills `brain-keeper`, `topic-cluster`, `content-seo`. Sem código.
2. **PR 2: Templates v1.** `.example` → `.template` em `templates/project/clusters/`. Novo `_cluster-subpage.md.template` em `templates/project/brain/topic-clusters/`. Label dictionary em `src/lib/cluster-labels.ts`.
3. **PR 3: Sync engine.** `src/commands/cluster-sync.ts` + CLI wrapper `scripts/cluster-sync.mjs`. Cache de frontmatter. Bench fixture.
4. **PR 4: Reset Florence + fixtures.** Atualiza `scripts/reset-clusters.mjs` para emitir v1 do contrato. Commit pre/post em `tests/fixtures/florence-snapshot/`. Sem suporte a migração v3→v1.
5. **PR 5: Companion server hook + UI.** `POST /api/project/file` hook + mtime check. `FrontmatterDrawer` multi-select `clusters` + `papel`. Bulk reassign na listagem de Conteúdos.
6. **PR 6: Ops compostas + pre-commit.** `cluster-rename`, `cluster-retire`, `cluster-doctor`. `install-cluster-sync-hook.mjs`.

PRs 1-4 entregam plugin 0.2 operável só por CLI. PRs 5-6 são UX/ops.

## Histórico

- `v1` (2026-05-25, plugin 0.2.0) — primeira versão pública do contrato.
- `v1.1` (2026-05-25, plugin 0.2.0) — campos adicionados sem breaking change:
  - `intent` values agora canônicos em inglês: `informational | transactional | comparative | navigational` (consumidores ainda aceitam string livre conforme `Intent` type).
  - `satelite_overrides[<slug>].editorial_status` e `planned_satellites[<i>].editorial_status` opcionais; valores `draft | in-review | approved | published`. Default: `published` para conteúdo publicado sem override, `draft` para planejado sem override.
