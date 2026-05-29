// Shared DataForSEO credential validator. Single source of truth for the
// validation logic that used to be duplicated byte-for-byte between
// scripts/lib/companion-types/collect-env.mjs (CJS/ESM Node scripts) and
// apps/companion/src/lib/credentials.ts (TS, via dataforseo-validate.d.ts).
//
// `offline` mode short-circuits without a network call. Any other mode does a
// zero-cost call to the DataForSEO user_data endpoint and treats status_code
// 20000 as a successful validation.

export const DATAFORSEO_VALIDATE_URL = "https://api.dataforseo.com/v3/appendix/user_data";
export const DATAFORSEO_VALID_MODES = ["standard", "live", "async", "offline"];

export async function validateDataForSeo(login, password, mode, fetchImpl = fetch) {
  if (mode === "offline") {
    return { validated: false, reason: "offline-mode" };
  }
  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64");
    const resp = await fetchImpl(DATAFORSEO_VALIDATE_URL, {
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
