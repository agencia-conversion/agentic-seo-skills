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

const VALIDATE_URL = "https://api.dataforseo.com/v3/appendix/user_data";
const VALID_MODES = new Set(["standard", "live", "async", "offline"]);

export async function validateDataForSeo(login, password, mode, fetchImpl = fetch) {
  if (mode === "offline") {
    return { validated: false, reason: "offline-mode" };
  }
  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64");
    const resp = await fetchImpl(VALIDATE_URL, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!resp.ok) return { validated: false, reason: `http-${resp.status}` };
    const json = await resp.json();
    const status = json?.tasks?.[0]?.status_code;
    if (status === 20000) {
      return { validated: true, validated_at: new Date().toISOString() };
    }
    return { validated: false, reason: `dfs-status-${status}` };
  } catch (err) {
    return { validated: false, reason: `network: ${err.message}` };
  }
}

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
