import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import YAML from "yaml";
import { runHandoff } from "../companion-server.mjs";
import { newHandoffId, readIdentity, writeIdentity, sha256 } from "../companion-state.mjs";
import { appendLogEntry } from "../brain-page.mjs";
const VALID_DECISIONS = new Set(["approved", "needs-rewrite", "rejected"]);

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

function parseBrief(text, briefPath) {
  return briefPath.endsWith(".json") ? JSON.parse(text) : YAML.parse(text);
}

function serializeBrief(brief, briefPath) {
  if (briefPath.endsWith(".json")) return `${JSON.stringify(brief, null, 2)}\n`;
  const text = YAML.stringify(brief, { lineWidth: 0 });
  return text.endsWith("\n") ? text : `${text}\n`;
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}
function asStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [String(value)];
}

function briefMarkdownPathCandidates(briefPath) {
  const byExtension = briefPath.replace(/\.(ya?ml|json)$/i, ".md");
  return [
    join(dirname(briefPath), "brief.md"),
    byExtension,
  ].filter((item, index, arr) => item && arr.indexOf(item) === index);
}

function readBriefMarkdown(briefPath) {
  const found = briefMarkdownPathCandidates(briefPath).find((candidate) => existsSync(candidate));
  return found ? { path: found, text: readFileSync(found, "utf8") } : { path: null, text: "" };
}

function renderDraft(brief) {
  const topic = String(brief.topic || "Conteúdo");
  const keyword = String(brief.keyword || topic);
  const slug = String(brief.topic_slug || "conteudo");
  const targetWords = Number(brief.skyscraper?.word_count?.target_words || brief.brief?.target_words || 2000);
  const evidenceSources = asStringList(brief.evidence_sources);
  const voiceFilled = brief.context_evidence?.voice_evidence?.filled === true || brief.voice_context?.filled === true;
  const contextEvidencePath = String(brief.context_evidence?.path || `workbench/content/${slug}/context-evidence.yaml`);
  const origem = String(brief.origem || "blog");
  const publishedAt = String(brief.published_at || todayIso());
  const sourceUrl = String(brief.source_url || "");
  const area = String(brief.area || "");
  const outline = Array.isArray(brief.brief?.outline) && brief.brief.outline.length ? brief.brief.outline : [
    { level: 2, title: "O que significa", purpose: "Definir o tema em linguagem direta." },
    { level: 2, title: "Como aplicar na prática", purpose: "Transformar o conceito em orientação útil." },
    { level: 2, title: "Erros comuns", purpose: "Prevenir recomendações frágeis." },
    { level: 2, title: "Como avançar", purpose: "Fechar com próximos passos concretos." },
  ];
  const sections = outline
    .filter((item) => Number(item.level) === 2)
    .map((item) => `## ${String(item.title || "Seção")}\n\n${String(item.purpose || "Desenvolver esta seção com orientação pública, evidência proporcional e próximos passos claros.")}`)
    .join("\n\n");
  return `---\ntitle: ${yamlString(topic)}\nslug: ${yamlString(slug)}\npublished_at: ${yamlString(publishedAt)}\nsource_url: ${yamlString(sourceUrl)}\norigem: ${yamlString(origem)}\narea: ${yamlString(area)}\npublic_content: true\nprimary_keyword: ${yamlString(keyword)}\nbrief_path: ${yamlString(`workbench/content/${slug}/brief.yaml`)}\ncontext_evidence_path: ${yamlString(contextEvidencePath)}\nvoice_filled: ${voiceFilled}\ntarget_words: ${targetWords}\nsource_policy: frontmatter-consulted-sources\nsources:\n${evidenceSources.map((source) => `  - ${yamlString(source)}`).join("\n") || "  - \"not-serp-backed\""}\n---\n\n# ${topic}\n\n${topic} precisa responder à intenção de busca com clareza, utilidade e limites explícitos. Para quem pesquisa por ${keyword}, o conteúdo deve explicar o conceito, mostrar aplicação prática e evitar promessas que não possam ser sustentadas.\n\n${sections}\n`;
}

function writeDraft(projectRoot, brief) {
  const slug = String(brief.topic_slug || "").trim();
  if (!slug) throw new Error("missing topic_slug for draft");
  const artifactDir = join(projectRoot, "artifacts", "contents", slug);
  mkdirSync(artifactDir, { recursive: true });
  const draftPath = join(artifactDir, "draft.md");
  writeFileSync(draftPath, renderDraft(brief), "utf8");
  return draftPath;
}
function resolveBriefPath(projectRoot, input) {
  const candidates = [
    resolve(input),
    resolve(projectRoot, input),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`brief not found: ${input}`);
  return found;
}
function validateBriefForApproval(brief, projectRoot) {
  const errors = [];
  if (!brief.topic) errors.push("missing-topic");
  if (!brief.topic_slug) errors.push("missing-topic-slug");
  if (!brief.keyword) errors.push("missing-keyword");
  if (!brief.brief || typeof brief.brief !== "object") errors.push("missing-brief-object");
  if (!brief.brief?.public_content_type) errors.push("missing-public-content-type");
  if (!brief.approval || typeof brief.approval !== "object") errors.push("missing-approval");
  if (brief.approval?.status && !["pending", "needs-rewrite"].includes(brief.approval.status)) errors.push("approval-not-pending");
  const seo = brief.data_provenance?.seo_analysis;
  if (!seo || typeof seo !== "object") errors.push("missing-seo-provenance");
  if (!brief.process_bypass && (!seo?.path || !existsSync(resolve(projectRoot, seo.path)))) errors.push("missing-seo-analysis-file");
  const bypasses = Array.isArray(brief.process_bypass) ? brief.process_bypass : brief.process_bypass ? [brief.process_bypass] : [];
  for (const bypass of bypasses) {
    if (!bypass.reason || !bypass.consequence) errors.push("incomplete-process-bypass");
  }
  if (!Array.isArray(brief.evidence_sources) || !brief.evidence_sources.length) {
    if (!brief.process_bypass) errors.push("missing-evidence-sources");
  }
  const competitorPath = brief.competitor_evidence?.path || brief.data_provenance?.competitor_evidence?.path;
  if (!competitorPath || !existsSync(resolve(projectRoot, competitorPath))) errors.push("missing-competitor-evidence-file");
  if (!Array.isArray(brief.serp_competitor_domains)) errors.push("missing-serp-competitor-domains");
  if (!Array.isArray(brief.forbidden_prose_terms)) errors.push("missing-forbidden-prose-terms");
  if (!brief.voice_context || !("filled" in brief.voice_context)) errors.push("missing-voice-context");
  if (brief.brief?.outline_capacity?.can_support_target !== true) errors.push("outline-cannot-support-target");
  const context = brief.context_evidence;
  if (!context || typeof context !== "object") errors.push("missing-context-evidence");
  else {
    if (!context.path || !existsSync(resolve(projectRoot, context.path))) errors.push("missing-context-evidence-file");
    const brainPages = Array.isArray(context.brain_pages_read) ? context.brain_pages_read : [];
    if (!brainPages.length) errors.push("missing-brain-pages-read");
    for (const page of brainPages) {
      if (!page?.path || !("content_hash_sha256" in page)) errors.push(`invalid-brain-evidence:${page?.path || "unknown"}`);
      if (page?.filled !== false && !page?.content_hash_sha256) errors.push(`missing-brain-hash:${page?.path || "unknown"}`);
    }
    const voice = context.voice_evidence;
    if (!voice || typeof voice !== "object" || !voice.path || !("content_hash_sha256" in voice)) errors.push("missing-voice-evidence");
    if (voice?.filled !== false && !voice?.content_hash_sha256) errors.push("missing-voice-hash");
  }
  return errors;
}
export function buildContext({ projectRoot, briefPath }) {
  if (!existsSync(briefPath)) throw new Error(`brief not found: ${briefPath}`);
  const text = readFileSync(briefPath, "utf8");
  const brief = parseBrief(text, briefPath);
  const errors = validateBriefForApproval(brief, projectRoot);
  if (errors.length) throw new Error(`invalid content brief: ${errors.join(", ")}`);
  const briefMarkdown = readBriefMarkdown(briefPath);
  const combinedHash = sha256(`${text}\n---brief-markdown---\n${briefMarkdown.text}`);
  return {
    projectRoot,
    briefPath,
    briefRel: relative(projectRoot, briefPath),
    briefMarkdownPath: briefMarkdown.path,
    briefMarkdownRel: briefMarkdown.path ? relative(projectRoot, briefMarkdown.path) : null,
    briefMarkdown: briefMarkdown.text,
    hash: combinedHash,
    brief,
  };
}
export async function handleSubmit(body, ctx) {
  const { decision, approver, notes } = body || {};
  if (!VALID_DECISIONS.has(decision)) return { ok: false, reason: "invalid-decision" };
  if (!approver || !approver.trim()) return { ok: false, reason: "missing-approver" };
  const fresh = readFileSync(ctx.briefPath, "utf8");
  const freshMarkdown = ctx.briefMarkdownPath && existsSync(ctx.briefMarkdownPath) ? readFileSync(ctx.briefMarkdownPath, "utf8") : "";
  if (sha256(`${fresh}\n---brief-markdown---\n${freshMarkdown}`) !== ctx.hash) return { ok: false, reason: "brief-modified" };
  let brief;
  try {
    brief = parseBrief(fresh, ctx.briefPath);
  } catch {
    return { ok: false, reason: "invalid-brief-yaml" };
  }
  const errors = validateBriefForApproval(brief, ctx.projectRoot);
  if (errors.length) return { ok: false, reason: `invalid-content-brief:${errors.join(",")}` };

  const approverClean = approver.trim();
  const status = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "needs-rewrite";
  const voiceFilled = brief.context_evidence?.voice_evidence?.filled === true || brief.voice_context?.filled === true;
  if (status === "approved" && !voiceFilled && !/\b(voz|voice|tom)\b/i.test(notes || "")) {
    return { ok: false, reason: "voice-context-not-acknowledged" };
  }
  writeIdentity(approverClean);
  const today = todayIso();
  brief.approval = {
    mode: brief.approval?.mode || "handoff",
    status,
    aprovador: status === "approved" ? approverClean : null,
    aprovado_em: status === "approved" ? today : null,
    decided_at: new Date().toISOString(),
    notes: notes?.trim() || null,
  };
  let draftPath = null;
  if (status === "approved") {
    draftPath = writeDraft(ctx.projectRoot, brief);
    brief.draft_status = "draft";
    brief.draft_path = relative(ctx.projectRoot, draftPath);
  } else {
    brief.draft_status = status;
  }
  writeFileSync(ctx.briefPath, serializeBrief(brief, ctx.briefPath), "utf8");

  appendLogEntry(join(ctx.projectRoot, "brain", "log.md"), {
    date: today,
    tipo: "decisao",
    titulo: `${brief.topic} · ${status}`,
    escopo: [ctx.briefRel, ...(draftPath ? [relative(ctx.projectRoot, draftPath)] : [])],
    decisao: status === "approved" ? `Briefing ${ctx.briefRel} aprovado e draft gerado em artifacts.` : `Briefing ${ctx.briefRel} marcado como ${status}.`,
    evidencia: ctx.briefRel,
    aprovador: approverClean,
    aprovado_em: status === "approved" ? today : null,
    notas: notes?.trim() || null,
  });
  return { ok: true, status, approver: approverClean, brief: ctx.briefPath, draft: draftPath };
}
export async function runApproveBriefing(argv = []) {
  const args = parseArgs(argv);
  if (args.project) throw new Error("--project is no longer supported; Agentic SEO uses the single project at project/.");
  const projectRootArg = args["project-root"] ?? process.env.CLAUDE_PLUGIN_OPTION_project_dir ?? process.env.AGENTIC_SEO_PROJECT_DIR ?? "project";
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
      briefMarkdownRel: ctx.briefMarkdownRel,
      briefMarkdown: ctx.briefMarkdown,
      brief: ctx.brief,
      identity: readIdentity(),
    },
    onSubmit: (body) => handleSubmit(body, ctx),
  });
}
