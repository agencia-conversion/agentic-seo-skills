#!/usr/bin/env node
/* SPDX-License-Identifier: MIT
 * Forked from coreyhaines31/marketingskills tools/clis/dataforseo.js
 * Upstream commit: 906c2fb28e471c5b1d149d4159ec5ddb40b7c364
 * Local changes: credential status, home credential lookup, offline fixtures,
 * dry-run output, stable JSON errors, and SEO Brain endpoint naming.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BASE_URL = "https://api.dataforseo.com/v3";

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      result._.push(arg);
      continue;
    }
    const key = arg.slice(2).replaceAll("-", "_");
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) result[key] = true;
    else {
      result[key] = next;
      i++;
    }
  }
  return result;
}

function readHomeCredentials() {
  const file = path.join(os.homedir(), ".seo-brain", "credentials.json");
  if (!fs.existsSync(file)) return { source: null, credentials: {} };
  try {
    return { source: file, credentials: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { source: file, credentials: {} };
  }
}

function loadCredentials() {
  const home = readHomeCredentials();
  const login = process.env.DATAFORSEO_LOGIN || home.credentials.dataforseo_login;
  const password = process.env.DATAFORSEO_PASSWORD || home.credentials.dataforseo_password;
  return {
    login,
    password,
    source: process.env.DATAFORSEO_LOGIN || process.env.DATAFORSEO_PASSWORD ? "env" : home.source,
    configured: Boolean(login && password),
  };
}

function ok(payload) {
  console.log(JSON.stringify({ ok: true, provider: "dataforseo", ...payload }, null, 2));
}

function fail(message, code = 1, extra = {}) {
  console.error(JSON.stringify({ ok: false, provider: "dataforseo", error: message, ...extra }, null, 2));
  process.exit(code);
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function commonSettings(args) {
  return {
    location_name: args.location || "United States",
    location_code: args.location_code ? Number(args.location_code) : 2840,
    language_name: args.language || "English",
    language_code: args.language_code || "en",
    limit: args.limit ? Number(args.limit) : 100,
  };
}

function offlineResponse(command, subcommand, args) {
  const settings = commonSettings(args);
  if (command === "serp" && subcommand === "google") {
    const keyword = args.keyword || "fixture keyword";
    return {
      mode: "offline",
      endpoint: "/serp/google/organic/live/advanced",
      tasks: [{
        result: [{
          keyword,
          location_name: settings.location_name,
          language_name: settings.language_name,
          items: [],
        }],
      }],
    };
  }
  if (command === "keywords" && subcommand === "volume") {
    const keywords = splitList(args.keywords || args.keyword);
    return {
      mode: "offline",
      endpoint: "/keywords_data/google_ads/search_volume/live",
      tasks: [{ result: keywords.map((keyword) => ({ keyword, search_volume: null, competition: null, cpc: null })) }],
    };
  }
  if (command === "keywords" && subcommand === "suggestions") {
    return {
      mode: "offline",
      endpoint: "/dataforseo_labs/google/keyword_suggestions/live",
      tasks: [{ result: [{ seed_keyword: args.keyword || null, items_count: 0, items: [] }] }],
    };
  }
  if (command === "backlinks") {
    return {
      mode: "offline",
      endpoint: `/backlinks/${subcommand}/live`,
      tasks: [{ data: { target: args.target || null }, result: [] }],
    };
  }
  return { mode: "offline", command, subcommand, tasks: [] };
}

async function api(method, endpoint, body, args) {
  if (args.offline) return offlineResponse(args._[0], args._[1], args);
  if (args.dry_run) return { mode: "dry-run", method, url: `${BASE_URL}${endpoint}`, headers: { Authorization: "***", "Content-Type": "application/json" }, body };
  const credentials = loadCredentials();
  if (!credentials.configured) fail("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD required, or configure ~/.seo-brain/credentials.json");
  const auth = "Basic " + Buffer.from(`${credentials.login}:${credentials.password}`).toString("base64");
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, body: text };
  }
}

function help() {
  ok({
    commands: {
      status: "show credential status without exposing secrets",
      serp: "serp google --keyword <kw> [--offline|--dry-run]",
      keywords: "keywords volume|suggestions --keywords <a,b> [--offline|--dry-run]",
      backlinks: "backlinks summary|list|refdomains|anchors --target <domain> [--offline|--dry-run]",
      onpage: "onpage audit --url <url> [--dry-run]",
      labs: "labs competitors|ranked-keywords|domain-intersection ...",
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command = "help", subcommand] = args._;
  const settings = commonSettings(args);
  let result;

  if (command === "help" || args.help) return help();
  if (command === "status") {
    const credentials = loadCredentials();
    return ok({
      credentials: {
        configured: credentials.configured,
        source: credentials.source ? credentials.source.replace(os.homedir(), "~") : null,
        login_present: Boolean(credentials.login),
        password_present: Boolean(credentials.password),
      },
    });
  }

  if (command === "serp" && subcommand === "google") {
    if (!args.keyword) fail("--keyword required");
    result = await api("POST", "/serp/google/organic/live/advanced", [{
      keyword: args.keyword,
      location_name: settings.location_name,
      language_name: settings.language_name,
      device: args.device || "desktop",
    }], args);
  } else if (command === "keywords" && subcommand === "volume") {
    const keywords = splitList(args.keywords || args.keyword);
    if (!keywords.length) fail("--keywords required");
    result = await api("POST", "/keywords_data/google_ads/search_volume/live", [{
      keywords,
      location_code: settings.location_code,
      language_code: settings.language_code,
    }], args);
  } else if (command === "keywords" && subcommand === "suggestions") {
    if (!args.keyword) fail("--keyword required");
    result = await api("POST", "/dataforseo_labs/google/keyword_suggestions/live", [{
      keyword: args.keyword,
      location_code: settings.location_code,
      language_code: settings.language_code,
      limit: settings.limit,
    }], args);
  } else if (command === "backlinks" && ["summary", "list", "refdomains", "anchors"].includes(subcommand)) {
    if (!args.target) fail("--target required");
    const endpointBySubcommand = {
      summary: "/backlinks/summary/live",
      list: "/backlinks/backlinks/live",
      refdomains: "/backlinks/referring_domains/live",
      anchors: "/backlinks/anchors/live",
    };
    result = await api("POST", endpointBySubcommand[subcommand], [{
      target: args.target,
      limit: settings.limit,
      backlinks_status_type: args.backlinks_status_type || "live",
      mode: args.mode || "as_is",
    }], args);
  } else if (command === "onpage" && subcommand === "audit") {
    if (!args.url) fail("--url required");
    result = await api("POST", "/on_page/instant_pages", [{
      url: args.url,
      enable_javascript: args.no_js ? false : true,
    }], args);
  } else if (command === "labs" && ["competitors", "ranked-keywords"].includes(subcommand)) {
    if (!args.target) fail("--target required");
    const endpoint = subcommand === "competitors" ? "/dataforseo_labs/google/competitors_domain/live" : "/dataforseo_labs/google/ranked_keywords/live";
    result = await api("POST", endpoint, [{ target: args.target, location_code: settings.location_code, language_code: settings.language_code, limit: settings.limit }], args);
  } else if (command === "labs" && subcommand === "domain-intersection") {
    const targets = splitList(args.targets);
    if (targets.length < 2) fail("--targets required with at least two domains");
    const payload = { location_code: settings.location_code, language_code: settings.language_code, limit: settings.limit };
    targets.forEach((target, i) => { payload[`target${i + 1}`] = target; });
    result = await api("POST", "/dataforseo_labs/google/domain_intersection/live", [payload], args);
  } else {
    fail("Unknown command. Run `node tools/clis/dataforseo.js help`.", 1, { command, subcommand });
  }

  ok({ mode: args.offline ? "offline" : args.dry_run ? "dry-run" : "live", result });
}

main().catch((error) => fail(error.message));
