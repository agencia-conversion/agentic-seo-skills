#!/usr/bin/env node
/* SPDX-License-Identifier: MIT
 * Agentic SEO extract CLI.
 * Tries a plain fetch with a Chrome-like user agent first; if the response
 * looks blocked (anti-bot, 403/429/503, Cloudflare interstitial), escalates
 * to a real Chromium via Playwright (lazy-installed on first run). Parses
 * the HTML with @mozilla/readability and converts the main content to
 * Markdown via turndown.
 */

const { fetchWithUa } = require("./lib/extract-fetch");
const { fetchWithBrowser } = require("./lib/extract-playwright");
const { isAntiBot } = require("./lib/extract-detect");
const { parse } = require("./lib/extract-readability");

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { result._.push(arg); continue; }
    const key = arg.slice(2).replaceAll("-", "_");
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) result[key] = true;
    else { result[key] = next; i++; }
  }
  return result;
}

function fail(message, code = 1, extra = {}) {
  console.error(JSON.stringify({ ok: false, provider: "extract", error: message, ...extra }, null, 2));
  process.exit(code);
}

function ok(payload) {
  console.log(JSON.stringify({ ok: true, provider: "extract", ...payload }, null, 2));
}

function help() {
  ok({
    usage: "node tools/clis/extract.js --url <url> [--format markdown|json] [--no-fallback] [--timeout 45000] [--locale pt-BR]",
    notes: [
      "Default flow: fetch with Chrome UA -> if blocked, fall back to Playwright (lazy install).",
      "--no-fallback disables the browser path; the CLI fails if the fetch is blocked.",
    ],
  });
}

async function extract(url, args) {
  const timeout = Number(args.timeout || 45000);
  const locale = args.locale || "pt-BR";
  const fetchResult = await fetchWithUa(url, { timeoutMs: timeout, locale });
  const fetchBlocked = !fetchResult.ok || isAntiBot(fetchResult).blocked;
  let payload = fetchResult;
  let method = "fetch";
  if (fetchBlocked && !args.no_fallback) {
    try {
      payload = await fetchWithBrowser(url, { timeoutMs: timeout, locale });
      method = "playwright";
    } catch (error) {
      return fail(`fetch blocked and playwright unavailable: ${error.message}`, 2, { fetch_status: fetchResult.status, fetch_error: fetchResult.error || null });
    }
  } else if (fetchBlocked) {
    return fail("fetch blocked and --no-fallback set", 2, { fetch_status: fetchResult.status });
  }
  if (!payload.ok || !payload.body) return fail("empty response body", 3, { status: payload.status, method });
  const parsed = parse(payload.body, payload.finalUrl || url);
  return ok({
    url: payload.finalUrl || url,
    status: payload.status,
    extraction_method: method,
    title: parsed.title,
    excerpt: parsed.excerpt,
    byline: parsed.byline,
    language: parsed.language,
    date_published: parsed.date_published,
    headings: parsed.headings,
    body_markdown: args.format === "json" ? undefined : parsed.body_markdown,
    word_count: parsed.word_count,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._[0] === "help") return help();
  const url = args.url || args._[0];
  if (!url || typeof url !== "string") return fail("--url required");
  await extract(url, args);
}

main().catch((error) => fail(error.message));
