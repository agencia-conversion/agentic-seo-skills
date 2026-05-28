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
    "Agentic SEO loaded for this session.",
    "Use `/agentic-seo:agentic-seo` as the canonical runtime skill before picking a specific workflow. Read `AGENTS.md` for the full cross-tool runtime contract.",
    "",
    "## Audience and delivery",
    "The default user is nontechnical (founder, marketing lead, SEO strategist). Frame answers from the business angle first; switch to technical framing only when the question itself is technical.",
    "The Web Companion is the delivery surface for every substantive artifact. Chat is for short conversation (clarifications, status, blocked routes).",
    "",
    "Whenever a workflow generates `report.md` (skills `seo-analysis`, `technical-seo`, `backlink-analysis`, `keyword-research`, `serp-extract`, `internal-links`, `eeat`, `topic-cluster`, `competitive-analysis`), follow the shared `page-report` contract, write to `project/analyses/<module>/<run-slug>/report.md`, and return `report_md` plus `browser_prompt: { recommended: true, message: \"Posso abrir o Web Companion para você ver a análise?\" }`. Ask that exact consent line in chat before opening any browser.",
    "",
    "For substantive non-report deliverables (skills `content-seo`, `content-import`, `brain-keeper`, `spec-driven` — briefs, drafts, specs, imports, brain changes, content, clusters), return `artifact_path`, `companion_path`, `companion_slug`, and `browser_prompt: { recommended: true, message: \"Posso abrir o Web Companion para você revisar esta entrega?\", open_with: \"project-browser\" }`. Preserve compatibility fields like `path`, `brief_markdown_path`, `draft_path`.",
    "",
    "Reports são humanos primeiro: executive reading first, depth in human-readable appendices, never paste JSON bruto/object dumps into the visual body. Raw evidence stays in `source_artifact` plus `sources/`, `audits/`, `workbench/`. Visual modules use `agentic-kpis`, `agentic-chart`, `agentic-table` with YAML `version: 1` payloads.",
    "",
    "Never expose `node scripts/companion.mjs ...` to the user; open the Companion yourself after consent.",
    "",
    "## Process integrity",
    "Keep extracted data, LLM synthesis, and human judgment separate in every artifact. Never fabricate metrics, backlinks, credentials, or proof. Name missing gates (DataForSEO, voice, source separation, content checks, brain decision) before downstream execution. Record any bypass in `project/brain/log.md` as `type: decision` with reason and consequence.",
    "",
    "## Language",
    "English-first, Brazilian Portuguese official. Preserve accents and diacritics in human-facing prose, including pt-BR: página, conteúdo, análise, evidência, aprovação, técnico, não, até. ASCII transliteration only for slugs, paths, IDs, and code identifiers. Use `project/.agentic-seo/project.json.language` as the project language; v1 supports `pt-BR` and `en` with full UI and report copy.",
    "",
    "## Where things live",
    "Cross-tool runtime contract: `AGENTS.md`. Deeper reference under `docs/`: `getting-started.md`, `web-companion.md`, `brain.md`, `clusters.md`, `architecture.md`, `contributing.md`. Refactor continuity: `docs/refactor-status.md`. Versioned contracts: `docs/specs/`.",
    `Bootstrap source: ${source}.`,
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
