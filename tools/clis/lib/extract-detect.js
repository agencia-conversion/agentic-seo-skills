/* SPDX-License-Identifier: MIT
 * Anti-bot signal detection used by tools/clis/extract.js to decide whether
 * to escalate from plain fetch to a real browser.
 */

const ANTI_BOT_PATTERNS = [
  /Just a moment/i,
  /Checking your browser/i,
  /Cloudflare Ray ID/i,
  /cf-error-code/i,
  /Access Denied/i,
  /Pardon Our Interruption/i,
  /Please verify you are a human/i,
  /captcha/i,
  /are you a robot/i,
  /__cf_chl/i,
];

const BLOCKED_STATUS = new Set([401, 403, 405, 406, 429, 503]);

function isAntiBot({ status, body, headers }) {
  if (BLOCKED_STATUS.has(status)) return { blocked: true, reason: `status_${status}` };
  if (typeof body === "string" && body.length < 1500) {
    for (const pattern of ANTI_BOT_PATTERNS) {
      if (pattern.test(body)) return { blocked: true, reason: `pattern_${pattern.source}` };
    }
  }
  if (typeof body === "string") {
    for (const pattern of ANTI_BOT_PATTERNS) {
      if (pattern.test(body)) return { blocked: true, reason: `pattern_${pattern.source}` };
    }
  }
  if (headers && typeof headers.get === "function") {
    const server = headers.get("server") || "";
    const cf = headers.get("cf-ray") || headers.get("cf-cache-status") || "";
    if (cf && BLOCKED_STATUS.has(status)) return { blocked: true, reason: "cloudflare_blocked" };
    if (/cloudflare/i.test(server) && status >= 400) return { blocked: true, reason: "cloudflare_status" };
  }
  return { blocked: false };
}

module.exports = { isAntiBot };
