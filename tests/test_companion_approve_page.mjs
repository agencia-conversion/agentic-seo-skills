import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-uc2-"));
process.env.HOME = tmp;
const projectRoot = join(tmp, "project");

const brain = join(projectRoot, "brain");
mkdirSync(brain, { recursive: true });
mkdirSync(join(projectRoot, "sources", "manual"), { recursive: true });

writeFileSync(
  join(brain, "identidade.md"),
  `---
title: "Identidade"
updated: "2026-05-07"
---

# Identidade

Estudo registrado em [credenciais](../sources/manual/credentials.md) e [briefing](../sources/manual/briefing.md).

Ver também [[index]] e [[pagina-inexistente]].
`,
);
writeFileSync(join(brain, "log.md"), "---\ntitle: \"Log\"\nupdated: \"2026-05-07\"\n---\n\n# Log\n\n## 2026-05-06 - Ingestao credentials\n\n- tipo: ingestao\n- escopo: ../sources/manual/credentials.md\n- decisao: Catalogada manualmente.\n- evidencia: ../sources/manual/credentials.md\n- aprovador: agent\n");
writeFileSync(join(brain, "index.md"), "---\ntitle: \"Index\"\nupdated: \"2026-05-07\"\n---\n\n# Index\n");

const _brainPage = await import("../scripts/lib/brain-page.mjs");
const { buildContext, handleSubmit } = await import("../scripts/lib/companion-types/approve-page.mjs");

const ctx = { ...buildContext({ projectRoot, fileRel: "brain/identidade.md" }), projectRoot };
assert.equal(ctx.frontmatter.title, "Identidade");
assert.equal(ctx.isAuthorial, true);
assert.equal(ctx.sources.length, 2, "two sources cited");
assert.deepEqual(ctx.missingSources, ["../sources/manual/briefing.md"]);
assert.deepEqual(ctx.brokenLinks, ["pagina-inexistente"]);
assert.equal(ctx.diff.hasPrevious, false);

const fmStub = (file, updates) => {
  let text = readFileSync(file, "utf8");
  for (const [k, v] of Object.entries(updates)) {
    const clean = String(v).replace(/^"|"$/g, "");
    const re = new RegExp(`^${k}:.*$`, "m");
    if (re.test(text)) text = text.replace(re, `${k}: ${clean === "null" ? "null" : clean}`);
    else text = text.replace(/^---\n/, `---\n${k}: ${clean}\n`);
  }
  writeFileSync(file, text);
};

const bad = await handleSubmit({ decision: "weird", approver: "Diego" }, ctx, { setFrontmatterValue: fmStub });
assert.deepEqual(bad, { ok: false, reason: "invalid-decision" });

const noApprover = await handleSubmit({ decision: "approved", approver: " " }, ctx, { setFrontmatterValue: fmStub });
assert.deepEqual(noApprover, { ok: false, reason: "missing-approver" });

const ok = await handleSubmit(
  { decision: "approved", approver: "Diego Ivo", notes: "evidências consolidadas", register_missing: true },
  ctx,
  { setFrontmatterValue: fmStub },
);
assert.equal(ok.ok, true);
assert.equal(ok.decision, "approved");
assert.equal(ok.approver, "Diego Ivo");
assert.deepEqual(ok.sources_registered, ["../sources/manual/briefing.md"]);
assert.ok(existsSync(ok.snapshot), "snapshot must exist");

const log = readFileSync(join(brain, "log.md"), "utf8");
assert.match(log, /## \d{4}-\d{2}-\d{2} - identidade approved/);
assert.match(log, /- tipo: aprovacao/);
assert.match(log, /- aprovador: Diego Ivo/);
assert.match(log, /- aprovado_em: \d{4}-\d{2}-\d{2}/);
assert.match(log, /- decisao: brain\/identidade\.md marcado como approved por Diego Ivo\./);
assert.match(log, /- notas: evidências consolidadas/);
assert.match(log, /## \d{4}-\d{2}-\d{2} - Ingestao de fonte: briefing\.md/, "missing source registered as tipo: ingestao");

writeFileSync(ctx.filePath, readFileSync(ctx.filePath, "utf8") + "\n<!-- modified -->\n");
const stale = await handleSubmit(
  { decision: "approved", approver: "Diego Ivo" },
  ctx,
  { setFrontmatterValue: fmStub },
);
assert.deepEqual({ ok: stale.ok, reason: stale.reason }, { ok: false, reason: "file-modified" });

rmSync(tmp, { recursive: true, force: true });
console.log("companion approve-page ok");
