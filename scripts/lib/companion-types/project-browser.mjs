import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity } from "../companion-state.mjs";
import { appendLogEntry } from "../brain-page.mjs";

// Default TTL for project-browser is generous (10 min): the human onboarding
// flow can take a while, and in detached mode the server no longer dies with
// the launching Bash call, so a short TTL is no longer required.
const DEFAULT_PROJECT_BROWSER_TTL_MS = 600_000;

// Brain files use English file names (templates/project/brain/*.md) with
// Portuguese display labels. These are the dense onboarding context the user
// reviews in the Companion.
const BRAIN_PAGES = [
  { key: "identity", file: "identity.md", label: "Identidade" },
  { key: "voice", file: "voice.md", label: "Voz" },
  { key: "technology", file: "technology.md", label: "Tecnologia" },
  { key: "editorial", file: "editorial.md", label: "Editorial" },
  { key: "topic_clusters", file: "topic-clusters.md", label: "Topic clusters" },
  { key: "index", file: "index.md", label: "Visão geral" },
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");

function readBrainPage(brainDir, file) {
  const path = join(brainDir, file);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function buildContext(projectRoot) {
  const brainDir = join(projectRoot, "brain");
  const pages = [];
  for (const page of BRAIN_PAGES) {
    const content = readBrainPage(brainDir, page.file);
    pages.push({
      key: page.key,
      label: page.label,
      file: `brain/${page.file}`,
      present: content !== null,
      content: content ?? "",
    });
  }
  return {
    handoff: "project-browser",
    project_root: projectRoot,
    pages,
    identity: readIdentity(),
  };
}

export async function handleSubmit(body, ctx, projectRoot) {
  const approver = String(body?.approver || "").trim();
  if (!approver) return { ok: false, reason: "missing-approver" };

  const notes = String(body?.notes || "").trim();
  writeIdentity(approver);

  const approval = {
    handoff: "project-browser",
    confirmed: true,
    aprovador: approver,
    aprovado_em: nowIso(),
    approval_mode: "companion",
    notes: notes || null,
  };

  const logFile = join(projectRoot, "brain", "log.md");
  const hasProjectLog = existsSync(join(projectRoot, "brain")) || existsSync(logFile);
  if (hasProjectLog) {
    appendLogEntry(logFile, {
      date: todayIso(),
      tipo: "approval",
      titulo: "Brain do projeto revisado e aprovado",
      escopo: "brain",
      decisao: "Usuário revisou as páginas do Cérebro (identidade, voz, tecnologia, editorial, topic clusters e índice) no Companion e aprovou o brain.",
      evidencia: notes || "Aprovação registrada via Companion (project-browser).",
      aprovador: approver,
      aprovado_em: todayIso(),
      notas: notes || undefined,
    });
  }

  return { ok: true, approval };
}

export async function runProjectBrowser(argv = []) {
  const args = parseArgs(argv);
  if (args.project) {
    throw new Error(
      "--project is no longer supported; Agentic SEO uses the single project at project/.",
    );
  }
  const projectRootArg =
    args["project-root"] ??
    process.env.CLAUDE_PLUGIN_OPTION_project_dir ??
    process.env.AGENTIC_SEO_PROJECT_DIR ??
    "project";
  const projectRoot = resolve(projectRootArg);
  const ctx = buildContext(projectRoot);
  const id = newHandoffId();
  // emitStatus is intentionally NOT forced here: the detached parent enables
  // it via AGENTIC_SEO_HANDOFF_EMIT_STATUS for the --serve child. In --foreground
  // mode the final result is printed by the CLI instead of a status line.
  return runHandoff({
    id,
    templateName: "project-browser.html",
    contextData: ctx,
    ttlMs: DEFAULT_PROJECT_BROWSER_TTL_MS,
    onSubmit: (innerBody) => handleSubmit(innerBody, ctx, projectRoot),
  });
}
