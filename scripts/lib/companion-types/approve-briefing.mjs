import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity, sha256 } from "../companion-state.mjs";
import { appendLogEntry } from "../wiki-page.mjs";

const VALID_DECISIONS = new Set(["approved", "needs-rewrite"]);

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

function resolveBriefPath(projectRoot, input) {
  const candidates = [
    resolve(input),
    resolve(projectRoot, input),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`brief not found: ${input}`);
  return found;
}

export function buildContext({ projectRoot, briefPath }) {
  if (!existsSync(briefPath)) throw new Error(`brief not found: ${briefPath}`);
  const text = readFileSync(briefPath, "utf8");
  const brief = JSON.parse(text);
  if (!brief.topic || !brief.brief || typeof brief.brief !== "object") {
    throw new Error("invalid content brief: missing topic or brief object");
  }
  return {
    projectRoot,
    briefPath,
    briefRel: relative(projectRoot, briefPath),
    hash: sha256(text),
    brief,
  };
}

export async function handleSubmit(body, ctx) {
  const { decision, approver, notes } = body || {};
  if (!VALID_DECISIONS.has(decision)) return { ok: false, reason: "invalid-decision" };
  if (!approver || !approver.trim()) return { ok: false, reason: "missing-approver" };

  const fresh = readFileSync(ctx.briefPath, "utf8");
  if (sha256(fresh) !== ctx.hash) return { ok: false, reason: "brief-modified" };

  let brief;
  try {
    brief = JSON.parse(fresh);
  } catch {
    return { ok: false, reason: "invalid-brief-json" };
  }

  const approverClean = approver.trim();
  const status = decision === "approved" ? "approved" : "needs-rewrite";
  writeIdentity(approverClean);
  brief.approval = {
    mode: brief.approval?.mode || "handoff",
    status,
    approved_by: status === "approved" ? approverClean : null,
    decided_at: new Date().toISOString(),
    notes: notes?.trim() || null,
  };
  brief.draft_status = status === "approved" ? "approved-for-writing" : "needs-rewrite";
  writeFileSync(ctx.briefPath, JSON.stringify(brief, null, 2) + "\n", "utf8");

  appendLogEntry(join(ctx.projectRoot, "wiki", "log", "index.md"), {
    date: todayIso(),
    eventType: "approve-briefing",
    title: `${brief.topic} · ${status}`,
    type: "operational-decision",
    actor: approverClean,
    files: [ctx.briefRel],
    decision: status,
    summary: `Briefing ${ctx.briefRel} marcado como ${status}.`,
    notes: notes?.trim() || null,
  });

  return { ok: true, status, approver: approverClean, brief: ctx.briefPath };
}

export async function runApproveBriefing(argv = []) {
  const args = parseArgs(argv);
  if (args.project) throw new Error("--project is no longer supported; SEO Brain uses the single project at project/.");
  const projectRootArg = args["project-root"] ?? process.env.CLAUDE_PLUGIN_OPTION_project_dir ?? process.env.SEO_BRAIN_PROJECT_DIR ?? "project";
  if (!args.brief) throw new Error("missing --brief");
  const projectRoot = resolve(projectRootArg);
  const briefPath = resolveBriefPath(projectRoot, args.brief);
  const ctx = buildContext({ projectRoot, briefPath });
  const id = newHandoffId();
  return runHandoff({
    id,
    templateName: "approve-briefing.html",
    contextData: {
      handoff: "approve-briefing",
      briefRel: ctx.briefRel,
      brief: ctx.brief,
      identity: readIdentity(),
    },
    onSubmit: (body) => handleSubmit(body, ctx),
  });
}
