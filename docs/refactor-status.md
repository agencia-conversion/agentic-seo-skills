# Agentic SEO - Refactor Status

## Current state

Brain-only model is fully shipped. The skill layer, runtime CLI, helper scripts, companion server, agents, templates, and tests now use `project/brain/` as the only authorial knowledge layer. EEAT proofs live as `tipo: prova` entries in `brain/log.md` and references inside `brain/editorial.md`.

Public content lives in `project/conteudos/<origem>/<slug>.md`. Raw evidence stays in `project/sources/`, `project/audits/`, `project/workbench/`, or module-specific normalized files. Drafts and analysis stay in `project/workbench/`. Canonical report pages live in `project/analises/<module>/<run-slug>/report.md` as editable, human-first presentation Markdown governed by `skills/page-report/SKILL.md`, with YAML `version: 1` payloads in `agentic-*` fences; JSON fence bodies are legacy compatibility only. Complete non-report deliverables stay in `project/artifacts/`.

## Cluster spine layout (shipped 2026-05-25)

Topic Clusters são a espinha dorsal do plugin. Conteúdo vive em relação N:N com clusters; cada cluster ativo tem pasta própria em `project/clusters/<slug>/` (com `cluster.yaml` como fonte de verdade operacional e opcionalmente `draft.yaml` como rascunho) e subpágina autoral em `project/brain/topic-clusters/<slug>.md`. Skill `topic-cluster` opera em 4 fases (Pesquisar → Curar → Estruturar → Promover) com rascunho first-class. Conteúdo público declara `clusters: [<slug>, ...]` no frontmatter (substitui `area:` legado).

Sidebar do Companion expõe Topic Clusters em `Brain → Topic Clusters → <Nome>`. Conteúdos aparecem como tabela única com filtros por cluster, origem, status, busca textual. Conteúdos individuais continuam acessíveis ao clicar na linha da tabela.

### Decisões fixadas com o usuário em 2026-05-25

1. Editorial mantém-se como camada estratégica macro (1 área : N clusters); cluster declara `area:`; conteúdo declara `clusters:[]`.
2. Sidebar de Conteúdos vira tabela única com filtro multi-select por cluster; arquivos seguem flat em `conteudos/<origem>/<slug>.md`.
3. Skill `topic-cluster` em 4 fases estilo content-creator, com rascunho first-class.
4. Humano promove cluster novo via handoff Companion; agente atualiza cluster existente brain-first com log; pedido explícito do usuário é soberano.

### Fases shipped

- **Fase 0** — Contrato e documentação. `AGENTS.md`, `CLAUDE.md`, este arquivo atualizados.
- **Fase 1** — `scripts/migrate-clusters.mjs` (57 linhas) + helper `scripts/lib/clusters-migration.mjs` (153 linhas). `--dry-run` escreve `project/workbench/migrations/clusters-spine/plan.yaml`.
- **Fase 2** — Companion N:N. `scripts/lib/project-browser-files.mjs` aceita subpáginas brain, lê `cluster.json` legado + `cluster.yaml` novo, retorna `topic_clusters[]` array. `apps/companion/src/lib/contents.ts` espelhado em TS. `content-index-panel.tsx` renderiza lista de clusters por conteúdo.
- **Fase 3** — Skill `topic-cluster/SKILL.md` reescrita em 4 fases. Templates `templates/project/clusters/cluster.yaml.example` e `planejamento.md.example`.
- **Fase 4** — Cutover destrutivo aplicado. Tag git `pre-cluster-migration` criada; backup em `.context/backups/`. Helper `scripts/lib/clusters-apply.mjs` (237 linhas) escreve cluster.yaml, reescreve frontmatter dos 16 conteúdos, cria 5 subpáginas brain, reescreve índice, simplifica editorial.md. Idempotente.
- **Fase 5** — `brain-keeper`, `content-seo`, `agentic-seo`, `project-init` SKILL.md atualizados. Lints `cluster.table.no-gap` e `editorial.brain.cluster-cross-ref` definidos. Comando `cluster-sync` documentado. Templates `templates/project/brain/topic-clusters.md` (novo índice) e `templates/project/brain/editorial.md` (sem `### Conteúdos publicados`) atualizados.
- **Fase 6** — Limpeza e ship.

### Rollback path

Se algo escapar do refator, o rollback é:
1. `git reset --hard pre-cluster-migration` (restaura arquivos rastreados).
2. Restaurar `project/` do tarball mais recente em `.context/backups/project-pre-cluster-migration-*.tar.gz`.

### Known debt

- Handoff `approve-cluster` (template HTML) ainda não foi implementado — workflow descrito apenas na SKILL.md de `topic-cluster`. Promoção atômica fica a cargo do agente seguindo a skill.
- Falha pré-existente em `test_pt_br_diacritics.mjs` (comentários HTML em templates `voz.md` e `identidade.md` com palavras sem acento) não é introduzida pelo refator e fica como dívida de template separada.
- Falha pré-existente em `test_single_project_contract.mjs` (menções a `projects/` ou `project_slug` em `docs/project-persistence.md` e `docs/specs/topic-clusters-iteracao-3.md`) é dívida de documentação separada.

### Iteração 5 — Spinner, markdown LLM-friendly, workbench inline (2026-05-25)

- `store.ts`: `loadPage`/`savePage`/`deleteFile` aceitam `kind === 'clusterDetail'`. Itens da seção workbench passam a usar `inline: true` (sem subpáginas expandíveis na sidebar).
- `sidebar-item.tsx`: `canDelete` aceita `clusterDetail` — menu de 3 pontos mostra "Excluir" em subpáginas de cluster.
- `scripts/lib/clusters-apply.mjs`: `buildClusterSubpage` volta a incluir a seção `## Conteúdos` com tabela completa (`Papel | Conteúdo | Keyword | Intent | Status | Ação | Atualizado`). Exporta `updateContentsSection(filePath, entry, publishedByCluster)` que faz patch idempotente preservando prosa autoral em `## Resumo`, `## Tese editorial`, `## Pilar`, `## Próximas ações`, `## Evidência`.
- `apps/companion/src/lib/cluster-mutations.ts`: `regenerateSubpage` usa estratégia equivalente (patch da seção `## Conteúdos`, preserva prosa).
- `scripts/regenerate-clusters-brain.mjs`: usa `updateContentsSection` em vez de `writeBrainSubpages`. Idempotente.
- `apps/companion/src/components/listing/listing-panel.tsx`, `content-index-panel.tsx`, `clusters/cluster-detail-panel.tsx`: novo prop `embedded` no `ListingPanel` que pula `VirtualPageShell`. `ClusterDetailPanel` passa `embedded` ao `ContentIndexPanel` embarcado para evitar header duplicado.

## Layout (alvo pós-Fase 4)

```
project/
  brain/
    index.md
    identidade.md
    voz.md
    tecnologia.md
    editorial.md             # 5 áreas estratégicas macro
    topic-clusters.md        # índice curto + dashboard
    topic-clusters/
      <slug>.md              # subpágina por cluster (uma por cluster ativo)
    revisao.md
    log.md
  sources/
  conteudos/
    blog/<slug>.md           # flat; sem subpasta por slug
    linkedin/<slug>.md
    podcast/<slug>.md
    outros/<slug>.md
  clusters/
    <slug>/
      cluster.yaml           # ativo
      draft.yaml             # rascunho (até promote)
      planejamento.md
      sources/
  analises/
    <module>/<run-slug>/report.md
  artifacts/
    contents/<slug>/
  workbench/
    content/<slug>/
    topic-cluster/
    migrations/
```

## CLI commands

`bin/agentic-seo` exposes:

- `project-init` (creates the brain structure and seeds blank templates)
- `project-browser` (opens the local web companion project browser)
- `brain-lint`, `brain-approve`, `brain-ingest`
- `data-setup`, `serp-extract`, `keyword-research`, `kw-volume`, `backlink-analysis`, `seo-analysis`, `topic-cluster`, `eeat`, `content-seo`, `technical-seo`, `audit-skills`

Website creation, CMS setup, deployment setup, and frontend implementation commands are intentionally not exposed. `technical-seo` remains focused on deterministic audits of existing URLs, HTML, templates, or audit JSON.

## Log format

`brain/log.md` is append-only. Each entry uses:

```markdown
## YYYY-MM-DD - <título>

- tipo: aprovacao | decisao | errata | lint | ingestao | publicacao | prova
- escopo: <arquivo(s) | área | cluster | fonte>
- decisao: <o que mudou>
- evidencia: <wikilinks, ../sources/..., urls>
- aprovador: <nome humano | agent>
- aprovado_em: <YYYY-MM-DD opcional para entradas legadas de aprovação>
- notas: <opcional>
```

## Companion server

The browser-based decision/preview flow runs on the brain model:

- Helper module: `scripts/lib/brain-page.mjs`.
- Review target paths are `brain/<page>.md`; the only authorial pages are `index`, `identidade`, `voz`, `tecnologia`, `editorial`, `topic-clusters`.
- Missing sources detected during page review are registered as `tipo: ingestao` entries in `brain/log.md` (no separate sources catalog).
- Project browser mode: `scripts/companion.mjs project-browser` starts the Noteon-based local companion on `127.0.0.1` with a tokenized URL. It maps local Markdown files from `project/brain/`, `project/conteudos/`, `project/workbench/`, and editable report pages from `project/analises/` into the Noteon UI, keeps `brain/log.md` read-only, and autosaves editable files while logging authorial brain/report edits as `tipo: decisao`.
- `eeat` engine accepts `--mode brain` or `--mode url`.
- Data/report commands apply `page-report`, return `report_md`, and render Companion Markdown reports under `project/analises/`; legacy `report.html` files are not generated by default.
- Reports are editable in the Companion. Save uses optimistic locking, preserves report frontmatter, adds `edited_at`, and appends a `tipo: decisao` entry to `brain/log.md`; report creation and deletion remain blocked in v1.
- Project language is stored in `project/.agentic-seo/project.json.language`. The Companion exposes `GET/PATCH /api/project/settings`; UI/report copy is complete for `pt-BR` and `en`, with other report locales falling back to the closest supported language.
- Report renderers must not emit a duplicate body H1, must hide a legacy first H1 equal to frontmatter title, and must transform raw JSON/object evidence into human-readable prose or tables while linking the `source_artifact`.

## Tools

DataForSEO CLI lives in `tools/clis/dataforseo.js`. Other providers (GSC, Ahrefs, Semrush, Similarweb, Keywords Everywhere, AIROPS) remain candidates for future forks from `coreyhaines31/marketingskills`.

## Pointers

- Skill creation rubric: `skills/seo-skills-creator/references/approval-rubric.md`
- Skill loop script: `scripts/skill-loop.mjs`
- Tools registry: `tools/REGISTRY.md`
- Tool attribution: `tools/ATTRIBUTIONS.md`
- DataForSEO tool test: `tests/tools/test_dataforseo_cli.mjs`
- Brain-keeper protocol: `skills/brain-keeper/SKILL.md`
- Project-init seeding: `skills/project-init/SKILL.md`
- Companion approve-page contract: `scripts/lib/companion-types/approve-page.mjs`
- Companion project browser contract: `scripts/lib/project-browser-files.mjs`
