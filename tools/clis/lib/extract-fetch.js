/* SPDX-License-Identifier: MIT
 * Plain fetch path for tools/clis/extract.js. Sends a Chrome-like User-Agent
 * and language headers, returns body text plus minimal response metadata so
 * the caller can run anti-bot detection before parsing.
 */

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchWithUa(url, { timeoutMs = 30000, locale = "pt-BR", userAgent = DEFAULT_USER_AGENT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": `${locale},${locale.split("-")[0]};q=0.9,en;q=0.6`,
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body, headers: res.headers, finalUrl: res.url };
  } catch (error) {
    return { ok: false, status: 0, body: "", headers: null, finalUrl: url, error: error.name === "AbortError" ? "timeout" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWithUa, DEFAULT_USER_AGENT };
