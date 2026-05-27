# Spec — Topic Clusters Iteração 3

Spec executável dos ajustes pedidos após validação no Companion. Cada item descreve mudança, arquivos afetados e critério de aceite.

## 1. Bug: cliques em links markdown abrem 404

Links como `[O que é SEO Agêntico?](../../conteudos/blog/o-que-e-seo-agentico.md)` dentro das subpáginas brain caem em 404 porque o navegador resolve o path relativo contra a URL atual (`/project/{token}/{slug}/../../conteudos/blog/X.md`), não contra o roteador interno do Companion.

**Solução**: interceptar cliques em links no editor TipTap (ou no renderer markdown). Quando o `href` aponta para um path relativo `.md`, normalizar para o `id` da `Page` (path absoluto do projeto, ex: `conteudos/blog/o-que-e-seo-agentico.md`), achar a page no store e navegar via `router.push(pagePath(page.slug))`.

**Arquivos**: `apps/companion/src/features/editor/editor-panel.tsx` (handler de clique) ou novo handler em `editor-extensions.ts`.

**Aceite**: clicar em qualquer link de conteúdo na tabela de subpágina de cluster abre o conteúdo no Companion. O mesmo vale para os links da tabela do índice `brain/topic-clusters.md` (coluna Pilar).

## 2. Títulos resumidos na tabela de conteúdos do cluster

Hoje a tabela `## Conteúdos` mostra o `title` completo (ex: "GEO: o que é Generative Engine Optimization e como ser citado por ChatGPT…"). O usuário quer versão curta (ex: "O que é GEO").

**Solução**: novo campo opcional `display_title:` nos satélites do `cluster.yaml`. Fallback automático: cortar antes do primeiro `:`, `—` ou `-` se a string completa for longa (>40 chars).

```yaml
satelites:
  - slug: geo-generative-engine-optimization
    display_title: "O que é GEO"
    keyword: "GEO"
    ...
```

**Arquivos**: `scripts/lib/clusters-apply.mjs` (renderer), `apps/companion/src/lib/cluster-mutations.ts` (renderer no add planned).

**Aceite**: tabela mostra "O que é GEO" em vez do título completo.

## 3. Keyword com volume entre parênteses

Coluna Keyword passa a renderizar `Keyword (Volume)` quando há volume conhecido, senão apenas `Keyword`. Ex: `GEO (1200)`. Se for hipótese (`volume: null`), só `GEO`.

**Arquivos**: `scripts/lib/clusters-apply.mjs`, `apps/companion/src/lib/cluster-mutations.ts`.

**Aceite**: linhas com volume mostram `keyword (NN)`; sem volume mostram só keyword.

## 4. Página "Produtos" no Cérebro

Adicionar `brain/produtos.md` como página canônica do brain. Permite documentar produtos da empresa (nome, descrição, links).

**Solução**:
- Acrescenta `brain/produtos.md` ao `AUTHORIAL_BRAIN_PAGES` e `BRAIN_PAGE_ORDER` no espelho TS (`apps/companion/src/lib/project-files.ts`) e no MJS (`scripts/lib/project-browser-files.mjs`).
- Template em `templates/project/brain/produtos.md` com estrutura mínima (cabeçalho + tabela vazia).
- Criar o arquivo em `project/brain/produtos.md` no projeto atual.

**Aceite**: sidebar mostra "Produtos" entre as páginas do Brain.

## 5. Criar subpáginas livremente em qualquer página do Brain

Hoje só `brain/topic-clusters/<slug>.md` aceita subpáginas. Permitir que o usuário crie subpáginas em qualquer página do brain (ex: `brain/produtos/<slug>.md`, `brain/identidade/<slug>.md`).

**Solução**:
- Endpoint `POST /api/project/file/create` ganha modo `kind: 'brain-subpage'` com `parentPath: brain/<page>.md` → cria `brain/<page>/<slug>.md`.
- Validação: aceita `brain/<dir>/<slug>.md` para qualquer `<dir>` (não só `topic-clusters`).
- UI: botão "+ Nova subpágina" ao lado de cada item brain na sidebar (ou no header da página).

**Aceite**: usuário pode criar `brain/produtos/produto-x.md` pela UI.

## 6. Tabela dinâmica (adicionar linhas via UI)

O FAB "Adicionar conteúdo planejado" já permite acrescentar linhas. Mantém. Como melhoria, expor o mesmo botão **também na tabela de conteúdos** (página de Conteúdos), com escolha do cluster destino.

## 7. Tabela de conteúdos (página geral)

Refatorar `content-index-panel.tsx`:
- **Remover** colunas: Área, Origem
- **Manter/Adicionar**: Conteúdo (só título, sem subtítulo de excerpt), Keyword, Cluster, Status
- Filtros: manter Cluster e Status. Remover Origem dos filtros (ou mover para search).
- Botão "+ Adicionar conteúdo planejado" no topo da página, abrindo o mesmo modal `AddPlannedModal` com select de cluster.

**Aceite**: tabela enxuta. Linhas mostram só o título principal (sem excerpt).

## 8. Adicionar conteúdo planejado pela tabela de Conteúdos

O modal `AddPlannedModal` ganha campo "Cluster" (select dos clusters disponíveis) quando invocado de fora da subpágina. Backend já lida (endpoint recebe slug do cluster pelo path).

**Arquivos**: `apps/companion/src/features/clusters/add-planned-modal.tsx` (campo cluster opcional), `apps/companion/src/features/contents/content-index-panel.tsx` (botão + estado).

**Aceite**: usuário adiciona conteúdo planejado a partir da tabela de Conteúdos, escolhendo o cluster.

## Execução

Em ordem:
1. **Bug 404 de links MD** (Item 1) — desbloqueia navegação. Mais urgente.
2. **Coluna Keyword com volume + display_title** (Itens 2 e 3) — mudanças em renderer.
3. **Tabela de conteúdos refatorada** (Itens 7 e 8) — mudanças em React.
4. **Página Produtos** (Item 4) — adição simples.
5. **Subpáginas livres no brain** (Item 5) — endpoint + UI.

Validação após cada bloco:
- `npm --workspace @agentic-seo-skills/companion run build` PASS.
- Testes: `test_companion_project_browser`, o teste de slugs do companion (arquivo `test_companion_project_slu`+`gs.mjs`), `test_companion_pick_cluster`, `test_topic_cluster`, `test_content_seo_process`.
- Smoke do Companion local: clicar em links, navegar, adicionar planned.
