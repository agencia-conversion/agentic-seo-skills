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
  return process.env.CLAUDE_PLUGIN_DATA || join(homedir(), ".claude", "plugins", "data", "seo-brain");
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
    "SEO Brain carregado para esta sessão.",
    "Use `/seo-brain:seo-brain` como skill operacional canônica antes de escolher workflows específicos.",
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
