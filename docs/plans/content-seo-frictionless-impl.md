# Content SEO sem fricção — spec detalhado de implementação

Status: ativo
Plano-pai: `docs/plans/content-seo-frictionless.md`
Escopo deste run: Fase 1 inteira + Fase 2 parcial + Fase 4 parcial

## 1. Princípios de implementação

- Toda mudança em `src/seo-brain.ts` mantém retrocompatibilidade: comandos e flags antigos continuam funcionando idênticos. Novos modos são opt-in via flag.
- Suite de testes existente (`npm test`) deve continuar passando sem alteração. Novos testes vêm em arquivos novos.
- Módulos JS novos vão em `scripts/lib/preflight/*.mjs` (linear, fixture-driven, ≤200 linhas cada — alinhado com CLAUDE.md "TypeScript vs MJS").
- Mudanças nas skills markdown são aditivas: nenhum gate existente desliga sem flag explícita.

## 2. Fase 1 — quick wins

### 2.1 CLI `--help` funcional

**Arquivo:** `src/seo-brain.ts`.

**Mudança em `parseArgs`:** quando `command === "--help"` ou `command === "-h"` ou `!command`, redirecionar para um help-renderer ao invés de lançar `Unknown command`. Quando `args.help === true`, render help do subcomando.

**Tabela de descrições:**

```typescript
const COMMAND_HELP: Record<string, { summary: string; flags?: Array<{ flag: string; desc: string }> }> = {
  "project-init": { summary: "Initialize project skeleton with Wiki and sources/ folders." },
  "wiki-lint": { summary: "Run structural checks against project/wiki/." },
  "seo-analysis": {
    summary: "Compare SERP top results, extract competitor evidence, emit briefing data.",
    flags: [
      { flag: "--keyword <text>", desc: "Required. Target keyword." },
      { flag: "--provider <dataforseo|websearch|auto>", desc: "Default: auto." },
      { flag: "--fetch-pages", desc: "Fetch top 3 URLs and extract headings." },
      { flag: "--player-score", desc: "Score a target URL/domain against the SERP." },
    ],
  },
  "content-seo": {
    summary: "Run public-content briefing/approval/write/check/promote pipeline.",
    flags: [
      { flag: "--topic <text>", desc: "Required. Article topic." },
      { flag: "--keyword <text>", desc: "Optional. Defaults to topic." },
      { flag: "--phase <preflight|brief|approve|write|review|check|promote>", desc: "Default: brief." },
      { flag: "--auto", desc: "After preflight approval, run brief→write→check→promote in sequence." },
      { flag: "--decisions <path>", desc: "Path to approved decisions.yaml; required with --auto." },
      { flag: "--dry-run", desc: "Run pipeline without promoting to wiki/conteudos/." },
    ],
  },
  // ... (todos os subcomandos)
};
```

**Comportamento:**

- `seo-brain` (sem args) → render help geral (lista de subcomandos com summary, link para `--help <cmd>`).
- `seo-brain --help` → idem.
- `seo-brain content-seo --help` → render help do subcomando com flags e exemplos.
- Saída em texto simples (não JSON), via `process.stdout.write`. Usar JSON só se `--json` for passado.

**Critério de aceitação:** comando `seo-brain --help` retorna exit code 0 e texto com pelo menos `project-init`, `seo-analysis`, `content-seo`. `seo-brain content-seo --help` retorna exit 0 e texto contendo `--phase` e `--auto`.

### 2.2 Detecção de canibalização em `seo-analysis`

**Arquivo:** `src/seo-brain.ts`, função `commandSeoAnalysis`.

**Origem do publisher domain:**

1. Tentar ler `project/wiki/index.md` frontmatter, campo `publisher.domain` ou `site.domain`.
2. Fallback: tentar `project/web/lib/site.ts`, regex `url:\s*['"](https?://[^'"]+)['"]`.
3. Fallback: `project/.seo-brain/project.json`, campo `publisher_domain`.
4. Se nenhum encontrado, emitir `cannibalization_report.publisher_domain: null` e `cannibalization_report.note: "publisher_domain not configured"`. Sem bloqueio.

**Schema do report (adicionado a `report` em commandSeoAnalysis):**

```yaml
cannibalization_report:
  publisher_domain: diegoivo.com   # ou null
  matches:
    - position: 2
      url: https://diegoivo.com/p/autoatribuicao
      domain: diegoivo.com
      severity: high   # rank 1-3 = high; 4-10 = medium; 11+ = low
  recommendation: refresh-existing  # consolidate-301 | coexist-canonical | refresh-existing | abort | none
  note: "Domain ranks at position 2; publishing a competing URL risks cannibalization."
```

**Regras de recomendação:**

- Se `matches` vazio → `recommendation: none`, sem severity.
- Se primeiro match em posição 1-3 → `severity: high`, `recommendation: refresh-existing`.
- Se primeiro match em posição 4-10 → `severity: medium`, `recommendation: coexist-canonical`.
- Se primeiro match em posição 11+ → `severity: low`, `recommendation: coexist-canonical`.

**Critério de aceitação:** rodar `seo-analysis --keyword "X" --serp-file fixtures/serp-with-cannibal.json` produz `cannibalization_report.matches[0].severity === "high"` quando o publisher domain bate com top-3.

### 2.3 Voice draft-as-guide

**Arquivo:** `src/seo-brain.ts`, função `validateContextEvidenceForApproval`.

**Mudança:** aceitar `voice_status: "approved"` ou `"draft-as-guide"`. Quando `draft-as-guide`, registrar uma entrada em `brief.limitations[]`: `"Tom de voz consumido em modo draft-as-guide. Aprovação formal pendente."`.

**Schema atualizado:**

```yaml
context_evidence:
  voice_evidence:
    status: approved | draft-as-guide | missing
    path: project/wiki/tom-de-voz/index.md
    notes: ...
```

**Quando bloqueia:** apenas se `status: missing` (página não existe). `draft-as-guide` é opt-in pelo agente quando o markdown existe mas tem `status: draft` no frontmatter.

**Critério de aceitação:** brief com `voice_evidence.status: draft-as-guide` é aprovável (não lança CliError) e o `brief.limitations` carrega a nota.

## 3. Fase 2 — preflight + decisions.yaml + --auto

### 3.1 Estrutura de módulos

```
scripts/lib/preflight/
  index.mjs              # entry point: runPreflight({...}) → decisions
  wiki-context.mjs       # readWikiContext({projectDir}) → {pages, hashes, voice_status, eeat_status}
  serp-cannibalization.mjs # already produced by seo-analysis; this module reads the report
  voice-resolver.mjs     # resolveVoicePolicy({wikiPath}) → {status, recommendation}
  decisions-builder.mjs  # buildDecisions({wikiContext, seoReport, args}) → decisions object
  fixtures/              # for tests
```

**Tamanho-alvo:** cada arquivo ≤ 150 linhas. Total ≤ 600 linhas.

### 3.2 Schema do `decisions.yaml`

Versão 1, congelado para este run:

```yaml
schema_version: 1
generated_at: 2026-05-06T18:00:00Z
project_root: /path/to/project
keyword: o que é autoatribuição
keyword_slug: o-que-e-autoatribuicao
topic: Autoatribuição
topic_slug: o-que-e-autoatribuicao

skyscraper:
  target_words: 2000
  formula: max(top_3_max * 1.2, floor=2000)
  competitor_max: 1516
  formula_value: 1819
  applied: floor

cannibalization:
  detected: true
  publisher_domain: diegoivo.com
  matches: [{ position: 2, url: https://diegoivo.com/p/autoatribuicao }]
  recommendation: refresh-existing
  user_decision: null   # null | consolidate-301 | coexist-canonical | refresh-existing | abort | proceed-anyway

voice:
  status: draft-as-guide   # approved | draft-as-guide | missing
  path: project/wiki/tom-de-voz/index.md
  user_decision: null   # null | use-draft | block-until-approved

eeat:
  status: needs-review   # approved | needs-review | empty
  signals_available: { experience: 2, expertise: 3, authority: 0, trust: 1 }
  gaps: [authority]
  user_decision: null   # null | use-current | refresh-eeat

brand_mention:
  policy: omit          # omit | use-with-domain | use-without-domain
  rationale: "Publisher domain appears in SERP top results; omitting reduces forbidden-term risk."
  user_decision: null

publication_target:
  wiki: project/wiki/conteudos/<slug>.md
  web: project/web (data-driven render via [slug] route)
  user_decision: null   # null | confirm | wiki-only | web-only

internal_actions:
  - { task: "write brief artifacts", owner: agent }
  - { task: "write draft to artifacts/", owner: agent }
  - { task: "run publication checks", owner: agent }
  - { task: "promote to wiki/conteudos/", owner: agent }
  - { task: "register in web/lib/site.ts", owner: agent }

external_actions: []   # populated by canniba/voice/eeat decisions

approval:
  status: pending   # pending | approved | rejected
  approved_by: null
  approved_at: null
  notes: null
```

### 3.3 `runPreflight` contrato

```typescript
async function runPreflight({
  projectDir: string,
  topic: string,
  keyword?: string,
  args: AnyRecord,
}): Promise<{ decisions: object, decisionsPath: string }>
```

Passos:

1. Resolve slugs.
2. Lê `seo-analysis` report; se não existir e `--auto-analyze` for passado, dispara `commandSeoAnalysis` internamente; senão registra `analysis_missing` e segue com defaults menos confiáveis.
3. Chama `readWikiContext` (paths, hashes, statuses).
4. Constrói `decisions` via `decisions-builder`.
5. Escreve em `project/workbench/content/<slug>/decisions.yaml`.
6. Retorna o objeto + caminho.

### 3.4 Subcomando `content-seo --phase preflight`

Adicionar branch novo no início de `commandContentSeo`:

```typescript
if (phase === "preflight") {
  const result = await runPreflight({ projectDir: p, topic, keyword, args });
  printJson({ ok: true, phase: "preflight", decisions_path: result.decisionsPath, decisions: result.decisions });
  return;
}
```

### 3.5 Modo `--auto`

Adicionar branch antes do `phase === "brief"`:

```typescript
if (args.auto) {
  const decisionsPath = String(args.decisions || "");
  if (!decisionsPath || !fs.existsSync(decisionsPath)) {
    throw new CliError("--auto requires --decisions <path>; run --phase preflight first.");
  }
  const decisions = readYaml(decisionsPath);
  if (decisions.approval?.status !== "approved") {
    throw new CliError("decisions.yaml must have approval.status: approved before --auto runs.");
  }
  await runAutoPipeline({ projectDir: p, decisions, dryRun: !!args.dry_run });
  return;
}
```

**`runAutoPipeline` semantics:**

1. Chama brief phase.
2. Chama approve phase com `approved_by: decisions.approval.approved_by`.
3. (approve já gera draft.)
4. Chama check phase.
5. Se check passa e `dryRun` é false → chama promote.
6. Se check passa e `dryRun` é true → para com `{ ok: true, phase: "auto", dry_run: true, draft_path, check_path }`.
7. Se check falha → para com erro detalhado.

**Critério de aceitação:**

- `seo-brain content-seo --topic "Test" --keyword "test" --phase preflight` produz `decisions.yaml` válido contra o schema.
- Com `decisions.approval.status: approved`, `seo-brain content-seo --auto --decisions <path> --dry-run` roda brief+write+check sem promover; sai com exit 0 e draft em `artifacts/contents/`.
- Sem `--dry-run`, promove para `wiki/conteudos/` (testar com slug temporário).

## 4. Fase 4 parcial — render data-driven

**Decisão de escopo:** atualizar o template gerado por `next-website-creator` (não tocar em `brain-playground/2/web` real). O QA testa criando um projeto novo num temp dir.

### 4.1 Arquivos no template

**`web/lib/article-loader.ts`:**

```typescript
import fs from "node:fs";
import path from "node:path";

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  status: string;
  date?: string;
  excerpt?: string;
  author?: { name: string; role?: string };
  canonical?: string;
  [key: string]: any;
}

export interface Article {
  frontmatter: ArticleFrontmatter;
  body: string;          // raw markdown (without frontmatter)
  html: string;          // rendered HTML (basic markdown subset)
}

export function loadPublishedArticles(wikiDir: string): Article[] { ... }
export function loadArticleBySlug(wikiDir: string, slug: string): Article | null { ... }
```

Renderer markdown: subset implementado em ≤80 linhas — headings (h1-h3), parágrafos, listas, links, ênfase, blockquotes. Sem dependência externa.

### 4.2 Rota dinâmica

**`web/app/blog/[slug]/page.tsx`:**

```tsx
import { notFound } from "next/navigation";
import { loadArticleBySlug, loadPublishedArticles } from "@/lib/article-loader";

const wikiDir = path.join(process.cwd(), "..", "wiki", "conteudos");

export function generateStaticParams() {
  return loadPublishedArticles(wikiDir).map((a) => ({ slug: a.frontmatter.slug }));
}

export function generateMetadata({ params }) {
  const article = loadArticleBySlug(wikiDir, params.slug);
  if (!article) return {};
  return {
    title: article.frontmatter.title,
    description: article.frontmatter.excerpt,
    alternates: { canonical: `/blog/${params.slug}/` },
    robots: { index: true, follow: true },
  };
}

export default function ArticlePage({ params }) {
  const article = loadArticleBySlug(wikiDir, params.slug);
  if (!article) notFound();
  return <main><article dangerouslySetInnerHTML={{ __html: article.html }} /></main>;
}
```

### 4.3 Promote atualiza `web/lib/site.ts`

Função nova em `src/seo-brain.ts`: `updateSiteArticleEntry(projectDir, slug, frontmatter)`. Chamada na phase `promote` se `web/lib/site.ts` existir.

Critério: idempotente. Se entrada já existe, atualiza status. Se não, adiciona ao array.

### 4.4 Critério de aceitação Fase 4

- `next-website-creator` gera template com `web/lib/article-loader.ts`, rota `[slug]/page.tsx`, `web/lib/site.ts` lendo de wiki.
- Em projeto de teste com `wiki/conteudos/test-article.md` (status: published), `next build` passa.
- Promote num projeto recém-criado adiciona o slug a `web/lib/site.ts`.

## 5. Critérios de QA (consolidado)

### 5.1 Testes determinísticos (CLI)

| ID | Comando | Esperado |
|---|---|---|
| QA-1.1 | `seo-brain --help` | exit 0, texto com lista de subcomandos |
| QA-1.2 | `seo-brain content-seo --help` | exit 0, texto com `--auto` e `--phase` |
| QA-1.3 | `seo-brain seo-analysis --keyword "X"` com fixture cannibal | `cannibalization_report.severity: high` |
| QA-1.4 | brief com `voice_status: draft-as-guide` | aprovação não lança erro |
| QA-2.1 | `content-seo --phase preflight --topic "Y"` | `decisions.yaml` válido |
| QA-2.2 | `content-seo --auto --decisions <approved> --dry-run` | exit 0, draft em artifacts/, sem wiki/conteudos/ tocado |
| QA-2.3 | `--auto` sem `decisions.approval.status: approved` | exit 1 com erro claro |
| QA-4.1 | `next-website-creator` em temp dir | gera article-loader.ts, [slug]/page.tsx |
| QA-4.2 | `next build` em projeto com 1 article published | exit 0 |

### 5.2 Não-regressão

- `npm test` continua passando inteiro (todos os ~30 testes).
- `node scripts/validate_skills.mjs` passa.
- `node scripts/smoke_test.mjs` passa.

### 5.3 Lint estrutural das skills

- `skills/content-seo/SKILL.md` e referências mantêm contrato declarado.
- `skills/seo-brain/SKILL.md` mantém router walls.

### 5.4 Critério "100% aprovado"

Todos os 9 itens da tabela 5.1 passam + 5.2 sem regressão + 5.3 sem alerta novo.

## 6. Estrutura de teste no QA

**Diretório de trabalho:** `/Users/diego/codex/brain-playground/2`.

**Slug temporário:** `qa-test-frictionless` (não conflita com `o-que-e-autoatribuicao`).

**Cleanup automático:** ao final, QA agent remove `project/workbench/content/qa-test-frictionless/`, `project/artifacts/contents/qa-test-frictionless/`, `project/workbench/seo-analysis/qa-test-frictionless.yaml`. Não toca em wiki/conteudos/.

**Fixture SERP:** se DataForSEO não estiver disponível, QA usa fixture em `tests/fixtures/serp-frictionless-qa.json`.

## 7. Critérios fora deste run

Documentar nos artefatos finais (não implementar):

- Companion como UX default (Fase 3).
- `seo-brain publish <topic>` como entry point único (Fase 5).
- `--auto` virar default para todos os artigos.
- Migração de artigos publicados existentes para render data-driven.

## 8. Roteiro de commits

- Commit A: `feat(cli): add --help to root and per-subcommand` (QA-1.1, QA-1.2).
- Commit B: `feat(seo-analysis): detect cannibalization vs publisher domain` (QA-1.3).
- Commit C: `feat(content-seo): accept voice_status draft-as-guide` (QA-1.4).
- Commit D: `feat(content-seo): add preflight phase with decisions.yaml` (QA-2.1).
- Commit E: `feat(content-seo): add --auto pipeline mode` (QA-2.2, QA-2.3).
- Commit F: `feat(next-website-creator): data-driven render via article-loader` (QA-4.1, QA-4.2).
- Commit G: `docs: handoff note + CHANGELOG` (final).

Cada commit deve passar `npm test` antes do próximo iniciar (no QA loop, isso é validado de uma vez ao final).
