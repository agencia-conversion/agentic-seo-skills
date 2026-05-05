import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-uc2-"));
process.env.HOME = tmp;
const projectRoot = join(tmp, "projects", "test");

const wiki = join(projectRoot, "wiki");
mkdirSync(join(wiki, "fontes"), { recursive: true });
mkdirSync(join(wiki, "log"), { recursive: true });
mkdirSync(join(projectRoot, "sources", "manual"), { recursive: true });

writeFileSync(
  join(wiki, "eeat.md"),
  `---
title: "EEAT"
status: needs-review
pillar: estrategia
owner: human
last_reviewed: null
approved_by: null
approved_at: null
sources:
  - sources/manual/credentials.md
judgment_level: strategic
---

# EEAT

Estudo registrado em [credenciais](../sources/manual/credentials.md) e [briefing](../sources/manual/briefing.md).

Ver também [[index]] e [[pagina-inexistente]].
`,
);
writeFileSync(join(wiki, "fontes", "index.md"), "# Fontes\n\n- [credentials.md](../sources/manual/credentials.md)\n");
writeFileSync(join(wiki, "log", "index.md"), "# Log\n");
writeFileSync(join(wiki, "index.md"), "# Index\n");

const wikiPage = await import("../scripts/lib/wiki-page.mjs");
const { buildContext, handleSubmit } = await import("../scripts/lib/companion-types/approve-page.mjs");

const ctx = { ...buildContext({ projectRoot, fileRel: "wiki/eeat.md" }), projectRoot };
assert.equal(ctx.frontmatter.status, "needs-review");
assert.equal(ctx.isStrategic, true);
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

const finalText = readFileSync(ctx.filePath, "utf8");
assert.ok(finalText.includes("status: approved"), "frontmatter status updated");
const log = readFileSync(join(wiki, "log", "index.md"), "utf8");
assert.ok(log.includes("Type: strategic-approval"));
assert.ok(log.includes("Actor: Diego Ivo"));
assert.ok(log.includes("Decision: approved"));
assert.ok(log.includes("Notes: evidências consolidadas"));
assert.ok(/wiki-approve \| eeat approved\n\n- Type:/.test(log), "blank line preserved between heading and fields");

const fontes = readFileSync(join(wiki, "fontes", "index.md"), "utf8");
assert.ok(fontes.includes("briefing.md"), "missing source registered in fontes index");

writeFileSync(ctx.filePath, finalText + "\n<!-- modified -->\n");
const stale = await handleSubmit(
  { decision: "approved", approver: "Diego Ivo" },
  ctx,
  { setFrontmatterValue: fmStub },
);
assert.deepEqual({ ok: stale.ok, reason: stale.reason }, { ok: false, reason: "file-modified" });

rmSync(tmp, { recursive: true, force: true });
console.log("companion approve-page ok");
