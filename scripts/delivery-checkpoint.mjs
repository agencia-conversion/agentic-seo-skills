#!/usr/bin/env node
// UserPromptSubmit hook: reforça por turno o Web Companion delivery checkpoint
// definido na skill canônica `agentic-seo`. Silencia em status checks e dúvidas
// curtas. Funciona independentemente de SessionStart do plugin (Conductor pode
// ativar via .claude/settings.json sem carregar o plugin Agentic SEO).

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

const STATUS_RE = /\b(status|como (?:est[áa]|vai|anda)|deu certo|funcionou|o que (?:[eé]|seria)|qual (?:[eé]|seria)|onde fica|pode explicar|me ajude a entender|d[uú]vida r[aá]pida|me lembra|continua|ok\?)\b/i;

function shouldSkip(prompt) {
  if (!prompt || prompt.trim().length < 25) return true;
  if (STATUS_RE.test(prompt)) return true;
  return false;
}

const CHECKPOINT = [
  "[agentic-seo · checkpoint de entrega]",
  "Antes de fechar esta resposta, decida em silêncio:",
  "1. Produzi artefato substantivo em project/ (report.md, brief.md, draft.md, spec.md, summary.md, audit, brain change, public content, cluster)? → Feche com browser_prompt usando a frase canônica + companion_path/artifact_path.",
  "2. Resposta é status, esclarecimento, dúvida pontual ou pergunta curta? → Prosa simples no chat.",
  "3. Nunca narre estrutura de pasta ou lista de paths como entrega: o artefato é a entrega, o Companion é a apresentação.",
  "Frases canônicas: \"Posso abrir o Web Companion para você ver a análise?\" (reports) | \"Posso abrir o Web Companion para você revisar esta entrega?\" (entregas).",
  "Contrato completo: seção `## Delivery Checkpoint` da skill agentic-seo.",
].join("\n");

const input = parseJson(await readStdin());
const additionalContext = shouldSkip(input.prompt || "") ? "" : CHECKPOINT;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  }),
);
