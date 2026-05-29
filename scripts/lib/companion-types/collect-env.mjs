// DEPRECATED: collect-env is superseded by the Web Companion credentials surface
// (Settings → Credenciais); kept for compatibility. New credential setup flows
// should point users to the Companion, which reads/writes the same home file
// (~/.agentic-seo/credentials.json, chmod 0600). Do not remove: other flows still
// reference this handoff.

import { runHandoff } from "../companion-server.mjs";
import {
  PATHS,
  newHandoffId,
  readIdentity,
  writeIdentity,
  readHomeCredentials,
  writeHomeCredentials,
  maskSecret,
  homeRelativePath,
} from "../companion-state.mjs";
// Single source of truth for the DataForSEO validator, shared with the
// Companion (apps/companion/src/lib/credentials.ts). Re-exported here so
// existing importers (tests, runtime) keep working unchanged.
import { validateDataForSeo } from "../../../shared/dataforseo-validate.mjs";

export { validateDataForSeo };

const VALID_MODES = new Set(["standard", "live", "async", "offline"]);

export function buildExistingSummary() {
  const data = readHomeCredentials();
  if (!data) return null;
  return {
    masked_login: maskSecret(data.dataforseo_login),
    mode: data.dataforseo_mode,
    updated_at: data.updated_at,
  };
}

export async function handleSubmit(body, { fetchImpl = fetch } = {}) {
  const { login, password, mode, approver } = body || {};
  if (!login || !password) return { ok: false, reason: "missing-credentials" };
  if (!VALID_MODES.has(mode)) return { ok: false, reason: "invalid-mode" };

  const validation = await validateDataForSeo(login, password, mode, fetchImpl);
  if (mode !== "offline" && !validation.validated) {
    return { ok: false, reason: "validation-failed", details: validation.reason };
  }

  const approverClean = String(approver || "agent").trim() || "agent";
  writeIdentity(approverClean);
  const target = writeHomeCredentials({
    dataforseo_login: login,
    dataforseo_password: password,
    dataforseo_mode: mode,
    updated_at: new Date().toISOString(),
  });

  return {
    ok: true,
    masked_login: maskSecret(login),
    mode,
    approver: approverClean,
    target,
    target_display: homeRelativePath(target),
    validated: validation.validated,
    validated_at: validation.validated_at ?? null,
  };
}

export async function runCollectEnv() {
  const id = newHandoffId();
  const contextData = {
    handoff: "collect-env",
    provider: "dataforseo",
    existing: buildExistingSummary(),
    identity: readIdentity(),
    target_display: homeRelativePath(PATHS.homeCredentials),
  };
  return runHandoff({
    id,
    templateName: "collect-env.html",
    contextData,
    extraTabs: [{ path: "/tutorial", template: "tutorials/dataforseo.html" }],
    onSubmit: (body) => handleSubmit(body),
  });
}
