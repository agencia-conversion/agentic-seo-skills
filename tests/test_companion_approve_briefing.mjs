import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-brief-"));
process.env.HOME = tmp;
const projectRoot = join(tmp, "project");
mkdirSync(join(projectRoot, "wiki", "log"), { recursive: true });
mkdirSync(join(projectRoot, "workbench", "content"), { recursive: true });
writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");
const { buildContext, handleSubmit } = await import("../scripts/lib/companion-types/approve-briefing.mjs");

const baseBrief = {
  topic: "O que e SEO agentico",
  topic_slug: "o-que-e-seo-agentico",
  keyword: "seo agentico",
  keyword_slug: "seo-agentico",
  data_provenance: { seo_analysis: { path: "workbench/seo-analysis/seo-agentico.json", provider: "websearch" } },
  brief: { intent: "informational", reader_need: "entender sem hype", must_include: ["definicao"], must_avoid: ["slop"], outline: [{ level: 1, title: "O que e SEO agentico", purpose: "abrir" }] },
  voice_check: { audience: "leitor publico", link_test: "link removed" },
  voice_context: { path: "wiki/tom-de-voz/index.md", status: "draft", title: "Tom de voz" },
  approval: { mode: "handoff", status: "pending", approved_by: null, decided_at: null, notes: null },
  draft_status: "briefing",
};

function writeBrief(name, override = {}) {
  const file = join(projectRoot, "workbench", "content", name);
  writeFileSync(file, JSON.stringify({ ...baseBrief, ...override }, null, 2) + "\n");
  return file;
}

{
  const file = writeBrief("approve.brief.json");
  const ctx = buildContext({ projectRoot, briefPath: file });
  const result = await handleSubmit({ decision: "approved", approver: "Diego Ivo", notes: "pauta ok" }, ctx);
  assert.equal(result.ok, true);
  assert.equal(result.status, "approved");
  const updated = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(updated.approval.status, "approved");
  assert.equal(updated.approval.approved_by, "Diego Ivo");
  assert.equal(updated.draft_status, "approved-for-writing");
  const log = readFileSync(join(projectRoot, "wiki", "log", "index.md"), "utf8");
  assert.ok(log.includes("Type: operational-decision"));
  assert.ok(log.includes("Decision: approved"));
  assert.ok(log.includes("Notes: pauta ok"));
}

{
  const file = writeBrief("rewrite.brief.json");
  const ctx = buildContext({ projectRoot, briefPath: file });
  const result = await handleSubmit({ decision: "needs-rewrite", approver: "Diego", notes: "falta recorte" }, ctx);
  assert.equal(result.ok, true);
  const updated = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(updated.approval.status, "needs-rewrite");
  assert.equal(updated.approval.approved_by, null);
  assert.equal(updated.draft_status, "needs-rewrite");
}

{
  const file = writeBrief("missing-approver.brief.json");
  const ctx = buildContext({ projectRoot, briefPath: file });
  const result = await handleSubmit({ decision: "approved", approver: " " }, ctx);
  assert.deepEqual(result, { ok: false, reason: "missing-approver" });
}

{
  const file = writeBrief("stale.brief.json");
  const ctx = buildContext({ projectRoot, briefPath: file });
  writeFileSync(file, JSON.stringify({ ...baseBrief, topic: "editado" }, null, 2) + "\n");
  const result = await handleSubmit({ decision: "approved", approver: "Diego" }, ctx);
  assert.deepEqual(result, { ok: false, reason: "brief-modified" });
}

{
  const file = writeBrief("invalid.brief.json", { brief: undefined, topic: undefined });
  assert.throws(() => buildContext({ projectRoot, briefPath: file }), /invalid content brief/);
}

rmSync(tmp, { recursive: true, force: true }); console.log("companion approve-briefing ok");
