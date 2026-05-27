import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity } from "../companion-state.mjs";
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

function readDraft(projectRoot, slug) {
  const draftPath = join(projectRoot, "clusters", slug, "draft.yaml");
  const clusterPath = join(projectRoot, "clusters", slug, "cluster.yaml");
  const hasDraft = existsSync(draftPath);
  const hasCluster = existsSync(clusterPath);
  if (!hasDraft && !hasCluster) throw new Error(`no draft or cluster.yaml for slug "${slug}" under project/clusters/${slug}/`);
  const source = hasDraft ? draftPath : clusterPath;
  const raw = readFileSync(source, "utf8");
  const data = YAML.parse(raw) || {};
  return { source, raw, data, hasDraft, hasCluster, draftPath, clusterPath };
}

function buildContext({ projectRoot, slug }) {
  const draft = readDraft(projectRoot, slug);
  return {
    slug,
    nome: draft.data.nome || slug,
    area: draft.data.area || null,
    status: draft.data.status || "hypothesis",
    contract_version: draft.data.contract_version || 1,
    tese: typeof draft.data.tese === "string" ? draft.data.tese.trim() : "",
    pilar: draft.data.pilar || null,
    planned_satellites: Array.isArray(draft.data.planned_satellites) ? draft.data.planned_satellites : [],
    bypass: draft.data.provenance?.bypass || null,
    evidence: Array.isArray(draft.data.evidence) ? draft.data.evidence : [],
    has_existing_cluster: draft.hasCluster && draft.hasDraft,
    draft_path: `clusters/${slug}/draft.yaml`,
    cluster_path: `clusters/${slug}/cluster.yaml`,
    raw_yaml: draft.raw,
  };
}

function promoteToCluster(projectRoot, slug, approvedBy, statusOverride) {
  const draft = readDraft(projectRoot, slug);
  const nextStatus = statusOverride || (draft.data.status === "hypothesis" ? "active" : draft.data.status);
  const next = {
    ...draft.data,
    status: nextStatus,
    provenance: {
      ...(draft.data.provenance || {}),
      promoted_at: todayIso(),
      promoted_by: approvedBy,
    },
    stats: {
      ...(draft.data.stats || {}),
      updated: todayIso(),
    },
  };
  delete next.provenance?.bypass;
  mkdirSync(dirname(draft.clusterPath), { recursive: true });
  writeFileSync(draft.clusterPath, YAML.stringify(next, { lineWidth: 0 }), "utf8");
  if (draft.hasDraft) {
    const archived = draft.draftPath.replace(/\.yaml$/, `.archived-${todayIso()}.yaml`);
    renameSync(draft.draftPath, archived);
    return { clusterPath: draft.clusterPath, draftArchived: archived };
  }
  return { clusterPath: draft.clusterPath, draftArchived: null };
}

function runClusterSync(projectRoot, slug) {
  const repoRoot = resolve(projectRoot, "..");
  try {
    execFileSync("node", ["scripts/cluster-sync.mjs", `--cluster=${slug}`], { cwd: repoRoot, stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleSubmit(body, ctx) {
  const decision = String(body?.decision || "").trim();
  const approver = String(body?.approved_by || "").trim();
  const notes = body?.notes ? String(body.notes).trim() : null;
  const statusOverride = body?.status ? String(body.status).trim() : null;
  if (decision !== "approve") {
    return { ok: true, decision: "rejected", approver, slug: ctx.slug, log_appended: false };
  }
  if (!approver) return { ok: false, error: "missing approver" };

  const { clusterPath, draftArchived } = promoteToCluster(ctx.projectRoot, ctx.slug, approver, statusOverride);
  const sync = runClusterSync(ctx.projectRoot, ctx.slug);

  const logFile = join(ctx.projectRoot, "brain", "log.md");
  appendLogEntry(logFile, {
    date: todayIso(),
    tipo: "aprovacao",
    titulo: `Cluster ${ctx.slug} promovido`,
    escopo: `clusters/${ctx.slug}/cluster.yaml, brain/topic-clusters/${ctx.slug}.md`,
    decisao: `Cluster "${ctx.slug}" promovido para status "${statusOverride || "active"}" via handoff approve-cluster. Draft arquivado em ${draftArchived ? draftArchived.replace(ctx.projectRoot + "/", "") : "—"}. Cluster-sync ${sync.ok ? "ok" : `falhou: ${sync.error}`}.`,
    evidencia: `clusters/${ctx.slug}/cluster.yaml`,
    aprovador: approver,
    aprovado_em: todayIso(),
    notas: notes,
  });

  return {
    ok: true,
    decision: "approved",
    approver,
    slug: ctx.slug,
    cluster_path: clusterPath.replace(ctx.projectRoot + "/", ""),
    draft_archived: draftArchived ? draftArchived.replace(ctx.projectRoot + "/", "") : null,
    cluster_sync: sync,
    log_appended: true,
  };
}

export async function runApproveCluster(argv = []) {
  const args = parseArgs(argv);
  if (!args.slug) throw new Error("missing --slug");
  const projectRootArg = args["project-root"] ?? process.env.CLAUDE_PLUGIN_OPTION_project_dir ?? process.env.AGENTIC_SEO_PROJECT_DIR ?? "project";
  const projectRoot = resolve(projectRootArg);
  const ctxBase = buildContext({ projectRoot, slug: args.slug });
  const ctx = { ...ctxBase, projectRoot };

  const id = newHandoffId();
  const contextData = {
    handoff: "approve-cluster",
    slug: ctx.slug,
    nome: ctx.nome,
    area: ctx.area,
    status: ctx.status,
    tese: ctx.tese,
    pilar: ctx.pilar,
    planned_satellites: ctx.planned_satellites,
    bypass: ctx.bypass,
    evidence: ctx.evidence,
    has_existing_cluster: ctx.has_existing_cluster,
    draft_path: ctx.draft_path,
    cluster_path: ctx.cluster_path,
    raw_yaml: ctx.raw_yaml,
    identity: readIdentity(),
  };
  return runHandoff({
    id,
    templateName: "approve-cluster.html",
    contextData,
    onSubmit: (body) => handleSubmit(body, ctx),
  });
}
