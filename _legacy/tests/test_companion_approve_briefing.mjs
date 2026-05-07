import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-brief-"));
process.env.HOME = tmp;
const projectRoot = join(tmp, "project");
mkdirSync(join(projectRoot, "wiki", "log"), { recursive: true });
mkdirSync(join(projectRoot, "workbench", "content"), { recursive: true });
mkdirSync(join(projectRoot, "workbench", "seo-analysis"), { recursive: true });
writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");
writeFileSync(join(projectRoot, "workbench", "seo-analysis", "seo-agentico.json"), "{}\n");
writeFileSync(join(projectRoot, "workbench", "content", "context-evidence.yaml"), "ok: true\n");
writeFileSync(join(projectRoot, "workbench", "content", "competitor-evidence.yaml"), "ok: true\n");
const { buildContext, handleSubmit } = await import("../scripts/lib/companion-types/approve-briefing.mjs");

const contextEvidence = {
  path: "workbench/content/context-evidence.yaml",
  wiki_pages_read: [
    { path: "wiki/index.md", title: "Mapa", status: "approved", approved_by: "Diego", approved_at: "2026-05-05", content_hash_sha256: "abc123", excerpts_used: ["Contexto aprovado"] },
  ],
  voice_evidence: {
    path: "wiki/tom-de-voz/index.md",
    title: "Tom de voz",
    status: "approved",
    approved_by: "Diego",
    approved_at: "2026-05-05",
    content_hash_sha256: "def456",
    patterns: ["Claro"],
    avoid: ["Exagero"],
    reference_phrases: ["Frase de referência"],
  },
  limitations: [],
};

const baseBrief = {
  topic: "O que é SEO agêntico",
  topic_slug: "o-que-e-seo-agentico",
  keyword: "seo agêntico",
  keyword_slug: "seo-agentico",
  language: "pt-BR",
  market: "Brasil",
  data_provenance: { seo_analysis: { path: "workbench/seo-analysis/seo-agentico.json", provider: "websearch" } },
  process_bypass: null,
  context_evidence: contextEvidence,
  competitor_evidence: { path: "workbench/content/competitor-evidence.yaml", required: true },
  evidence_sources: ["workbench/seo-analysis/seo-agentico.json"],
  public_citations: [{ title: "Referência pública", url: "https://example.com/referencia" }],
  serp_competitor_domains: ["competitor.example"],
  forbidden_prose_terms: ["competitor.example"],
  source_policy: { evidence_sources: "local only", public_citations: "canonical URLs" },
  skyscraper: { word_count: { target_words: 2000 } },
  brief: {
    public_content_type: "article",
    intent: "informational",
    reader_need: "entender sem hype",
    promise: "Explicar SEO agêntico em conteúdo público.",
    target_words: 2000,
    must_include: ["definição"],
    must_avoid: ["slop"],
    source_requirements: ["URLs públicas"],
    outline: [
      { level: 1, title: "O que é SEO agêntico", purpose: "abrir", word_budget: 0 },
      { level: 2, title: "O que é", purpose: "definir", word_budget: 500 },
      { level: 2, title: "Como funciona", purpose: "explicar", word_budget: 500 },
      { level: 2, title: "Como aplicar", purpose: "orientar", word_budget: 500 },
      { level: 2, title: "Como avançar", purpose: "fechar", word_budget: 500 },
    ],
    outline_capacity: { target_words: 2000, min_h2_sections: 4, planned_h2_sections: 4, planned_words: 2000, can_support_target: true, iterations: [] },
  },
  voice_context: { path: "wiki/tom-de-voz/index.md", status: "approved", title: "Tom de voz" },
  approval: { phase: "briefing", mode: "handoff", status: "pending", approved_by: null, decided_at: null, notes: null },
  draft_status: "briefing",
};

function mergeDeep(base, override) {
  const merged = { ...base, ...override };
  if (Object.hasOwn(override, "context_evidence")) merged.context_evidence = override.context_evidence;
  if (Object.hasOwn(override, "brief")) {
    merged.brief = override.brief && typeof override.brief === "object" ? { ...base.brief, ...override.brief } : override.brief;
  } else {
    merged.brief = { ...base.brief };
  }
  return merged;
}

function writeBrief(name, override = {}) {
  const file = join(projectRoot, "workbench", "content", name);
  writeFileSync(file, YAML.stringify(mergeDeep(baseBrief, override), { lineWidth: 0 }));
  writeFileSync(file.replace(/\.yaml$/, ".md"), "# Briefing em Markdown\n\nOutline publicável para revisão humana.\n", "utf8");
  return file;
}

function writeJsonBrief(name, override = {}) {
  const file = join(projectRoot, "workbench", "content", name);
  writeFileSync(file, JSON.stringify(mergeDeep(baseBrief, override), null, 2) + "\n");
  writeFileSync(file.replace(/\.json$/, ".md"), "# Briefing em Markdown\n\nOutline publicável para revisão humana.\n", "utf8");
  return file;
}

{
  const file = writeBrief("approve.brief.yaml");
  const ctx = buildContext({ projectRoot, briefPath: file });
  assert.match(ctx.briefMarkdown, /Outline publicável/);
  assert.ok(ctx.briefMarkdownRel.endsWith("approve.brief.md"));
  const result = await handleSubmit({ decision: "approved", approver: "Diego Ivo", notes: "pauta ok" }, ctx);
  assert.equal(result.ok, true);
  assert.equal(result.status, "approved");
  assert.ok(result.draft.endsWith("artifacts/contents/o-que-e-seo-agentico/draft.md"));
  assert.equal(existsSync(result.draft), true);
  const updated = YAML.parse(readFileSync(file, "utf8"));
  assert.equal(updated.approval.status, "approved");
  assert.equal(updated.approval.approved_by, "Diego Ivo");
  assert.equal(updated.draft_status, "draft");
  assert.equal(updated.draft_path, "artifacts/contents/o-que-e-seo-agentico/draft.md");
  const log = readFileSync(join(projectRoot, "wiki", "log", "index.md"), "utf8");
  assert.ok(log.includes("Type: operational-decision"));
  assert.ok(log.includes("Decision: approved"));
  assert.ok(log.includes("draft gerado automaticamente"));
}

{
  const draftVoice = { ...contextEvidence, voice_evidence: { ...contextEvidence.voice_evidence, status: "draft" } };
  const file = writeBrief("voice-draft.brief.yaml", { context_evidence: draftVoice, voice_context: { path: "wiki/tom-de-voz/index.md", status: "draft", title: "Tom de voz" } });
  const ctx = buildContext({ projectRoot, briefPath: file });
  const blocked = await handleSubmit({ decision: "approved", approver: "Diego", notes: "" }, ctx);
  assert.deepEqual(blocked, { ok: false, reason: "voice-context-not-acknowledged" });
  const accepted = await handleSubmit({ decision: "approved", approver: "Diego", notes: "Tom de voz em draft reconhecido." }, ctx);
  assert.equal(accepted.ok, true);
  assert.equal(existsSync(accepted.draft), true);
}

{
  const file = writeBrief("rewrite.brief.yaml");
  const ctx = buildContext({ projectRoot, briefPath: file });
  const result = await handleSubmit({ decision: "needs-rewrite", approver: "Diego", notes: "falta recorte" }, ctx);
  assert.equal(result.ok, true);
  const updated = YAML.parse(readFileSync(file, "utf8"));
  assert.equal(updated.approval.status, "needs-rewrite");
  assert.equal(updated.approval.approved_by, null);
  assert.equal(updated.draft_status, "needs-rewrite");
}

{
  const file = writeBrief("incapable.brief.yaml", { brief: { outline_capacity: { target_words: 5700, min_h2_sections: 12, planned_h2_sections: 4, planned_words: 2000, can_support_target: false, iterations: [] } } });
  assert.throws(() => buildContext({ projectRoot, briefPath: file }), /outline-cannot-support-target/);
}

{
  const file = writeBrief("missing-approver.brief.yaml");
  const ctx = buildContext({ projectRoot, briefPath: file });
  const result = await handleSubmit({ decision: "approved", approver: " " }, ctx);
  assert.deepEqual(result, { ok: false, reason: "missing-approver" });
}

{
  const file = writeBrief("stale.brief.yaml");
  const ctx = buildContext({ projectRoot, briefPath: file });
  writeFileSync(file, YAML.stringify({ ...baseBrief, topic: "editado" }, { lineWidth: 0 }));
  const result = await handleSubmit({ decision: "approved", approver: "Diego" }, ctx);
  assert.deepEqual(result, { ok: false, reason: "brief-modified" });
}

{
  const file = writeBrief("stale-md.brief.yaml");
  const ctx = buildContext({ projectRoot, briefPath: file });
  writeFileSync(file.replace(/\.yaml$/, ".md"), "# Briefing alterado\n", "utf8");
  const result = await handleSubmit({ decision: "approved", approver: "Diego" }, ctx);
  assert.deepEqual(result, { ok: false, reason: "brief-modified" });
}

{
  const file = writeBrief("invalid.brief.yaml", { brief: undefined, topic: undefined });
  assert.throws(() => buildContext({ projectRoot, briefPath: file }), /invalid content brief/);
}

{
  const file = writeBrief("missing-context.brief.yaml", { context_evidence: null });
  assert.throws(() => buildContext({ projectRoot, briefPath: file }), /missing-context-evidence/);
}

{
  const file = writeBrief("missing-provenance.brief.yaml", { data_provenance: { seo_analysis: { path: null } }, evidence_sources: [] });
  assert.throws(() => buildContext({ projectRoot, briefPath: file }), /missing-seo-analysis-file/);
}

{
  const file = writeJsonBrief("legacy.brief.json");
  const ctx = buildContext({ projectRoot, briefPath: file });
  const result = await handleSubmit({ decision: "approved", approver: "Diego" }, ctx);
  assert.equal(result.ok, true);
  const updated = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(updated.approval.status, "approved");
  assert.equal(updated.draft_status, "draft");
  assert.equal(existsSync(result.draft), true);
}

rmSync(tmp, { recursive: true, force: true });
console.log("companion approve-briefing ok");
