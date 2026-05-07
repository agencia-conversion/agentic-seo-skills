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
  appendSourcesToCatalog,
} from "../wiki-page.mjs";

const VALID_DECISIONS = new Set(["approved", "rejected", "needs-evidence"]);
const AUTHORIAL_BRAIN_PAGES = new Set([
  "brain/index.md",
  "brain/identidade.md",
  "brain/voz.md",
  "brain/tecnologia.md",
  "brain/editorial.md",
  "brain/topic-clusters.md",
  // Legacy wiki paths still recognized while companion server migrates fully.
  "wiki/index.md",
  "wiki/eeat.md",
  "wiki/tecnologia/index.md",
  "wiki/tom-de-voz/index.md",
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
  const wikiRoot = join(projectRoot, "wiki");
  const fontesIndex = join(wikiRoot, "fontes", "index.md");
  const sources = extractSources(body);
  const missingSources = findMissingSources(body, fontesIndex);
  const brokenLinks = findBrokenWikilinks(body, wikiRoot);
  const diff = diffAgainstSnapshot(projectRoot, fileRel, body);
  const isStrategic = AUTHORIAL_BRAIN_PAGES.has(fileRel);
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
    isStrategic,
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
  const nowIso = new Date().toISOString();

  setFrontmatterValue(ctx.filePath, {
    status: decision,
    approved_by: JSON.stringify(approverClean),
    approved_at: decision === "approved" ? JSON.stringify(nowIso) : "null",
    last_reviewed: JSON.stringify(today),
  });

  let snapshotWritten = null;
  if (decision === "approved") {
    const updated = readFileSync(ctx.filePath, "utf8");
    const { body: newBody } = parseFrontmatter(updated);
    snapshotWritten = writeSnapshot(ctx.projectRoot, ctx.fileRel, newBody);
  }

  let sourcesAdded = [];
  if (decision === "approved" && register_missing && ctx.missingSources.length) {
    appendSourcesToCatalog(join(ctx.projectRoot, "wiki", "fontes", "index.md"), ctx.missingSources);
    sourcesAdded = [...ctx.missingSources];
  }

  const logFile = join(ctx.projectRoot, "wiki", "log", "index.md");
  const summary = `${ctx.fileRel} marcado como ${decision} por ${approverClean}`;
  appendLogEntry(logFile, {
    date: today,
    eventType: "wiki-approve",
    title: `${ctx.pageBaseName} ${decision}`,
    type: ctx.isStrategic ? "strategic-approval" : "operational-decision",
    actor: approverClean,
    files: [ctx.pageBaseName],
    decision,
    summary,
    notes: notes ? notes.trim() : null,
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
    isStrategic: ctx.isStrategic,
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
