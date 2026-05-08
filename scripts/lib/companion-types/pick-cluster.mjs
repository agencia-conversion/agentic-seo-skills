import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import YAML from "yaml";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity } from "../companion-state.mjs";
import { appendLogEntry } from "../brain-page.mjs";

const VALID_MODES = new Set(["production", "hypothesis-only"]);

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

export function buildClusterMarkdown(proposal, kept) {
  const rows = kept.map((s, i) => {
    const title = s.user_overrides?.display_title || s.title;
    const judgment = s.user_overrides?.judgment || s.judgment;
    return `${i + 1}. **${title}** · intenção: \`${s.intent}\` · ${judgment}`;
  });
  return [
    "---",
    `title: "Topic clusters"`,
    `updated: "${todayIso()}"`,
    "auto_generated: true",
    "---",
    "",
    "# Topic clusters",
    "",
    `## Cluster: ${proposal.pillar.user_overrides?.display_title || proposal.pillar.title}`,
    "",
    `**Pilar:** ${proposal.pillar.user_overrides?.display_title || proposal.pillar.title} · intenção \`${proposal.pillar.intent}\` · ${proposal.pillar.user_overrides?.judgment || proposal.pillar.judgment || ""}`,
    "",
    "### Páginas de apoio (priorizadas)",
    "",
    ...rows,
    "",
  ].join("\n");
}

function classifyDecision(mode, keptCount) {
  if (mode === "hypothesis-only") return { status: "hypothesis", writeBrain: false };
  if (keptCount >= 3) return { status: "draft", writeBrain: true };
  return { status: "needs-supporting", writeBrain: false };
}

function buildOverrides(item, original) {
  if (!item) return null;
  const ov = {};
  const dt = item.display_title?.trim();
  const jg = item.judgment?.trim();
  if (dt && dt !== original.title) ov.display_title = dt;
  if (jg && jg !== (original.judgment || "")) ov.judgment = jg;
  return Object.keys(ov).length ? ov : null;
}

export function applyPillarOverrides(pillar, edit) {
  const ov = buildOverrides(edit, pillar);
  return ov ? { ...pillar, user_overrides: ov } : pillar;
}

export function processSubmission(supportingInput, proposal) {
  const bySlug = new Map(proposal.supporting.map((s) => [s.slug, s]));
  const kept = [];
  const dropped = [];
  for (const item of supportingInput) {
    const original = bySlug.get(item.slug);
    if (!original) continue;
    if (item.kept) {
      const ov = buildOverrides(item, original);
      kept.push({
        slug: original.slug,
        title: original.title,
        intent: original.intent,
        judgment: original.judgment,
        volume: original.volume ?? null,
        difficulty: original.difficulty ?? null,
        priority: Number(item.priority) || kept.length + 1,
        ...(ov ? { user_overrides: ov } : {}),
      });
    } else {
      dropped.push({ slug: original.slug, intent: original.intent });
    }
  }
  kept.sort((a, b) => a.priority - b.priority);
  kept.forEach((k, i) => (k.priority = i + 1));
  return { kept, dropped };
}

export async function handleSubmit(body, ctx) {
  const { approver, notes, supporting, pillar: pillarEdit } = body || {};
  if (!approver || !approver.trim()) return { ok: false, reason: "missing-approver" };
  if (!Array.isArray(supporting)) return { ok: false, reason: "invalid-supporting" };

  const approverClean = approver.trim();
  const finalPillar = applyPillarOverrides(ctx.proposal.pillar, pillarEdit);
  const { kept, dropped } = processSubmission(supporting, ctx.proposal);
  const { status, writeBrain } = classifyDecision(ctx.proposal.mode, kept.length);

  writeIdentity(approverClean);
  const today = todayIso();

  const reportPath = join(
    ctx.projectRoot,
    "workbench",
    "topic-cluster",
    `${ctx.proposal.seed}.yaml`,
  );
  mkdirSync(dirname(reportPath), { recursive: true });
  const report = {
    seed: ctx.proposal.seed,
    mode: ctx.proposal.mode,
    status,
    aprovador: approverClean,
    aprovado_em: status === "draft" ? today : null,
    decided_at: new Date().toISOString(),
    data_provenance: ctx.proposal.data_provenance ?? null,
    pillar: finalPillar,
    supporting: kept,
    dropped,
    notes: notes?.trim() || null,
  };
  writeFileSync(reportPath, YAML.stringify(report, { lineWidth: 0 }));

  let brainPath = null;
  if (writeBrain) {
    brainPath = join(ctx.projectRoot, "brain", "topic-clusters.md");
    mkdirSync(dirname(brainPath), { recursive: true });
    writeFileSync(brainPath, buildClusterMarkdown({ ...ctx.proposal, pillar: finalPillar }, kept));
  }

  appendLogEntry(join(ctx.projectRoot, "brain", "log.md"), {
    date: today,
    tipo: writeBrain ? "aprovacao" : "decisao",
    titulo: `Cluster ${ctx.proposal.seed} · ${status}`,
    escopo: writeBrain ? "topic-clusters" : ctx.proposal.seed,
    decisao: `${kept.length}/${ctx.proposal.supporting.length} suportes mantidos · modo ${ctx.proposal.mode}`,
    evidencia: reportPath,
    aprovador: approverClean,
    aprovado_em: status === "draft" ? today : null,
    notas: notes?.trim() || null,
  });

  return {
    ok: true,
    status,
    seed: ctx.proposal.seed,
    kept_count: kept.length,
    dropped_count: dropped.length,
    report: reportPath,
    brain: brainPath,
    approver: approverClean,
  };
}

export async function runPickCluster(argv = []) {
  const args = parseArgs(argv);
  if (args.project) throw new Error("--project is no longer supported; SEO Brain uses the single project at project/.");
  const projectRootArg = args["project-root"] ?? process.env.CLAUDE_PLUGIN_OPTION_project_dir ?? process.env.SEO_BRAIN_PROJECT_DIR ?? "project";
  if (!args.proposal) throw new Error("missing --proposal");
  const projectRoot = resolve(projectRootArg);
  const proposalPath = resolve(args.proposal);
  if (!existsSync(proposalPath)) throw new Error(`proposal not found: ${proposalPath}`);
  const proposal = JSON.parse(readFileSync(proposalPath, "utf8"));
  if (!VALID_MODES.has(proposal.mode)) throw new Error(`invalid proposal mode: ${proposal.mode}`);

  const ctx = { projectRoot, proposal };
  const id = newHandoffId();
  const contextData = {
    handoff: "pick-cluster",
    seed: proposal.seed,
    mode: proposal.mode,
    pillar: proposal.pillar,
    supporting: proposal.supporting,
    data_provenance: proposal.data_provenance ?? null,
    identity: readIdentity(),
  };
  return runHandoff({
    id,
    templateName: "pick-cluster.html",
    contextData,
    onSubmit: (body) => handleSubmit(body, ctx),
  });
}
