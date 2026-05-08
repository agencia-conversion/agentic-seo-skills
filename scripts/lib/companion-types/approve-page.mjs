import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity, sha256 } from "../companion-state.mjs";
import {
  parseFrontmatter,
  extractSources,
  findMissingSources,
  findBrokenWikilinks,
  diffAgainstSnapshot,
  writeSnapshot,
  appendLogEntry,
  appendSourcesAsIngest,
} from "../brain-page.mjs";

const VALID_DECISIONS = new Set(["approved", "rejected", "needs-evidence"]);
const AUTHORIAL_BRAIN_PAGES = new Set([
  "brain/index.md",
  "brain/identidade.md",
  "brain/voz.md",
  "brain/tecnologia.md",
  "brain/editorial.md",
  "brain/topic-clusters.md",
]);

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function buildContext({ projectRoot, fileRel }) {
  const filePath = join(projectRoot, fileRel);
  if (!existsSync(filePath)) throw new Error(`page not found: ${filePath}`);
  const text = readFileSync(filePath, "utf8");
  const hash = sha256(text);
  const { data: frontmatter, body } = parseFrontmatter(text);
  const brainRoot = join(projectRoot, "brain");
  const logFile = join(brainRoot, "log.md");
  const sources = extractSources(body);
  const missingSources = findMissingSources(body, logFile);
  const brokenLinks = findBrokenWikilinks(body, brainRoot);
  const diff = diffAgainstSnapshot(projectRoot, fileRel, body);
  const isAuthorial = AUTHORIAL_BRAIN_PAGES.has(fileRel);
  return {
    filePath,
    fileRel,
    hash,
    frontmatter,
    body,
    sources,
    missingSources,
    brokenLinks,
    diff,
    isAuthorial,
    isStrategic: isAuthorial,
    pageBaseName: basename(fileRel, ".md"),
  };
}

export async function handleSubmit(body, ctx, deps = {}) {
  const { decision, notes, register_missing, approver } = body || {};
  if (!VALID_DECISIONS.has(decision)) return { ok: false, reason: "invalid-decision" };
  if (!approver || !approver.trim()) return { ok: false, reason: "missing-approver" };

  const fresh = readFileSync(ctx.filePath, "utf8");
  if (sha256(fresh) !== ctx.hash) {
    return { ok: false, reason: "file-modified", details: "page changed during review" };
  }

  const setFrontmatterValue = deps.setFrontmatterValue ?? (await import("../../../dist/seo-brain.js")).setFrontmatterValue;

  const approverClean = approver.trim();
  writeIdentity(approverClean);
  const today = todayIso();

  setFrontmatterValue(ctx.filePath, {
    updated: JSON.stringify(today),
  });

  let snapshotWritten = null;
  if (decision === "approved") {
    const updated = readFileSync(ctx.filePath, "utf8");
    const { body: newBody } = parseFrontmatter(updated);
    snapshotWritten = writeSnapshot(ctx.projectRoot, ctx.fileRel, newBody);
  }

  const logFile = join(ctx.projectRoot, "brain", "log.md");
  let sourcesAdded = [];
  if (decision === "approved" && register_missing && ctx.missingSources.length) {
    appendSourcesAsIngest(logFile, ctx.missingSources, approverClean);
    sourcesAdded = [...ctx.missingSources];
  }

  const tipo = decision === "approved" ? (ctx.isAuthorial ? "aprovacao" : "decisao") : "decisao";
  const decisao = `${ctx.fileRel} marcado como ${decision} por ${approverClean}.`;
  appendLogEntry(logFile, {
    date: today,
    tipo,
    titulo: `${ctx.pageBaseName} ${decision}`,
    escopo: ctx.fileRel,
    decisao,
    evidencia: ctx.fileRel,
    aprovador: approverClean,
    aprovado_em: decision === "approved" ? today : null,
    notas: notes ? notes.trim() : null,
  });

  return {
    ok: true,
    decision,
    approver: approverClean,
    file: ctx.fileRel,
    snapshot: snapshotWritten,
    sources_registered: sourcesAdded,
    log_appended: true,
  };
}

export async function runApprovePage(argv = []) {
  const args = parseArgs(argv);
  if (args.project) throw new Error("--project is no longer supported; SEO Brain uses the single project at project/.");
  const projectRootArg = args["project-root"] ?? process.env.CLAUDE_PLUGIN_OPTION_project_dir ?? process.env.SEO_BRAIN_PROJECT_DIR ?? "project";
  if (!args.file) throw new Error("missing --file");
  const projectRoot = resolve(projectRootArg);
  const ctxBase = buildContext({ projectRoot, fileRel: args.file });
  const ctx = { ...ctxBase, projectRoot };

  const id = newHandoffId();
  const contextData = {
    handoff: "approve-page",
    file: ctx.fileRel,
    pageBaseName: ctx.pageBaseName,
    isAuthorial: ctx.isAuthorial,
    frontmatter: ctx.frontmatter,
    body: ctx.body,
    sources: ctx.sources,
    missingSources: ctx.missingSources,
    brokenLinks: ctx.brokenLinks,
    diff: ctx.diff,
    identity: readIdentity(),
  };
  return runHandoff({
    id,
    templateName: "approve-page.html",
    contextData,
    onSubmit: (body) => handleSubmit(body, ctx),
  });
}
