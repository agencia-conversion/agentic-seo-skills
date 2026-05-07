import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-bypass-"));
const projectRoot = join(tmp, "project");
mkdirSync(join(projectRoot, "wiki", "log"), { recursive: true });

const { buildContext, handleSubmit } = await import("../scripts/lib/companion-types/dataforseo-bypass.mjs");

const ctx = buildContext({
  workflow: "content-seo",
  step: "dataforseo-serp-extract",
  subject: "seo técnico",
  reason: "teste sem provider",
  consequence: "Briefing usa provedor secundário e não é DataForSEO-backed.",
  "provider-used": "websearch",
});

const missingApprover = await handleSubmit({ reason: "x", confirmation_text: "Confirmo seguir sem DataForSEO." }, ctx, projectRoot);
assert.deepEqual(missingApprover, { ok: false, reason: "missing-approver" });

const genericConfirmation = await handleSubmit({ approver: "Diego", reason: "x", confirmation_text: "Confirmo seguir assim." }, ctx, projectRoot);
assert.deepEqual(genericConfirmation, { ok: false, reason: "confirmation-must-mention-dataforseo-bypass" });

const ok = await handleSubmit({
  approver: "Diego Ivo",
  reason: "teste sem provider",
  confirmation_text: "Confirmo seguir sem DataForSEO neste fluxo.",
}, ctx, projectRoot);
assert.equal(ok.ok, true);
assert.equal(ok.approval.approved_by, "Diego Ivo");
assert.equal(ok.approval.reason, "teste sem provider");
assert.equal(ok.approval.provider_used, "websearch");
assert.match(ok.approval.confirmation_text, /sem DataForSEO/);
assert.ok(ok.approval.confirmed_at);

const log = readFileSync(join(projectRoot, "wiki", "log", "index.md"), "utf8");
assert.match(log, /Type: operational-decision/);
assert.match(log, /dataforseo-bypass \| seo técnico/);
assert.match(log, /Briefing usa provedor secundário/);

rmSync(tmp, { recursive: true, force: true });
console.log("companion dataforseo bypass ok");
