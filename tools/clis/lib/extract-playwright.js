/* SPDX-License-Identifier: MIT
 * Playwright fallback for tools/clis/extract.js. Lazy-installs Chromium on
 * first use (cached at the platform-default path), then loads the page in a
 * Chrome-like context and returns the rendered HTML for downstream parsing.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { DEFAULT_USER_AGENT } = require("./extract-fetch");

let cachedChromium = null;

function loadPlaywrightOrThrow() {
  try {
    return require("playwright");
  } catch (error) {
    throw new Error(
      "playwright is not installed. Run `npm install` at the plugin root, or `npm install playwright` standalone, then retry."
    );
  }
}

function browsersInstalled(playwright) {
  try {
    const exe = playwright.chromium.executablePath();
    return Boolean(exe && require("node:fs").existsSync(exe));
  } catch {
    return false;
  }
}

function runInstall(notice) {
  process.stderr.write(JSON.stringify({ phase: "browser_install", platform: process.platform, ...notice }) + "\n");
  const result = spawnSync("npx", ["--yes", "playwright", "install", "chromium"], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("playwright install chromium failed");
}

async function ensureChromium() {
  if (cachedChromium) return cachedChromium;
  const playwright = loadPlaywrightOrThrow();
  if (!browsersInstalled(playwright)) runInstall({ size_mb_estimate: 170 });
  cachedChromium = playwright.chromium;
  return cachedChromium;
}

async function fetchWithBrowser(url, { timeoutMs = 45000, locale = "pt-BR", viewport = { width: 1366, height: 900 }, userAgent = DEFAULT_USER_AGENT, waitMs = 2500 } = {}) {
  const chromium = await ensureChromium();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent, locale, viewport });
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (waitMs > 0) await page.waitForTimeout(waitMs);
    const body = await page.content();
    const finalUrl = page.url();
    const status = response ? response.status() : 0;
    return { ok: status >= 200 && status < 400, status, body, headers: null, finalUrl };
  } finally {
    await browser.close();
  }
}

module.exports = { fetchWithBrowser, ensureChromium };
