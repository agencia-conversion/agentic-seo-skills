import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-bypass-"));
const projectRoot = join(tmp, "project");
mkdirSync(join(projectRoot, "brain"), { recursive: true });
writeFileSync(join(projectRoot, "brain", "log.md"), "---\ntitle: \"Log\"\nupdated: \"2026-05-07\"\n---\n\n# Log\n");

const { buildContext, handleSubmit } = await import("../scripts/lib/companion-types/dataforseo-bypass.mjs");

const ctx = buildContext({
  workflow: "content-seo",
  step: "dataforseo-serp-extract",
  subject: "seo técnico",
  reason: "teste sem provider",
  consequence: "Briefing usa provedor secundário e não é DataForSEO-backed.",
  "provider-used": "websearch",
});

const defaultActor = await handleSubmit({ reason: "x", confirmation_text: "Confirmo seguir sem DataForSEO." }, ctx, projectRoot);
assert.equal(defaultActor.ok, true);
assert.equal(defaultActor.approval.aprovador, "agent");

const genericConfirmation = await handleSubmit({ approver: "Diego", reason: "x", confirmation_text: "Confirmo seguir assim." }, ctx, projectRoot);
assert.equal(genericConfirmation.ok, true);

const ok = await handleSubmit({
  approver: "Diego Ivo",
  reason: "teste sem provider",
  confirmation_text: "Confirmo seguir sem DataForSEO neste fluxo.",
}, ctx, projectRoot);
assert.equal(ok.ok, true);
assert.equal(ok.approval.aprovador, "Diego Ivo");
assert.equal(ok.approval.reason, "teste sem provider");
assert.equal(ok.approval.provider_used, "websearch");
assert.match(ok.approval.confirmation_text, /sem DataForSEO/);
assert.ok(ok.approval.confirmado_em);

const log = readFileSync(join(projectRoot, "brain", "log.md"), "utf8");
assert.match(log, /tipo: decisao/);
assert.match(log, /DataForSEO bypass · seo técnico/);
assert.match(log, /Briefing usa provedor secundário/);

rmSync(tmp, { recursive: true, force: true });
console.log("companion dataforseo bypass ok");
