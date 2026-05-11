import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HOME = mkdtempSync(join(tmpdir(), "seo-brain-companion-"));

const { maskSecret } = await import("../scripts/lib/companion-state.mjs");
const { validateDataForSeo, handleSubmit, buildExistingSummary } = await import(
  "../scripts/lib/companion-types/collect-env.mjs"
);

assert.equal(maskSecret(""), "");
assert.equal(maskSecret("ab"), "**");
assert.equal(maskSecret("user@example.com"), "************.com");

const offline = await validateDataForSeo("x", "y", "offline");
assert.deepEqual(offline, { validated: false, reason: "offline-mode" });

const fakeOk = async () => ({
  ok: true,
  json: async () => ({ tasks: [{ status_code: 20000 }] }),
});
const okResult = await validateDataForSeo("login", "pw", "standard", fakeOk);
assert.equal(okResult.validated, true);
assert.ok(okResult.validated_at);

const fakeBadAuth = async () => ({ ok: false, status: 401, json: async () => ({}) });
const badAuth = await validateDataForSeo("login", "pw", "standard", fakeBadAuth);
assert.deepEqual(badAuth, { validated: false, reason: "http-401" });

const missing = await handleSubmit({ mode: "standard", approver: "Diego" });
assert.deepEqual(missing, { ok: false, reason: "missing-credentials" });

const defaultActor = await handleSubmit({ login: "a", password: "b", mode: "offline", approver: "" });
assert.equal(defaultActor.ok, true);
assert.equal(defaultActor.approver, "agent");

const badMode = await handleSubmit({ login: "a", password: "b", mode: "weird", approver: "Diego" });
assert.deepEqual(badMode, { ok: false, reason: "invalid-mode" });

const okSubmit = await handleSubmit({
  login: "user@example.com",
  password: "secret-api-pw",
  mode: "offline",
  approver: "  Diego Ivo  ",
});
assert.equal(okSubmit.ok, true);
assert.equal(okSubmit.approver, "Diego Ivo");
assert.equal(okSubmit.masked_login, "************.com");
assert.equal(okSubmit.mode, "offline");
assert.equal(okSubmit.validated, false);

const stat = statSync(okSubmit.target);
assert.equal(stat.mode & 0o777, 0o600, "credentials file must be 0600");
const persisted = JSON.parse(readFileSync(okSubmit.target, "utf8"));
assert.equal(persisted.dataforseo_login, "user@example.com");
assert.equal(persisted.dataforseo_mode, "offline");

const summary = buildExistingSummary();
assert.equal(summary.masked_login, "************.com");
assert.equal(summary.mode, "offline");

rmSync(process.env.HOME, { recursive: true, force: true });
console.log("companion collect-env ok");
