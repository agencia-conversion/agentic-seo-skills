import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity } from "../companion-state.mjs";
import { appendLogEntry } from "../brain-page.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { out[key] = next; i++; } else out[key] = true;
  }
  return out;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");

export function confirmationMentionsDataforseo(text) {
  return /\bdata\s*for\s*seo\b|\bdataforseo\b/i.test(String(text || ""));
}

export function confirmationAcknowledgesBypass(text) {
  const normalized = String(text || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return /\b(sem|without|bypass|dispens|dispenso|pular|skip|ignorar|secondary|secundario)\b/.test(normalized)
    || /\b(nao usar|not use|no dataforseo|not dataforseo)\b/.test(normalized);
}

export function buildContext(args) {
  return {
    handoff: "dataforseo-bypass",
    workflow: String(args.workflow || "seo-brain"),
    step: String(args.step || "dataforseo"),
    subject: args.subject ? String(args.subject) : null,
    reason: args.reason ? String(args.reason) : "",
    consequence: String(args.consequence || "O artifact não será DataForSEO-backed."),
    provider_used: args["provider-used"] ? String(args["provider-used"]) : "secondary-or-none",
    recommended_alternative: "Configurar DataForSEO com data-setup e repetir o fluxo com dados de provider.",
    identity: readIdentity(),
  };
}

export async function handleSubmit(body, ctx, projectRoot) {
  const approver = String(body?.approver || "agent").trim() || "agent";
  const confirmationText = String(body?.confirmation_text || `Registrado automaticamente: seguir sem DataForSEO em ${ctx.workflow}/${ctx.step}.`).trim();
  const reason = String(body?.reason || ctx.reason || "DataForSEO indisponível ou provider secundário solicitado.").trim();
  if (!reason) return { ok: false, reason: "missing-reason" };
  writeIdentity(approver);
  const approval = {
    step: ctx.step, workflow: ctx.workflow, subject: ctx.subject,
    confirmed: true,
    reason, consequence: ctx.consequence,
    aprovador: approver, confirmation_text: confirmationText, confirmado_em: nowIso(),
    approval_mode: "companion", required_provider: "dataforseo", provider_used: ctx.provider_used,
  };
  const logFile = join(projectRoot, "brain", "log.md");
  const hasProjectLog = existsSync(join(projectRoot, "brain")) || existsSync(logFile);
  if (hasProjectLog) {
    appendLogEntry(logFile, {
      date: todayIso(),
      tipo: "decisao",
      titulo: `DataForSEO bypass · ${ctx.subject || ctx.workflow}`,
      escopo: ctx.workflow,
      decisao: `${ctx.workflow} registrado sem DataForSEO em ${ctx.step}: ${ctx.consequence}`,
      evidencia: confirmationText,
      aprovador: approver,
      aprovado_em: null,
      notas: reason,
    });
  }
  return { ok: true, approval };
}

export async function runDataforseoBypass(argv = []) {
  const args = parseArgs(argv);
  if (args.project) throw new Error("--project is no longer supported; SEO Brain uses the single project at project/.");
  const projectRootArg = args["project-root"] ?? process.env.CLAUDE_PLUGIN_OPTION_project_dir ?? process.env.SEO_BRAIN_PROJECT_DIR ?? "project";
  const projectRoot = resolve(projectRootArg);
  const ctx = buildContext(args);
  const id = newHandoffId();
  return runHandoff({
    id,
    templateName: "dataforseo-bypass.html",
    contextData: ctx,
    onSubmit: (body) => handleSubmit(body, ctx, projectRoot),
  });
}
