#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

function parseJson(text) {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function dataDir() {
  return process.env.CLAUDE_PLUGIN_DATA || join(homedir(), ".claude", "plugins", "data", "agentic-seo");
}

function markerPath() {
  return join(dataDir(), "session-status.json");
}

function safeStatus(input) {
  return {
    loaded: true,
    session_id: input.session_id || null,
    source: input.source || "startup",
    cwd: input.cwd || null,
    loaded_at: new Date().toISOString(),
  };
}

function additionalContext(input) {
  const source = input.source || "startup";
  return [
    "Agentic SEO carregado para esta sessão.",
    "Use `/agentic-seo:agentic-seo` como skill operacional canônica antes de escolher workflows específicos.",
    "",
    "## Audiência e tom",
    "O usuário típico do Agentic SEO não é técnico — é fundador, gestor de marketing ou estrategista de SEO. Responda primeiro do ponto de vista do negócio: o que muda, qual decisão tomar, qual o impacto, qual o próximo passo. Só entre em detalhe técnico (código, infra, debug, configuração) quando a pergunta for explicitamente técnica.",
    "",
    "## Formato de entrega",
    "Para qualquer entrega substantiva (análise, relatório, conteúdo, brief, auditoria, recomendação): Web Companion primeiro quando fizer sentido (`project-browser` ou um handoff específico como `approve-page`, `approve-briefing`, `pick-cluster`, `review-changes`).",
    "Sempre que gerar `report.md`, siga a skill compartilhada `page-report`, grave em `project/analyses/<module>/<run-slug>/report.md`, retorne `report_md` e `browser_prompt: { recommended: true, message: \"Posso abrir o Web Companion para você ver a análise?\" }`; pergunte essa frase no chat antes de abrir qualquer navegador.",
    "Para entregas substantivas que não são reports (briefs, drafts, specs, imports, revisões, checks, conteúdo publicado ou mudanças de brain), grave um artefato navegável no projeto e retorne `artifact_path`, `companion_path`, `companion_slug` e `browser_prompt: { recommended: true, message: \"Posso abrir o Web Companion para você revisar esta entrega?\", open_with: \"project-browser\" }`. Preserve campos existentes como `path`, `brief_markdown_path`, `draft_path` e `companion_path` para compatibilidade.",
    "`content-seo`, `content-import`, `brain-keeper` e `spec-driven` são entregas não-report: apontam para `brief.md`/`draft.md`/`checks.yaml`/conteúdo publicado, resumo de importação em `project/workbench/`, página brain ou resumo workbench, e `spec.md`/`plan.md`/`result-check.md`, respectivamente.",
    "Nunca exponha `node scripts/companion.mjs ...` ao usuário; rode você como agente após o ok.",
    "Use blocos Markdown estruturados (`agentic-kpis`, `agentic-chart`, `agentic-table`) com payload YAML `version: 1` para KPIs, gráficos e tabelas nos análises; análises são editáveis no Companion, mas criação e exclusão seguem bloqueadas em v1.",
    "Reports devem ser humanos primeiro: resumo executivo antes, apêndice técnico em linguagem humana, sem H1 duplicado no corpo e sem JSON bruto/object dumps no visual. A evidência fica separada em `source_artifact`, `sources/`, `audits/`, `workbench/` ou arquivos normalizados.",
    "Use `project/.agentic-seo/project.json.language` como idioma canônico do projeto; UI e análises v1 têm cópia completa para `pt-BR` e `en`, com override explícito por execução quando existir.",
    "Skills de dados e análises — `seo-analysis`, `technical-seo`, `backlink-analysis`, `keyword-research`, `serp-extract`, `internal-links`, `eeat`, `topic-cluster`, `competitive-analysis` — devem sempre aplicar `page-report`, escrever `report.md` em `project/analyses/` e oferecer abertura pelo prompt de chat.",
    "Respostas curtas, status e perguntas de esclarecimento continuam no chat; não force Companion para mensagens que não geram artefato substantivo.",
    "Conversas curtas (esclarecimentos, status, perguntas pontuais) seguem em prosa simples no chat — não force HTML nem companion para essas.",
    "",
    "## Checkpoint de cada turno",
    "Antes de fechar cada resposta, releia mentalmente a seção `## Delivery Checkpoint` da skill `agentic-seo`: (1) gerei artefato substantivo em `project/`? (2) o artefato é a entrega? (3) ofereci o Web Companion com a frase canônica? Se sim para (1) e (2), feche com `browser_prompt`; nunca narre paths ou árvore de pastas no chat. O hook `UserPromptSubmit` reforça este checkpoint a cada turno em Claude Code.",
    "",
    "## Princípios estruturais",
    "`AGENTS.md` e `CLAUDE.md` são orientações de desenvolvimento do plugin, não a experiência do usuário final.",
    "Mantenha fontes, síntese e julgamento separados; contexto estratégico exige evidência e decisão registrada no log.",
    "Preserve diacríticos em texto humano, incluindo pt-BR: página, conteúdo, análise, evidência, aprovação, técnico, não, até.",
    `Origem do bootstrap: ${source}.`,
  ].join("\n");
}

const input = parseJson(await readStdin());
const statusFile = markerPath();
mkdirSync(dirname(statusFile), { recursive: true });
writeFileSync(statusFile, JSON.stringify(safeStatus(input), null, 2), "utf8");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: additionalContext(input),
    },
  }),
);
