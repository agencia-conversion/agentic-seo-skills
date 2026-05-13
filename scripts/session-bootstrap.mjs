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
    "Para qualquer entrega substantiva (relatório, análise, conteúdo, brief, auditoria, recomendação): web companion primeiro quando fizer sentido (`project-browser` ou um handoff específico como `approve-page`, `approve-briefing`, `pick-cluster`, `review-changes`); HTML branded como arquivo local quando o output for visual ou um relatório que não cabe em handoff. Markdown puro só se o usuário pedir explicitamente.",
    "Antes de abrir o companion, peça consentimento curto em português: \"Posso abrir no browser?\". Nunca exponha `node scripts/companion.mjs ...` ao usuário; rode você como agente após o ok.",
    "Todo HTML gerado deve usar o branding Agentic SEO (cor primária `#3a5bd9`, logo asterisco, marca \"by Conversion\" discreta no rodapé) via `scripts/lib/html-report.mjs`. Não escreva HTML estático à mão; passe um struct de seções para o helper.",
    "Skills de dados e relatórios — `seo-analysis`, `technical-seo`, `backlink-analysis`, `keyword-research`, `serp-extract`, `internal-links`, `eeat`, `topic-cluster` — devem sempre escrever `report.html` na pasta do artefato e oferecer abertura via companion.",
    "Conversas curtas (esclarecimentos, status, perguntas pontuais) seguem em prosa simples no chat — não force HTML nem companion para essas.",
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
