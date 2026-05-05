#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { buildPlayerScoreReport } from "./lib/player-score";

type AnyRecord = Record<string, any>;
type Severity = "critical" | "error" | "warning" | "info";

const ROOT = path.resolve(__dirname, "..");
const PROJECT_DIR = resolveProjectDir();
const TEMPLATES_DIR = path.join(ROOT, "templates", "project");
const DATAFORSEO_MODES = new Set(["offline", "live", "standard", "async"]);
const BACKLINK_STATUS_TYPES = new Set(["all", "live", "lost"]);
const REQUIRED_WIKI_PAGES = [
  "index.md",
  "eeat.md",
  "schema.md",
  "estrategia/index.md",
  "llm-wiki/index.md",
  "tecnologia/index.md",
  "seo-tecnico/index.md",
  "tom-de-voz/index.md",
  "conteudos/index.md",
  "conteudos/topic-clusters.md",
  "dados-e-analise/index.md",
  "fontes/index.md",
  "log/index.md",
];
const STRATEGIC_PAGES = new Set(["index.md", "eeat.md", "tecnologia/index.md", "tom-de-voz/index.md"]);

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "-");
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!slug) throw new CliError("Slug is empty after normalization.");
  if (slug === "." || slug === ".." || slug.includes("/")) throw new CliError("Unsafe slug.");
  return slug;
}

function resolveProjectDir(): string {
  const configured = process.env.CLAUDE_PLUGIN_OPTION_project_dir || process.env.SEO_BRAIN_PROJECT_DIR;
  if (!configured) return path.join(ROOT, "project");
  return path.isAbsolute(configured) ? configured : path.resolve(ROOT, configured);
}

function ensureProject(): string {
  if (!fs.existsSync(PROJECT_DIR)) throw new CliError(`Project not found: ${PROJECT_DIR}. Run: bin/seo-brain project-init "Project name"`);
  return PROJECT_DIR;
}

function mkdirp(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(file: string, data: unknown): void {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(file: string, text: string): void {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, text, "utf8");
}

function readJson(file: string): AnyRecord {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
}

function appendLog(eventType: string, title: string, files: string[], summary: string, approval: string): void {
  const wikiLog = path.join(PROJECT_DIR, "wiki", "log", "index.md");
  mkdirp(path.dirname(wikiLog));
  const links = files.length ? files.map((f) => `[[${f}]]`).join(", ") : "n/a";
  fs.appendFileSync(
    wikiLog,
    `\n\n## [${today()}] ${eventType} | ${title}\n\n- Actor: agent\n- Files: ${links}\n- Summary: ${summary}\n- Approval: ${approval}\n`,
    "utf8",
  );
}

function parseFrontmatter(text: string): [AnyRecord, string] {
  if (!text.startsWith("---\n")) return [{}, text];
  const end = text.indexOf("\n---", 4);
  if (end === -1) return [{}, text];
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  const data: AnyRecord = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > -1 && !/^\s/.test(line)) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return [data, body];
}

export function setFrontmatterValue(file: string, updates: Record<string, string>): void {
  const text = fs.readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) {
    const lines = ["---", ...Object.entries(updates).map(([k, v]) => `${k}: ${v}`), "---", "", text];
    fs.writeFileSync(file, lines.join("\n"), "utf8");
    return;
  }
  const end = text.indexOf("\n---", 4);
  if (end === -1) throw new CliError(`Malformed frontmatter in ${file}`);
  let block = text.slice(4, end);
  const body = text.slice(end + 4);
  for (const [key, value] of Object.entries(updates)) {
    const pattern = new RegExp(`^${escapeRegExp(key)}:.*(?:\\n[ \\t].*)*`, "m");
    if (pattern.test(block)) block = block.replace(pattern, `${key}: ${value}`);
    else block = `${block.replace(/\n?$/, "\n")}${key}: ${value}\n`;
  }
  fs.writeFileSync(file, `---\n${block.replace(/\n+$/, "")}\n---${body}`, "utf8");
}

function readEnvFile(file = path.join(ROOT, ".env")): Record<string, string> {
  const values: Record<string, string> = {};
  if (!fs.existsSync(file)) return values;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    values[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

function readHomeCredentials(): AnyRecord {
  const file = path.join(homedir(), ".seo-brain", "credentials.json");
  if (!fs.existsSync(file)) return {};
  try {
    return readJson(file);
  } catch {
    return {};
  }
}

function getSecret(name: string): string {
  const home = readHomeCredentials();
  const homeKey = {
    DATAFORSEO_LOGIN: "dataforseo_login",
    DATAFORSEO_PASSWORD: "dataforseo_password",
    SEO_BRAIN_DATAFORSEO_MODE: "dataforseo_mode",
  }[name];
  return process.env[name] || readEnvFile()[name] || (homeKey ? home[homeKey] : "") || "";
}

function mask(value?: string): string {
  if (!value) return "missing";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function dataforseoCredentialsPresent(): boolean {
  const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
  const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
  return Boolean(login && password);
}

export function dataforseoCredentialStatus(): AnyRecord {
  const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
  const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
  const home = readHomeCredentials();
  return {
    dataforseo_login: mask(login),
    dataforseo_password: mask(password),
    dataforseo_configured: Boolean(login && password),
    home_credentials_present: Boolean(home.dataforseo_login && home.dataforseo_password),
    home_mode: home.dataforseo_mode || null,
  };
}

function resolveSeoProvider(prefer?: string): AnyRecord {
  const choice = (prefer || "auto").trim().toLowerCase();
  const hasCreds = dataforseoCredentialsPresent();
  if (choice === "websearch") return { provider: "websearch", reason: "Forced by --provider websearch." };
  if (choice === "dataforseo") {
    if (!hasCreds) throw new CliError("DataForSEO credentials missing. Set DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD or use --provider websearch.");
    return { provider: "dataforseo", reason: "Forced by --provider dataforseo." };
  }
  if (choice !== "auto") throw new CliError(`Unsupported provider preference: ${choice}. Use dataforseo, websearch, or auto.`);
  if (hasCreds) return { provider: "dataforseo", reason: "DataForSEO credentials present in environment." };
  return { provider: "websearch", reason: "DataForSEO credentials absent; falling back to websearch." };
}

async function dataforseoRequest(method: string, endpoint: string, payload?: unknown, sandbox = false): Promise<AnyRecord> {
  const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
  const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("DataForSEO credentials are missing.");
  const host = sandbox ? "https://sandbox.dataforseo.com" : "https://api.dataforseo.com";
  const response = await fetch(host + endpoint, {
    method,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(60000),
  });
  return (await response.json()) as AnyRecord;
}

function resolveDataforseoMode(args: AnyRecord): string {
  if (args.live) return "live";
  if (args.offline) return "offline";
  const configured =
    args.mode ||
    process.env.CLAUDE_PLUGIN_OPTION_dataforseo_mode ||
    process.env.SEO_BRAIN_DATAFORSEO_MODE ||
    readEnvFile().SEO_BRAIN_DATAFORSEO_MODE ||
    getSecret("SEO_BRAIN_DATAFORSEO_MODE") ||
    "standard";
  const mode = String(configured).trim().toLowerCase();
  if (!DATAFORSEO_MODES.has(mode)) throw new CliError(`Unsupported DataForSEO mode: ${mode}. Use one of: ${Array.from(DATAFORSEO_MODES).sort().join(", ")}.`);
  return mode;
}

function boolArg(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return !["0", "false", "no", "nao", "não"].includes(String(value).trim().toLowerCase());
}

function intArg(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function listArg(value: unknown): string[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function taskIdsFromResponse(response: AnyRecord): string[] {
  return (response.tasks || []).map((task: AnyRecord) => task.id).filter(Boolean);
}

export function taskResultReady(response: AnyRecord): boolean {
  const tasks = response.tasks || [];
  if (!tasks.length) return false;
  const task = tasks[0];
  if (task.result) return true;
  const statusCode = Number(task.status_code || response.status_code || 0);
  if (statusCode === 40601 || statusCode === 40602) return false;
  if (statusCode >= 40000) return true;
  return false;
}

async function dataforseoStandardTask(
  postEndpoint: string,
  getEndpointTemplate: string,
  payload: AnyRecord[],
  sandbox: boolean,
  pollInterval: number,
  timeout: number,
): Promise<AnyRecord> {
  const postResponse = await dataforseoRequest("POST", postEndpoint, payload, sandbox);
  const ids = taskIdsFromResponse(postResponse);
  if (!ids.length) return { mode: "standard", post_response: postResponse, tasks: postResponse.tasks || [] };
  const deadline = Date.now() + timeout * 1000;
  const taskGetResponses: AnyRecord[] = [];
  const pending = new Set(ids);
  while (pending.size && Date.now() < deadline) {
    for (const taskId of Array.from(pending)) {
      const response = await dataforseoRequest("GET", getEndpointTemplate.replace("{id}", taskId), undefined, sandbox);
      if (taskResultReady(response)) {
        taskGetResponses.push(response);
        pending.delete(taskId);
      }
    }
    if (pending.size) await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
  }
  if (pending.size) return { mode: "standard", status: "pending_timeout", post_response: postResponse, pending_task_ids: Array.from(pending).sort(), task_get_responses: taskGetResponses };
  if (taskGetResponses.length === 1) return { ...taskGetResponses[0], mode: "standard", post_response: postResponse };
  return { mode: "standard", post_response: postResponse, task_get_responses: taskGetResponses };
}

async function dataforseoAsyncTask(
  postEndpoint: string,
  payload: AnyRecord[],
  sandbox: boolean,
  pingbackUrl?: string,
  postbackUrl?: string,
  postbackData = "advanced",
): Promise<AnyRecord> {
  const enriched = payload.map((item) => ({
    ...item,
    ...(pingbackUrl ? { pingback_url: pingbackUrl } : {}),
    ...(postbackUrl ? { postback_url: postbackUrl, postback_data: postbackData } : {}),
  }));
  const response = await dataforseoRequest("POST", postEndpoint, enriched, sandbox);
  return {
    mode: "async",
    task_ids: taskIdsFromResponse(response),
    callback: { pingback_url: mask(pingbackUrl), postback_url: mask(postbackUrl), postback_data: postbackUrl ? postbackData : null },
    post_response: response,
  };
}

function parseAttrs(raw = ""): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) attrs[match[1].toLowerCase()] = htmlDecode(match[2] ?? match[3] ?? match[4] ?? "");
  return attrs;
}

function tags(html: string, name: string): Array<{ raw: string; attrs: Record<string, string> }> {
  const out: Array<{ raw: string; attrs: Record<string, string> }> = [];
  const pattern = new RegExp(`<${name}\\b([^>]*)>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) out.push({ raw: match[0], attrs: parseAttrs(match[1] || "") });
  return out;
}

function htmlDecode(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string): string {
  return htmlDecode(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractHtml(html: string, sourceUrl?: string): AnyRecord {
  const title = stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const meta: Record<string, string> = {};
  const metaTags = tags(html, "meta");
  for (const item of metaTags) {
    const key = (item.attrs.name || item.attrs.property || item.attrs["http-equiv"] || "").toLowerCase();
    if (key) meta[key] = item.attrs.content || "";
  }
  const linkTags = tags(html, "link").map((item) => item.attrs);
  const canonical = (linkTags.find((item) => (item.rel || "").toLowerCase().split(/\s+/).includes("canonical")) || {}).href || "";
  const hreflang = linkTags.filter((item) => (item.rel || "").toLowerCase().split(/\s+/).includes("alternate") && item.hreflang);
  const headings: AnyRecord[] = [];
  const headingPattern = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingPattern.exec(html))) headings.push({ level: `h${headingMatch[1]}`, text: stripTags(headingMatch[2]) });
  const images = tags(html, "img").map((item) => item.attrs);
  const anchors: AnyRecord[] = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorPattern.exec(html))) anchors.push({ ...parseAttrs(anchorMatch[1]), text: stripTags(anchorMatch[2]) });
  const scripts = tags(html, "script");
  const structuredData: AnyRecord[] = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptPattern.exec(html))) {
    const attrs = parseAttrs(scriptMatch[1]);
    if ((attrs.type || "").toLowerCase() !== "application/ld+json") continue;
    const raw = scriptMatch[2].trim();
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      structuredData.push(...nodes.map((node) => ({ valid: true, type: schemaType(node), raw_type: node?.["@type"] || null })));
    } catch {
      structuredData.push({ valid: false, type: null, raw_type: null });
    }
  }
  const htmlAttrs = parseAttrs((html.match(/<html\b([^>]*)>/i) || [])[1] || "");
  const body = (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || html;
  const bodyText = stripTags(body);
  const sourceHost = sourceUrl ? safeHost(sourceUrl) : "";
  const internalLinks = anchors.filter((a) => isInternalHref(a.href || "", sourceHost));
  const externalLinks = anchors.filter((a) => a.href && !isInternalHref(a.href, sourceHost) && !String(a.href).startsWith("#"));
  return {
    title,
    title_length: title.length,
    meta_description: meta.description || "",
    meta_description_length: (meta.description || "").length,
    meta_robots: meta.robots || "",
    canonical,
    lang: htmlAttrs.lang || "",
    viewport: meta.viewport || "",
    headings,
    h1_count: headings.filter((h) => h.level === "h1").length,
    h2_count: headings.filter((h) => h.level === "h2").length,
    images,
    images_total: images.length,
    images_missing_alt: images.filter((img) => !("alt" in img) || !String(img.alt).trim()).map((img) => img.src || ""),
    links: anchors,
    link_counts: { total: anchors.length, internal: internalLinks.length, external: externalLinks.length },
    hreflang,
    structured_data: structuredData,
    structured_data_blocks: structuredData.length,
    structured_data_valid_blocks: structuredData.filter((item) => item.valid).length,
    schema_types: Array.from(new Set(structuredData.map((item) => item.type).filter(Boolean))).sort(),
    open_graph: Object.fromEntries(Object.entries(meta).filter(([key]) => key.startsWith("og:"))),
    twitter: Object.fromEntries(Object.entries(meta).filter(([key]) => key.startsWith("twitter:"))),
    word_count: bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0,
    body_text_sample: bodyText.slice(0, 1000),
    forms_count: tags(html, "form").length,
    buttons_count: tags(html, "button").length,
    html_bytes: Buffer.byteLength(html, "utf8"),
  };
}

function schemaType(node: any): string | null {
  if (!node) return null;
  if (Array.isArray(node["@type"])) return node["@type"][0] || null;
  if (node["@type"]) return node["@type"];
  if (node["@graph"] && Array.isArray(node["@graph"])) return schemaType(node["@graph"][0]);
  return null;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function isInternalHref(href: string, sourceHost: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return true;
  if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) return true;
  try {
    return Boolean(sourceHost && new URL(href).host === sourceHost);
  } catch {
    return false;
  }
}

async function fetchUrl(url: string): Promise<{ status: number; html: string; finalUrl: string; headers: Record<string, string> }> {
  const response = await fetch(url, { headers: { "User-Agent": "SEO-Brain/0.2" }, signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  return { status: response.status, html, finalUrl: response.url, headers: Object.fromEntries(response.headers.entries()) };
}

type PageType = "home" | "ecommerce_product" | "service_product" | "blog" | "about" | "unknown";

function normalizePageType(input = "unknown"): PageType {
  const value = input.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "-");
  if (["home", "homepage", "inicial", "inicio", "index"].includes(value)) return "home";
  if (["ecommerce-product", "produto-ecommerce", "product-ecommerce", "produto-loja", "produto"].includes(value)) return "ecommerce_product";
  if (["service-product", "service", "servico", "produto-servico", "produto-ou-servico", "institucional", "institutional-product-service", "product-service"].includes(value)) return "service_product";
  if (["blog", "blog-post", "post", "article", "artigo"].includes(value)) return "blog";
  if (["about", "quem-somos", "sobre", "sobre-nos", "about-us"].includes(value)) return "about";
  return "unknown";
}

function hasSchema(extracted: AnyRecord, expected: string[]): boolean {
  const types = (extracted.schema_types || []).map((x: string) => x.toLowerCase());
  return expected.some((type) => types.includes(type.toLowerCase()));
}

function containsAny(haystack: string, needles: string[]): boolean {
  const text = haystack.toLowerCase();
  return needles.some((needle) => text.includes(needle));
}

function headingHierarchyOk(headings: AnyRecord[]): boolean {
  let previous = 0;
  for (const h of headings) {
    const level = Number(String(h.level).replace("h", ""));
    if (previous && level > previous + 1) return false;
    previous = level;
  }
  return true;
}

function check(pass: boolean, id: string, name: string, severity: Severity, weight: number, evidence: unknown, repair: string): AnyRecord {
  return { id, name, severity, weight, passed: pass, score_awarded: pass ? weight : 0, evidence, repair };
}

function auditTechnicalSeo(extracted: AnyRecord, options: { pageType: PageType; source: string; status: number | null; headers?: Record<string, string> }): AnyRecord {
  const checks: AnyRecord[] = [];
  const robots = String(extracted.meta_robots || "").toLowerCase();
  const xRobots = String(options.headers?.["x-robots-tag"] || "").toLowerCase();
  const h1s = extracted.headings.filter((h: AnyRecord) => h.level === "h1");
  const firstH1 = h1s[0]?.text || "";
  const allText = `${extracted.title} ${extracted.meta_description} ${extracted.headings.map((h: AnyRecord) => h.text).join(" ")} ${extracted.body_text_sample || ""}`.toLowerCase();
  const hasCanonicalUrl = Boolean(extracted.canonical && /^(https?:)?\/\//.test(extracted.canonical));

  checks.push(check(options.status === null || (options.status >= 200 && options.status < 300), "http_status_2xx", "HTTP status permits indexing", "critical", 8, { status: options.status }, "Return a stable 2xx response for the audited URL."));
  checks.push(check(!robots.includes("noindex") && !xRobots.includes("noindex"), "indexable_robots", "Robots directives are indexable", "critical", 8, { meta_robots: extracted.meta_robots || "", x_robots_tag: options.headers?.["x-robots-tag"] || "" }, "Remove noindex from pages that should rank."));
  checks.push(check(Boolean(extracted.title), "title_present", "Title tag exists", "error", 7, { title: extracted.title }, "Add one descriptive title tag."));
  checks.push(check(extracted.title_length >= 10 && extracted.title_length <= 65, "title_length", "Title length is controlled", "warning", 4, { length: extracted.title_length }, "Keep title roughly between 10 and 65 characters."));
  checks.push(check(Boolean(extracted.meta_description), "meta_description_present", "Meta description exists", "warning", 5, { meta_description: extracted.meta_description }, "Add a specific meta description for search snippets."));
  checks.push(check(extracted.meta_description_length >= 50 && extracted.meta_description_length <= 170, "meta_description_length", "Meta description length is controlled", "info", 3, { length: extracted.meta_description_length }, "Keep meta description roughly between 50 and 170 characters."));
  checks.push(check(h1s.length === 1, "single_h1", "Exactly one H1", "error", 7, { h1_count: h1s.length, h1: firstH1 }, "Use exactly one H1 that states the page topic."));
  checks.push(check(headingHierarchyOk(extracted.headings), "heading_hierarchy", "Heading hierarchy does not skip levels", "warning", 4, extracted.headings.slice(0, 8), "Use headings in order, without jumping from H1 to H3/H4."));
  checks.push(check(hasCanonicalUrl, "canonical_absolute", "Canonical URL is absolute", "warning", 5, { canonical: extracted.canonical }, "Add an absolute canonical URL."));
  checks.push(check(Boolean(extracted.lang), "html_lang", "HTML language is declared", "warning", 3, { lang: extracted.lang }, "Set the html lang attribute, for example pt-BR."));
  checks.push(check(Boolean(extracted.viewport), "viewport", "Viewport meta exists", "warning", 3, { viewport: extracted.viewport }, "Add a responsive viewport meta tag."));
  checks.push(check(extracted.images_missing_alt.length === 0, "image_alt", "Images have alt text or empty decorative alt", "warning", 5, { missing_alt_count: extracted.images_missing_alt.length, examples: extracted.images_missing_alt.slice(0, 5) }, "Add meaningful alt text, or alt=\"\" for decorative images."));
  checks.push(check(extracted.structured_data_blocks === extracted.structured_data_valid_blocks, "jsonld_valid", "JSON-LD blocks parse correctly", "error", 5, { blocks: extracted.structured_data_blocks, valid: extracted.structured_data_valid_blocks }, "Fix invalid JSON-LD so parsers can read it."));
  checks.push(check(extracted.link_counts.internal >= 1, "internal_links", "Internal links are present", "warning", 4, extracted.link_counts, "Add contextual internal links to relevant pages."));
  checks.push(check(Object.keys(extracted.open_graph || {}).length >= 2, "open_graph", "Open Graph metadata is present", "info", 2, Object.keys(extracted.open_graph || {}), "Add og:title and og:description or og:image for social previews."));

  const pageType = options.pageType;
  if (pageType === "home") {
    checks.push(check(hasSchema(extracted, ["Organization", "WebSite", "LocalBusiness"]), "home_schema", "Home has Organization/WebSite schema", "warning", 7, extracted.schema_types, "Add Organization and WebSite structured data."));
    checks.push(check(extracted.link_counts.internal >= 4, "home_navigation_depth", "Home links to core sections", "warning", 5, extracted.link_counts, "Link from home to services/products, content, about, and contact pages."));
    checks.push(check(extracted.word_count >= 250, "home_content_depth", "Home has enough crawlable copy", "info", 4, { word_count: extracted.word_count }, "Add concise crawlable copy describing the offer, audience, proof, and next step."));
  } else if (pageType === "ecommerce_product") {
    checks.push(check(hasSchema(extracted, ["Product"]), "product_schema", "Product schema exists", "error", 8, extracted.schema_types, "Add Product schema with name, image, offers, and availability when applicable."));
    checks.push(check(containsAny(allText, ["preco", "preço", "r$", "comprar", "estoque", "disponivel", "disponível"]), "product_commerce_signals", "Commerce signals are visible", "warning", 5, { matched_text_scope: "title/meta/headings" }, "Expose price, availability, buying action, or commercial terms in crawlable content."));
    checks.push(check(extracted.images_total >= 1, "product_image", "Product image exists", "warning", 4, { images_total: extracted.images_total }, "Include at least one product image with alt text."));
    checks.push(check(containsAny(allText, ["avaliacao", "avaliação", "review", "garantia", "entrega", "troca"]), "product_trust", "Product trust details are present", "info", 3, { matched_text_scope: "title/meta/headings" }, "Add review, warranty, shipping, return, or proof details when true."));
  } else if (pageType === "service_product") {
    checks.push(check(hasSchema(extracted, ["Service", "Product", "LocalBusiness", "ProfessionalService", "Organization"]), "service_schema", "Service/Product schema exists", "warning", 7, extracted.schema_types, "Add Service, Product, Organization, or LocalBusiness schema according to the offer."));
    checks.push(check(containsAny(allText, ["servico", "serviço", "solucao", "solução", "consultoria", "plano", "orcamento", "orçamento", "contato"]), "service_offer_clarity", "Offer and next step are clear", "warning", 5, { matched_text_scope: "title/meta/headings" }, "Make the offer, audience, and next step visible in crawlable content."));
    checks.push(check(extracted.link_counts.internal >= 2, "service_supporting_links", "Service page links to support content", "info", 3, extracted.link_counts, "Link to proof, cases, about, contact, FAQ, or related content."));
  } else if (pageType === "blog") {
    checks.push(check(hasSchema(extracted, ["Article", "BlogPosting", "NewsArticle"]), "article_schema", "Article schema exists", "warning", 7, extracted.schema_types, "Add Article or BlogPosting schema with headline, author, and date fields."));
    checks.push(check(extracted.word_count >= 500, "blog_depth", "Blog content has depth", "warning", 5, { word_count: extracted.word_count }, "Expand thin articles with original explanation, examples, and answers."));
    checks.push(check(extracted.h2_count >= 2, "blog_h2_structure", "Blog uses section H2s", "info", 3, { h2_count: extracted.h2_count }, "Use H2 sections that map to the searcher's questions."));
    checks.push(check(containsAny(allText, ["autor", "author", "atualizado", "publicado", "data"]), "blog_author_date_signals", "Author/date signals are visible", "info", 3, { matched_text_scope: "title/meta/headings" }, "Expose author and publish/update dates in crawlable content and schema."));
  } else if (pageType === "about") {
    checks.push(check(hasSchema(extracted, ["AboutPage", "Organization", "Person", "LocalBusiness"]), "about_schema", "About page schema exists", "warning", 7, extracted.schema_types, "Add AboutPage plus Organization/Person schema when appropriate."));
    checks.push(check(containsAny(allText, ["equipe", "historia", "história", "missao", "missão", "experiencia", "experiência", "fundador", "empresa"]), "about_identity", "Identity signals are visible", "warning", 5, { matched_text_scope: "title/meta/headings" }, "State who is behind the business, history, team, expertise, and mission when true."));
    checks.push(check(containsAny(allText, ["contato", "email", "telefone", "endereco", "endereço", "linkedin"]), "about_contact_trust", "Contact/trust path is visible", "info", 3, { matched_text_scope: "title/meta/headings" }, "Add a clear contact or verification path."));
  }

  const totalWeight = checks.reduce((sum, item) => sum + item.weight, 0);
  const awarded = checks.reduce((sum, item) => sum + item.score_awarded, 0);
  const score = totalWeight ? Math.round((awarded / totalWeight) * 100) : 0;
  const findings = checks
    .filter((item) => !item.passed)
    .map((item) => ({ severity: item.severity, check: item.id, message: item.name, evidence: item.evidence, repair: item.repair, weight: item.weight }))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.weight - a.weight);
  const priorities = findings.slice(0, 8).map((item, index) => ({
    priority: index + 1,
    check: item.check,
    severity: item.severity,
    evidence: item.evidence,
    recommended_action: item.repair,
  }));
  return {
    source: options.source,
    page_type: pageType,
    http_status: options.status,
    score,
    grade: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 50 ? "D" : "F",
    ok: !findings.some((f) => f.severity === "critical" || f.severity === "error"),
    extracted,
    checks,
    findings,
    llm_improvement_context: {
      instruction: "Use only deterministic findings as evidence. Do not invent metrics, backlinks, credentials, awards, clients, or proof.",
      page_type: pageType,
      score,
      priorities,
      passed_checks: checks.filter((item) => item.passed).map((item) => item.id),
    },
    generated_at: nowIso(),
  };
}

function severityRank(severity: string): number {
  return { critical: 0, error: 1, warning: 2, info: 3 }[severity] ?? 4;
}

function renderTechnicalMarkdown(report: AnyRecord): string {
  const lines = [
    `# Technical SEO - ${report.page_type}`,
    "",
    `- Source: ${report.source}`,
    `- Score: ${report.score}/100 (${report.grade})`,
    `- HTTP status: ${report.http_status ?? "n/a"}`,
    `- Generated at: ${report.generated_at}`,
    "",
    "## Priority fixes",
    "",
  ];
  if (!report.findings.length) lines.push("- No deterministic findings.");
  for (const finding of report.findings) lines.push(`- [${finding.severity}] ${finding.check}: ${finding.repair}`);
  lines.push("", "## Extracted signals", "", "```json", JSON.stringify(report.extracted, null, 2), "```", "");
  return `${lines.join("\n")}\n`;
}

function normalizeSerp(source: AnyRecord, keyword: string, location: string, language: string, device: string): AnyRecord {
  let tasks = source.tasks || [];
  if (source.task_get_responses) tasks = source.task_get_responses.flatMap((r: AnyRecord) => r.tasks || []);
  const items = tasks.length && tasks[0].result?.length ? tasks[0].result[0].items || [] : [];
  const organicResults = items
    .filter((item: AnyRecord) => item.type === "organic")
    .map((item: AnyRecord) => ({ rank_group: item.rank_group, rank_absolute: item.rank_absolute, title: item.title, url: item.url, domain: item.domain, snippet: item.description || item.snippet }));
  return {
    keyword,
    provider: tasks.length ? "dataforseo" : source.mode === "async" ? "dataforseo" : "offline",
    mode: source.mode || "unknown",
    task_ids: source.task_ids || taskIdsFromResponse(source.post_response || {}),
    pending_task_ids: source.pending_task_ids || [],
    timestamp: nowIso(),
    location,
    language,
    device,
    organic_results: organicResults,
    serp_features: Array.from(new Set(items.filter((item: AnyRecord) => item.type !== "organic").map((item: AnyRecord) => item.type || ""))).sort(),
  };
}

function normalizeKeywords(source: AnyRecord, keyword: string, location: string, language: string): AnyRecord {
  let tasks = source.tasks || [];
  if (source.task_get_responses) tasks = source.task_get_responses.flatMap((r: AnyRecord) => r.tasks || []);
  let items: AnyRecord[] = [];
  if (tasks.length) {
    for (const result of tasks[0].result || []) {
      items.push({ keyword: result.keyword || keyword, search_volume: result.search_volume, competition: result.competition, cpc: result.cpc, monthly_searches: result.monthly_searches });
    }
  } else {
    items = [{ keyword, search_volume: null, competition: null, cpc: null, monthly_searches: null }];
  }
  return {
    keyword,
    provider: tasks.length ? "dataforseo" : source.mode === "async" ? "dataforseo" : "offline",
    mode: source.mode || "unknown",
    task_ids: source.task_ids || taskIdsFromResponse(source.post_response || {}),
    pending_task_ids: source.pending_task_ids || [],
    timestamp: nowIso(),
    location,
    language,
    keywords: items,
    note: source.mode === "async" ? "Async task created; collect results via pingback/postback or task_get." : source.pending_task_ids ? "Task still pending; rerun task_get later." : tasks.length ? null : "Metrics unavailable without a provider call.",
  };
}

function taskForTarget(source: AnyRecord, target: string, index = 0): AnyRecord {
  const tasks = source.tasks || [];
  return tasks.find((task: AnyRecord) => task.data?.target === target) || tasks[index] || {};
}

function taskResult(source: AnyRecord, target: string, index = 0): AnyRecord {
  return taskForTarget(source, target, index).result?.[0] || {};
}

function taskItems(source: AnyRecord, target: string, index = 0): AnyRecord[] {
  return taskResult(source, target, index).items || [];
}

function taskResultValue(source: AnyRecord, target: string, key: string, index = 0): unknown {
  return taskResult(source, target, index)[key] ?? null;
}

function endpointStatus(source: AnyRecord, endpoint: string): AnyRecord {
  const task = (source.tasks || [])[0] || {};
  return {
    endpoint,
    status_code: source.status_code ?? null,
    status_message: source.status_message || null,
    task_status_code: task.status_code ?? null,
    task_status_message: task.status_message || null,
    cost: task.cost ?? null,
  };
}

function backlinkPayload(args: AnyRecord, target: string, limit: number): AnyRecord {
  return {
    target,
    limit,
    include_subdomains: boolArg(args.include_subdomains, true),
    backlinks_status_type: args.backlinks_status || "live",
  };
}

function backlinkSummary(result: AnyRecord): AnyRecord {
  return {
    backlinks: result.backlinks ?? null,
    referring_domains: result.referring_domains ?? null,
    referring_main_domains: result.referring_main_domains ?? null,
    rank: result.rank ?? null,
    spam_score: result.backlinks_spam_score ?? null,
  };
}

export function normalizeBacklinkReport(target: string, competitors: string[], source: AnyRecord, args: AnyRecord = {}): AnyRecord {
  const summarySource = source.summary || source;
  const ownSummary = backlinkSummary(taskResult(summarySource, target, 0));
  const backlinksTotalCount = taskResultValue(source.backlinks || {}, target, "total_count");
  const competitorComparison = competitors.map((competitor, i) => {
    const summary = backlinkSummary(taskResult(summarySource, competitor, i + 1));
    return {
      target: competitor,
      ...summary,
      backlink_delta_vs_target: summary.backlinks == null || ownSummary.backlinks == null ? null : summary.backlinks - ownSummary.backlinks,
      referring_domain_delta_vs_target: summary.referring_domains == null || ownSummary.referring_domains == null ? null : summary.referring_domains - ownSummary.referring_domains,
    };
  });
  const topReferringDomains = taskItems(source.referring_domains || {}, target).map((item) => ({
    domain: item.domain || item.domain_from || null,
    backlinks: item.backlinks ?? null,
    rank: item.rank ?? null,
    first_seen: item.first_seen || null,
    dofollow: item.backlinks_dofollow ?? null,
  }));
  const topAnchors = taskItems(source.anchors || {}, target).map((item) => ({
    anchor: item.anchor || null,
    backlinks: item.backlinks ?? null,
    referring_domains: item.referring_domains ?? null,
    rank: item.rank ?? null,
    spam_score: item.backlinks_spam_score ?? null,
  }));
  const sampleBacklinks = taskItems(source.backlinks || {}, target).map((item) => ({
    from: item.url_from || null,
    to: item.url_to || null,
    anchor: item.anchor || null,
    domain_from: item.domain_from || null,
    rank: item.rank ?? item.page_from_rank ?? null,
    dofollow: item.dofollow ?? null,
    first_seen: item.first_seen || null,
  }));
  const hasData = (summarySource.tasks || []).length > 0;
  const endpointStatuses = [
    source.summary ? endpointStatus(source.summary, "/v3/backlinks/summary/live") : null,
    source.referring_domains ? endpointStatus(source.referring_domains, "/v3/backlinks/referring_domains/live") : null,
    source.anchors ? endpointStatus(source.anchors, "/v3/backlinks/anchors/live") : null,
    source.backlinks ? endpointStatus(source.backlinks, "/v3/backlinks/backlinks/live") : null,
  ].filter(Boolean);
  return {
    target,
    competitors,
    provider: hasData ? "dataforseo" : "offline",
    mode: source.mode || "unknown",
    requested_mode: source.requested_mode || args.mode || null,
    timestamp: nowIso(),
    settings: source.settings || {},
    endpoints: source.endpoints || [],
    backlinks: ownSummary.backlinks ?? backlinksTotalCount,
    referring_domains: ownSummary.referring_domains,
    referring_main_domains: ownSummary.referring_main_domains,
    rank: ownSummary.rank,
    spam_score: ownSummary.spam_score,
    summary: ownSummary,
    top_referring_domains: topReferringDomains,
    top_anchors: topAnchors,
    sample_backlinks: sampleBacklinks,
    competitor_comparison: competitorComparison,
    endpoint_statuses: endpointStatuses,
    note:
      source.mode_note ||
      (source.mode === "offline"
        ? "Backlink metrics unavailable without a provider call."
        : "DataForSEO Backlinks API v3 is live-only; standard requests are executed through live endpoints for this skill."),
  };
}

function latestFile(directory: string, suffix: string): string | null {
  if (!fs.existsSync(directory)) return null;
  const files = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join(directory, name))
    .filter((file) => fs.statSync(file).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] || null;
}

function loadDataforseoSerpResults(projectDir: string, keyword: string, override?: string): AnyRecord[] {
  const file = override || latestFile(path.join(projectDir, "sources", "serp"), `-${slugify(keyword)}.normalized.json`);
  if (!file || !fs.existsSync(file)) return [];
  return readJson(file).organic_results || [];
}

function loadWebsearchResults(projectDir: string, keyword: string, override?: string): AnyRecord[] {
  const file = override || path.join(projectDir, "sources", "websearch", `${slugify(keyword)}.json`);
  if (!fs.existsSync(file)) return [];
  const data = readJson(file);
  return data.results || data.organic_results || [];
}

function loadKeywordMetrics(projectDir: string, keyword: string): AnyRecord | null {
  const file = latestFile(path.join(projectDir, "workbench", "keyword-research"), `-${slugify(keyword)}.json`);
  if (!file) return null;
  const primary = (readJson(file).keywords || [])[0];
  if (!primary || (primary.search_volume == null && primary.competition == null)) return null;
  return { search_volume: primary.search_volume, competition: primary.competition, cpc: primary.cpc, source_path: path.relative(projectDir, file) };
}

function projectSettings(projectDir: string): AnyRecord {
  const config = path.join(projectDir, ".seo-brain", "project.json");
  const wikiIndex = path.join(projectDir, "wiki", "index.md");
  let data: AnyRecord = {};
  if (fs.existsSync(config)) {
    try {
      data = readJson(config);
    } catch {
      data = {};
    }
  }
  if (fs.existsSync(wikiIndex)) {
    try {
      const [fm] = parseFrontmatter(fs.readFileSync(wikiIndex, "utf8"));
      data = { ...data, ...fm };
    } catch {
      // Keep project.json/defaults when the Wiki index is not parseable.
    }
  }
  const clean = (value: unknown, fallback: string) => String(value || fallback).trim().replace(/^["']|["']$/g, "");
  const market = clean(data.market, "Brasil");
  const language = clean(data.language, "pt-BR");
  return {
    market,
    country: clean(data.country, market),
    language,
    dataforseo_location: clean(data.dataforseo_location, market.toLowerCase() === "brasil" ? "Brazil" : market),
    dataforseo_language: clean(data.dataforseo_language, language.toLowerCase().startsWith("pt") ? "pt" : language.slice(0, 2).toLowerCase()),
  };
}

function projectDisplayName(projectDir: string): string {
  const config = path.join(projectDir, ".seo-brain", "project.json");
  if (!fs.existsSync(config)) return "SEO Brain";
  try {
    return String(readJson(config).name || "SEO Brain");
  } catch {
    return "SEO Brain";
  }
}

function shouldAutoOpenDataSetup(args: AnyRecord): boolean {
  if (args.handoff || args.web) return true;
  if (args.no_handoff || args.check || process.env.CI === "true") return false;
  return !dataforseoCredentialsPresent() && Boolean(process.stdin.isTTY || process.stdout.isTTY);
}

function runDataSetupHandoff(): AnyRecord {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "companion.mjs"), "collect-env"], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) return { ok: false, reason: result.error.message };
  if (result.status !== 0) return { ok: false, reason: `handoff-exit-${result.status}` };
  return { ok: true };
}

async function commandProjectInit(args: AnyRecord): Promise<void> {
  const name = args._[0] || "SEO Brain Project";
  const p = PROJECT_DIR;
  const language = args.language || "pt-BR";
  const market = args.market || "Brasil";
  const country = args.country || market;
  for (const dir of ["wiki", "web", "sources", "workbench", "artifacts", ".seo-brain"]) mkdirp(path.join(p, dir));
  copyDir(path.join(TEMPLATES_DIR, "wiki"), path.join(p, "wiki"));
  writeJson(path.join(p, ".seo-brain", "project.json"), { name, created_at: nowIso(), language, market, country, status: "draft" });
  const wikiIndex = path.join(p, "wiki", "index.md");
  setFrontmatterValue(wikiIndex, { language: JSON.stringify(language), market: JSON.stringify(market), country: JSON.stringify(country) });
  writeText(
    wikiIndex,
    fs.readFileSync(wikiIndex, "utf8")
      .replace(/- Pais\/mercado de atuacao: .*/, `- Pais/mercado de atuacao: ${country}.`)
      .replace(/- Idioma principal: .*/, `- Idioma principal: ${language}.`),
  );
  appendLog("init", "Projeto criado", ["index"], `Projeto ${name} inicializado.`, "pending");
  printJson({ ok: true, project_dir: p });
}

async function commandWikiLint(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  const wiki = path.join(p, "wiki");
  const findings: AnyRecord[] = [];
  for (const rel of REQUIRED_WIKI_PAGES) {
    const file = path.join(wiki, rel);
    if (!fs.existsSync(file)) {
      findings.push({ severity: "error", file: rel, message: "required Wiki page missing" });
      continue;
    }
    const [fm, body] = parseFrontmatter(fs.readFileSync(file, "utf8"));
    if (!("status" in fm)) findings.push({ severity: "warning", file: rel, message: "missing status frontmatter" });
    if (STRATEGIC_PAGES.has(rel) && fm.status === "approved" && !fm.approved_by) findings.push({ severity: "error", file: rel, message: "strategic page approved without approved_by" });
    for (const match of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const target = match[1].split("|", 1)[0].trim();
      const candidate = path.join(wiki, target.endsWith(".md") ? target : `${target}.md`);
      if (!fs.existsSync(candidate)) findings.push({ severity: "warning", file: rel, message: `broken wikilink: [[${match[1]}]]` });
    }
  }
  findings.push(...lintContentPublication(p));
  const result = { ok: !findings.some((f) => f.severity === "error"), findings };
  writeJson(path.join(p, "workbench", "wiki-lint.json"), result);
  appendLog("lint", "Wiki lint", ["workbench/wiki-lint.json"], `${findings.length} apontamentos encontrados.`, "not-required");
  printJson(result);
}

function lintContentPublication(projectDir: string): AnyRecord[] {
  const findings: AnyRecord[] = [];
  const contentDir = path.join(projectDir, "wiki", "conteudos");
  const briefsDir = path.join(projectDir, "workbench", "content");
  if (!fs.existsSync(contentDir)) return findings;
  for (const name of fs.readdirSync(contentDir)) {
    if (!name.endsWith(".md") || ["index.md", "topic-clusters.md"].includes(name)) continue;
    const brief = path.join(briefsDir, `${path.basename(name, ".md")}.brief.json`);
    if (!fs.existsSync(brief)) continue;
    let data: AnyRecord;
    try {
      data = readJson(brief);
    } catch {
      findings.push({ severity: "warning", file: `conteudos/${name}`, message: `brief is not valid JSON: ${path.relative(projectDir, brief)}` });
      continue;
    }
    const forbidden = (data.must_not_mention_in_prose || []).map((d: string) => String(d).trim().toLowerCase()).filter(Boolean);
    const [, body] = parseFrontmatter(fs.readFileSync(path.join(contentDir, name), "utf8"));
    const clean = body.replace(/```[\s\S]*?```/g, "").toLowerCase();
    for (const domain of forbidden) if (clean.includes(domain)) findings.push({ severity: "error", file: `conteudos/${name}`, message: `forbidden domain mentioned in prose: ${domain}` });
  }
  return findings;
}

async function commandWikiApprove(args: AnyRecord): Promise<void> {
  const rel = required(args, "page").replace(/^\/+/, "");
  const by = required(args, "by");
  const file = path.join(ensureProject(), "wiki", rel);
  if (!fs.existsSync(file)) throw new CliError(`Wiki page not found: ${file}`);
  setFrontmatterValue(file, { status: "approved", approved_by: JSON.stringify(by), approved_at: JSON.stringify(nowIso()), last_reviewed: JSON.stringify(today()) });
  appendLog("approval", rel, [rel.replace(/\.md$/, "")], `Pagina ${rel} aprovada por ${by}.`, "approved");
  printJson({ ok: true, approved: rel, by });
}

async function commandWikiIngest(args: AnyRecord): Promise<void> {
  const source = required(args, "source");
  if (!fs.existsSync(source)) throw new CliError(`Source not found: ${source}`);
  const p = ensureProject();
  const target = path.join(p, "sources", "manual", `${today()}-${slugify(path.basename(source, path.extname(source)))}${path.extname(source)}`);
  mkdirp(path.dirname(target));
  fs.copyFileSync(source, target);
  appendLog("ingest", path.basename(source), [path.relative(p, target)], "Fonte manual adicionada ao projeto.", "not-required");
  printJson({ ok: true, source: target });
}

async function commandDataSetup(args: AnyRecord): Promise<void> {
  if (shouldAutoOpenDataSetup(args)) {
    const handoff = runDataSetupHandoff();
    if (!handoff.ok) throw new CliError(`DataForSEO web setup failed: ${handoff.reason}`);
  }
  const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
  const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
  const mode = resolveDataforseoMode(args);
  const decision = resolveSeoProvider();
  const credentialStatus = dataforseoCredentialStatus();
  const status: AnyRecord = {
    dataforseo_login: credentialStatus.dataforseo_login,
    dataforseo_password: credentialStatus.dataforseo_password,
    default_mode: mode,
    dataforseo_configured: credentialStatus.dataforseo_configured,
    home_credentials_present: credentialStatus.home_credentials_present,
    websearch_available: true,
    provider_default: decision.provider,
    provider_default_reason: decision.reason,
    modes: {
      live: "ultrarrapido: usa endpoints /live; retorna em segundos e costuma custar mais.",
      standard: "medio: usa task_post + polling task_get; padrao do SEO Brain.",
      async: "assincrono: usa task_post com pingback_url/postback_url quando informado.",
      offline: "teste local: nao chama a DataForSEO.",
    },
    credentials_present: Boolean(login && password),
    checked_live: Boolean(args.check),
    setup_handoff_available: true,
    setup_handoff_command: "bin/seo-brain data-setup --handoff",
  };
  if (args.check) {
    try {
      const data = await dataforseoRequest("GET", "/v3/appendix/user_data", undefined, Boolean(args.sandbox));
      const task = (data.tasks || [{}])[0];
      const result = (task.result || [{}])[0];
      Object.assign(status, { live_ok: data.status_code === 20000, status_message: data.status_message, balance: result.money?.balance || result.balance });
    } catch (error) {
      Object.assign(status, { live_ok: false, error: String((error as Error).message || error) });
    }
  }
  printJson(status);
}

async function commandSerpExtract(args: AnyRecord): Promise<void> {
  const keyword = required(args, "keyword");
  const p = ensureProject();
  const settings = projectSettings(p);
  const mode = resolveDataforseoMode(args);
  const location = args.location || settings.dataforseo_location;
  const language = args.language || settings.dataforseo_language;
  const payload = [{ keyword, location_name: location, language_code: language, device: args.device || "desktop", depth: Number(args.depth || 10) }];
  let source: AnyRecord;
  if (mode === "live") source = { ...(await dataforseoRequest("POST", "/v3/serp/google/organic/live/advanced", payload, Boolean(args.sandbox))), mode: "live" };
  else if (mode === "standard") source = await dataforseoStandardTask("/v3/serp/google/organic/task_post", "/v3/serp/google/organic/task_get/advanced/{id}", payload, Boolean(args.sandbox), Number(args.poll_interval || 10), Number(args.timeout || 180));
  else if (mode === "async") source = await dataforseoAsyncTask("/v3/serp/google/organic/task_post", payload, Boolean(args.sandbox), args.pingback_url, args.postback_url, args.postback_data || "advanced");
  else source = { status_code: "offline", mode: "offline", tasks: [], note: "Run with --mode standard or --mode live to fetch DataForSEO SERP data." };
  const normalized = normalizeSerp(source, keyword, location, language, args.device || "desktop");
  const base = path.join(p, "sources", "serp", `${stamp()}-${slugify(keyword)}`);
  writeJson(`${base}.raw.json`, source);
  writeJson(`${base}.normalized.json`, normalized);
  writeJson(path.join(p, "workbench", "serp", `${stamp()}-${slugify(keyword)}.json`), normalized);
  appendLog("serp", keyword, [path.relative(p, `${base}.normalized.json`)], "SERP extraida e normalizada.", "not-required");
  printJson(normalized);
}

async function commandKeywordResearch(args: AnyRecord): Promise<void> {
  const keyword = required(args, "keyword");
  const p = ensureProject();
  const settings = projectSettings(p);
  const mode = resolveDataforseoMode(args);
  const location = args.location || settings.dataforseo_location;
  const language = args.language || settings.dataforseo_language;
  const payload = [{ keywords: [keyword], location_name: location, language_code: language }];
  let source: AnyRecord;
  if (mode === "live") source = { ...(await dataforseoRequest("POST", "/v3/keywords_data/google_ads/search_volume/live", payload, Boolean(args.sandbox))), mode: "live" };
  else if (mode === "standard") source = await dataforseoStandardTask("/v3/keywords_data/google_ads/search_volume/task_post", "/v3/keywords_data/google_ads/search_volume/task_get/{id}", payload, Boolean(args.sandbox), Number(args.poll_interval || 10), Number(args.timeout || 180));
  else if (mode === "async") source = await dataforseoAsyncTask("/v3/keywords_data/google_ads/search_volume/task_post", payload, Boolean(args.sandbox), args.pingback_url, args.postback_url, args.postback_data || "advanced");
  else source = { status_code: "offline", mode: "offline", tasks: [], note: "Run with --mode standard or --mode live to fetch DataForSEO keyword metrics." };
  const normalized = normalizeKeywords(source, keyword, location, language);
  const base = path.join(p, "sources", "keyword-research", `${stamp()}-${slugify(keyword)}`);
  writeJson(`${base}.raw.json`, source);
  writeJson(`${base}.normalized.json`, normalized);
  writeJson(path.join(p, "workbench", "keyword-research", `${stamp()}-${slugify(keyword)}.json`), normalized);
  appendLog("keyword-research", keyword, [path.relative(p, `${base}.normalized.json`)], "Pesquisa de keyword registrada.", "not-required");
  printJson(normalized);
}

async function commandBacklinkAnalysis(args: AnyRecord): Promise<void> {
  const target = required(args, "target");
  const p = ensureProject();
  const mode = resolveDataforseoMode(args);
  const competitors = listArg(args.competitors || args.competitor);
  const limit = intArg(args.limit, 10, 1, 1000);
  const includeSubdomains = boolArg(args.include_subdomains, true);
  const statusType = String(args.backlinks_status || "live").trim().toLowerCase();
  if (!BACKLINK_STATUS_TYPES.has(statusType)) throw new CliError(`Unsupported backlinks status: ${statusType}. Use all, live, or lost.`);
  args.backlinks_status = statusType;
  const summaryPayload = [target, ...competitors].map((item) => ({
    target: item,
    internal_list_limit: limit,
    include_subdomains: includeSubdomains,
    backlinks_status_type: statusType,
  }));
  const detailPayload = backlinkPayload(args, target, limit);
  let source: AnyRecord;
  if (mode === "live" || mode === "standard") {
    if (!dataforseoCredentialsPresent()) {
      if (shouldAutoOpenDataSetup(args)) {
        const handoff = runDataSetupHandoff();
        if (!handoff.ok) throw new CliError(`DataForSEO web setup failed: ${handoff.reason}`);
      }
      if (!dataforseoCredentialsPresent()) throw new CliError("DataForSEO credentials missing. Run: bin/seo-brain data-setup --handoff");
    }
    const summary = await dataforseoRequest("POST", "/v3/backlinks/summary/live", summaryPayload, Boolean(args.sandbox));
    const referringDomains = await dataforseoRequest("POST", "/v3/backlinks/referring_domains/live", [{ ...detailPayload, order_by: ["backlinks,desc"] }], Boolean(args.sandbox));
    const anchors = await dataforseoRequest("POST", "/v3/backlinks/anchors/live", [{ ...detailPayload, order_by: ["backlinks,desc"] }], Boolean(args.sandbox));
    const backlinks = await dataforseoRequest("POST", "/v3/backlinks/backlinks/live", [{ ...detailPayload, mode: args.backlink_mode || "as_is", order_by: ["rank,desc"] }], Boolean(args.sandbox));
    source = {
      mode: "live",
      requested_mode: mode,
      mode_note: mode === "standard" ? "DataForSEO Backlinks API supports only Live retrieval; standard maps to live for backlinks." : undefined,
      settings: { limit, include_subdomains: includeSubdomains, backlinks_status_type: statusType, backlink_mode: args.backlink_mode || "as_is" },
      endpoints: ["/v3/backlinks/summary/live", "/v3/backlinks/referring_domains/live", "/v3/backlinks/anchors/live", "/v3/backlinks/backlinks/live"],
      summary,
      referring_domains: referringDomains,
      anchors,
      backlinks,
    };
  } else if (mode === "async") throw new CliError("DataForSEO Backlinks API supports only Live retrieval in v3; async is not available for backlink-analysis.");
  else
    source = {
      status_code: "offline",
      mode: "offline",
      requested_mode: mode,
      tasks: [],
      settings: { limit, include_subdomains: includeSubdomains, backlinks_status_type: statusType, backlink_mode: args.backlink_mode || "as_is" },
      endpoints: ["/v3/backlinks/summary/live", "/v3/backlinks/referring_domains/live", "/v3/backlinks/anchors/live", "/v3/backlinks/backlinks/live"],
      note: "Run with --mode live or --mode standard to fetch DataForSEO backlink data.",
    };
  const normalized = normalizeBacklinkReport(target, competitors, source, args);
  const base = path.join(p, "sources", "backlinks", `${stamp()}-${slugify(target)}`);
  writeJson(`${base}.raw.json`, source);
  writeJson(path.join(p, "workbench", "backlinks", `${stamp()}-${slugify(target)}.json`), normalized);
  appendLog("backlinks", target, [path.relative(p, `${base}.raw.json`)], "Analise de backlinks registrada.", "not-required");
  printJson(normalized);
}

async function commandSeoAnalysis(args: AnyRecord): Promise<void> {
  const keyword = required(args, "keyword");
  const p = ensureProject();
  const settings = projectSettings(p);
  const decision = resolveSeoProvider(args.provider || "auto");
  const organic = decision.provider === "dataforseo" ? loadDataforseoSerpResults(p, keyword, args.serp_file) : loadWebsearchResults(p, keyword, args.websearch_file);
  const keywordMetrics = decision.provider === "dataforseo" ? loadKeywordMetrics(p, keyword) : null;
  const topResults = organic.map((item, idx) => ({ position: item.rank_absolute || item.rank_group || item.position || idx + 1, title: item.title || "", url: item.url || "", snippet: item.snippet || item.description || "", domain: item.domain || "" }));
  const competitors = [];
  for (const entry of topResults.slice(0, 3)) {
    let extracted: AnyRecord = {};
    let status: number | null = null;
    if (entry.url && args.fetch_pages) {
      const fetched = await fetchUrl(entry.url);
      status = fetched.status;
      extracted = extractHtml(fetched.html, fetched.finalUrl);
    }
    competitors.push({ serp: entry, http_status: status, page: extracted });
  }
  const titleBlob = topResults.map((r) => r.title.toLowerCase()).join(" ");
  const intent = containsAny(titleBlob, ["comprar", "preco", "preço", "melhor", "vs ", "review"]) ? "commercial investigation" : containsAny(titleBlob, ["o que e", "o que é", "guia", "como", "tutorial"]) ? "informational" : "mixed";
  const incomplete = topResults.length < 5;
  const limitations = [];
  if (incomplete) limitations.push(`Apenas ${topResults.length} resultados disponíveis; ideal >=5.`);
  if (decision.provider === "websearch" && !topResults.length) limitations.push(`Nenhum resultado em sources/websearch/${slugify(keyword)}.json. Rode WebSearch e grave o JSON antes de reexecutar.`);
  if (decision.provider === "dataforseo" && keywordMetrics === null) limitations.push("Sem keyword-research recente para enriquecer keyword_metrics.");
  let report: AnyRecord = {
    keyword,
    provider: decision.provider,
    provider_reason: decision.reason,
    market_context: {
      market: args.market || settings.market,
      country: args.country || settings.country,
      language: args.language || settings.language,
      location: args.location || settings.dataforseo_location,
      provider_language: args.provider_language || settings.dataforseo_language,
      device: args.device || "desktop",
    },
    keyword_metrics: keywordMetrics,
    top_results: topResults,
    competitors,
    intent,
    heading_patterns: competitors
      .map((c: AnyRecord) => ({ url: c.serp.url, h1: (c.page.headings || []).find((h: AnyRecord) => h.level === "h1")?.text || "", h2_count: (c.page.headings || []).filter((h: AnyRecord) => h.level === "h2").length }))
      .filter((item) => item.h1 || item.h2_count),
    gaps: ["Mapear entidades e subtopicos pouco cobertos pelo top 3.", "Confirmar formato dominante: artigo, listicle, guia passo a passo.", "Identificar perguntas reais do leitor nao respondidas pelos competidores."],
    improvement_hypotheses: ["Cobertura mais densa de exemplos brasileiros do que os concorrentes.", "EEAT explicito com autoria e proveniencia declarada, ausente em parte do top 3.", "Estrutura de heading que responda a intencao observada antes de aprofundar."],
    limitations,
    incomplete,
    generated_at: nowIso(),
  };
  if (args.player_score) {
    report = await buildPlayerScoreReport(args, report, {
      rootDir: ROOT,
      projectDir: p,
      required,
      normalizePageType,
      readJson,
      writeJson,
      writeText,
      fetchUrl,
      extractHtml,
      auditTechnicalSeo,
      renderTechnicalMarkdown,
      slugify,
      stamp,
    });
  }
  const out = path.join(p, "workbench", "seo-analysis", `${slugify(keyword)}.json`);
  writeJson(out, report);
  appendLog("seo-analysis", keyword, [path.relative(p, out), ...(report.technical_seo_reports || [])], `Analise SEO via ${decision.provider} (${topResults.length} resultados${args.player_score ? "; player score ativo" : ""}).`, "not-required");
  printJson(report);
}

async function commandTopicCluster(args: AnyRecord): Promise<void> {
  const seed = required(args, "seed");
  const p = ensureProject();
  const seedSlug = slugify(seed);
  const analysisFile = path.join(p, "workbench", "seo-analysis", `${seedSlug}.json`);
  if (!fs.existsSync(analysisFile) && !args.hypothesis_only) throw new CliError(`Missing seo-analysis for this seed. Run: bin/seo-brain seo-analysis --keyword "${seed}" or rerun with --hypothesis-only to produce a hypothesis-grade cluster.`);
  const analysisData = fs.existsSync(analysisFile) ? readJson(analysisFile) : null;
  const intent = analysisData?.intent || "to-be-validated";
  const clusterStatus = args.hypothesis_only && !analysisData ? "hypothesis" : "draft";
  const supportingPages = [`O que é ${seed}`, `Como avaliar ${seed}`, `${seed}: exemplos brasileiros`].map((title) => ({ title, intent, judgment: clusterStatus }));
  const cluster = { seed, seed_slug: seedSlug, status: clusterStatus, generated_at: nowIso(), pillar_page: `/${seedSlug}/`, supporting_pages: supportingPages, business_hypothesis: "Precisa de validacao humana: conectar demanda organica a oferta, conversao e margem.", data_provenance: { seo_analysis: analysisData ? { path: path.relative(p, analysisFile), provider: analysisData.provider, provider_reason: analysisData.provider_reason } : { path: null, provider: null, provider_reason: "hypothesis-only run" } } };
  writeJson(path.join(p, "workbench", "topic-cluster", `${seedSlug}.json`), cluster);
  fs.appendFileSync(path.join(p, "wiki", "conteudos", "topic-clusters.md"), `\n\n## ${seed}\n\n- Página pilar: \`${cluster.pillar_page}\`\n- Status: ${clusterStatus}\n- Intenção dominante: ${intent}\n- Hipótese de negócio: precisa de validação humana.\n${supportingPages.map((page) => `- ${page.title} (${page.intent})`).join("\n")}\n`, "utf8");
  appendLog("topic-cluster", seed, ["conteudos/topic-clusters"], `Cluster em status ${clusterStatus}.`, "pending");
  printJson(cluster);
}

async function commandEeat(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  const page = path.join(p, "wiki", "eeat.md");
  if (!fs.existsSync(page)) fs.copyFileSync(path.join(TEMPLATES_DIR, "wiki", "eeat.md"), page);
  const evidence = { claim: args.claim || "Evidencia a mapear", source: args.source || "sem fonte", status: args.status || "gap", timestamp: nowIso() };
  const report = { timestamp: nowIso(), evidence, rules: ["Nao inventar experiencia, clientes, credenciais, premios ou provas.", "Marcar alegacoes sem fonte como gap.", "Manter wiki/eeat.md em draft ou needs-review ate aprovacao explicita."] };
  fs.appendFileSync(page, `\n\n## Evidencia registrada\n\n- Alegacao: ${evidence.claim}\n- Fonte: ${evidence.source}\n- Status: ${evidence.status}\n`, "utf8");
  const out = path.join(p, "workbench", "eeat", `${stamp()}.json`);
  writeJson(out, report);
  appendLog("eeat", "Evidencia EEAT", ["eeat", path.relative(p, out)], "Evidencia ou lacuna EEAT registrada.", "pending");
  printJson(report);
}

async function commandContentSeo(args: AnyRecord): Promise<void> {
  const topic = required(args, "topic");
  const p = ensureProject();
  const topicSlug = slugify(topic);
  const keyword = args.keyword || topic;
  const keywordSlug = slugify(keyword);
  const analysisFile = path.join(p, "workbench", "seo-analysis", `${keywordSlug}.json`);
  if (!fs.existsSync(analysisFile) && !args.skip_data) throw new CliError(`Missing seo-analysis for this topic. Run: bin/seo-brain seo-analysis --keyword "${keyword}" or rerun content-seo with --skip-data --skip-data-reason "motivo claro" para gerar um briefing sem proveniencia de SERP.`);
  if (args.skip_data && !args.skip_data_reason) throw new CliError('--skip-data requires --skip-data-reason "motivo claro".');
  const analysisData = fs.existsSync(analysisFile) ? readJson(analysisFile) : null;
  const mustNotMention = Array.from(new Set((analysisData?.top_results || []).map((entry: AnyRecord) => String(entry.domain || "").trim().toLowerCase()).filter(Boolean))).sort();
  const provenance = analysisData ? { path: path.relative(p, analysisFile), provider: analysisData.provider, provider_reason: analysisData.provider_reason, generated_at: analysisData.generated_at } : { path: null, provider: null, provider_reason: `skip-data: ${args.skip_data_reason}` };
  const report = {
    topic,
    topic_slug: topicSlug,
    keyword,
    keyword_slug: keywordSlug,
    generated_at: nowIso(),
    data_provenance: { seo_analysis: provenance },
    brief: {
      intent: analysisData?.intent || "to-be-validated",
      reader_need: "Responder com profundidade, sem cair em padroes genericos de IA.",
      must_include: ["definicao direta no inicio", "criterios praticos de decisao", "exemplos brasileiros verificaveis", "proximos passos para o leitor"],
      must_avoid: ["titulo em padrao americano", "URL ou slug interno em prosa", "voz de Wiki em texto publico", "anchor text generico tipo clique aqui", "mencao em prosa a dominio que aparece no top_results da analise SEO", "referencia a fonte externa fora de backlink Markdown", "sequencia longa de paragrafos de uma linha", "metaforas traduzidas literalmente do ingles", "adjetivos vazios como robusto, completo, lider"],
    },
    voice_check: { audience: "leitor de blog publico que entende SEO", tense_perspective: "terceira pessoa, voz informativa", link_test: "remover qualquer link e a frase deve continuar coerente" },
    must_not_mention_in_prose: mustNotMention,
    draft_status: "outline",
  };
  writeJson(path.join(p, "workbench", "content", `${topicSlug}.brief.json`), report);
  writeText(path.join(p, "wiki", "conteudos", `${topicSlug}.md`), `---\ntitle: "${topic}"\nstatus: draft\npillar: conteudo\nowner: shared\njudgment_level: editorial\ncluster: ""\nurl: "/${topicSlug}/"\nprimary_keyword: "${keyword}"\nsources: []\n---\n\n# ${topic}\n\n## Briefing\n\nIntencao, angulo e argumentos foram derivados de workbench/seo-analysis/${keywordSlug}.json.\nReescrever para o leitor de blog: sem expor URL interna em prosa, sem voz de Wiki.\n\n## Estrutura proposta\n\n1. Resposta direta no topo.\n2. Definicao clara, com escopo e limites.\n3. Criterios praticos.\n4. Exemplos brasileiros verificaveis.\n5. Proximo passo concreto.\n\n## Revisao anti-slop e registro de publicacao\n\n- Titulo em frase normal, sem padrao americano.\n- Nenhum path interno aparece em prosa.\n- Links internos usam o titulo da pagina de destino como anchor text.\n- Cada frase com link continua coerente sem o link.\n- Evitar sequencia longa de paragrafos de uma linha.\n- Reduzir bullets quando a explicacao pedir desenvolvimento.\n`);
  appendLog("content", topic, [`conteudos/${topicSlug}`], "Briefing e estrutura de conteudo criados.", "pending");
  printJson(report);
}

async function commandTechnicalSeo(args: AnyRecord): Promise<void> {
  let html: string;
  let status: number | null = null;
  let source: string;
  let headers: Record<string, string> = {};
  if (args.html_file) {
    html = fs.readFileSync(args.html_file, "utf8");
    source = args.html_file;
  } else if (args.url) {
    const fetched = await fetchUrl(args.url);
    html = fetched.html;
    status = fetched.status;
    source = fetched.finalUrl || args.url;
    headers = fetched.headers;
  } else {
    throw new CliError("Provide --url or --html-file.");
  }
  const pageType = normalizePageType(args.page_type || "unknown");
  const extracted = extractHtml(html, args.url);
  const result = auditTechnicalSeo(extracted, { pageType, source, status, headers });
  const p = ensureProject();
  const basename = `${stamp()}-${pageType}`;
  const outJson = path.join(p, "workbench", "technical-seo", `${basename}.json`);
  const outMd = path.join(p, "workbench", "technical-seo", `${basename}.md`);
  writeJson(outJson, result);
  writeText(outMd, renderTechnicalMarkdown(result));
  appendLog("technical-seo", pageType, [path.relative(p, outJson), path.relative(p, outMd)], "Auditoria tecnica deterministica executada.", "not-required");
  printJson(result);
}

async function commandNextWebsiteCreator(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  const projectName = projectDisplayName(p);
  const web = path.join(p, "web");
  mkdirp(path.join(web, "app", "blog", "[slug]"));
  mkdirp(path.join(web, "app", "contato"));
  mkdirp(path.join(web, "app", "servicos"));
  writeJson(path.join(web, "package.json"), { scripts: { dev: "next dev", build: "next build", start: "next start" }, dependencies: { next: "latest", react: "latest", "react-dom": "latest" }, devDependencies: { typescript: "latest", "@types/react": "latest", "@types/node": "latest" } });
  writeText(path.join(web, "app", "layout.tsx"), 'export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }\n');
  writeText(path.join(web, "app", "page.tsx"), `export default function Page() { return <main><h1>${projectName}</h1><p>Site SEO Brain em rascunho.</p></main>; }\n`);
  writeText(path.join(web, "app", "servicos", "page.tsx"), "export default function Page() { return <main><h1>Servicos</h1></main>; }\n");
  writeText(path.join(web, "app", "contato", "page.tsx"), "export default function Page() { return <main><h1>Contato</h1></main>; }\n");
  writeText(path.join(web, "app", "blog", "page.tsx"), "export default function Page() { return <main><h1>Blog</h1></main>; }\n");
  writeText(path.join(web, "app", "blog", "[slug]", "page.tsx"), "export default function Page() { return <main><h1>Post</h1></main>; }\n");
  appendLog("technology", "Next.js site", ["web"], "Starter Next.js SSG criado.", "pending");
  printJson({ ok: true, web });
}

async function commandPayloadCms(args: AnyRecord): Promise<void> {
  const web = path.join(ensureProject(), "web");
  mkdirp(web);
  writeText(path.join(web, "payload.config.ts"), "import { buildConfig } from 'payload'\n\nexport default buildConfig({\n  collections: [\n    { slug: 'pages', fields: [{ name: 'title', type: 'text', required: true }, { name: 'seoTitle', type: 'text' }, { name: 'seoDescription', type: 'textarea' }] },\n    { slug: 'posts', fields: [{ name: 'title', type: 'text', required: true }, { name: 'slug', type: 'text', required: true }, { name: 'content', type: 'richText' }] },\n    { slug: 'authors', fields: [{ name: 'name', type: 'text', required: true }, { name: 'bio', type: 'textarea' }] }\n  ]\n})\n");
  appendLog("technology", "Payload CMS", ["web/payload.config.ts"], "Config inicial do Payload criada.", "pending");
  printJson({ ok: true, payload_config: path.join(web, "payload.config.ts") });
}

async function commandAuditSkills(args: AnyRecord): Promise<void> {
  const skillDir = path.join(ROOT, "skills");
  const results = fs
    .readdirSync(skillDir)
    .filter((name) => !name.startsWith("_") && fs.existsSync(path.join(skillDir, name, "SKILL.md")))
    .sort()
    .map((name) => {
      const text = fs.readFileSync(path.join(skillDir, name, "SKILL.md"), "utf8");
      const checks = { frontmatter: text.startsWith("---\n"), contract: text.includes("## Contract"), required_behavior: text.includes("## Required Behavior"), done_criteria: text.includes("## Done Criteria"), shared_reference: text.includes("operating-model.md") || ["technical-seo", "data-setup", "autoresearch"].includes(name) };
      const score = Object.values(checks).filter(Boolean).length * 20;
      return { skill: name, score, checks, promoted: score >= Number(args.threshold || 90) };
    });
  const report = { timestamp: nowIso(), threshold: Number(args.threshold || 90), results, ok: results.every((r) => r.promoted) };
  writeJson(path.join(ROOT, "runs", stamp(), "audit-skills-report.json"), report);
  printJson(report);
}

const COMMANDS: Record<string, (args: AnyRecord) => Promise<void>> = {
  "project-init": commandProjectInit,
  "wiki-lint": commandWikiLint,
  "wiki-approve": commandWikiApprove,
  "wiki-ingest": commandWikiIngest,
  "data-setup": commandDataSetup,
  "serp-extract": commandSerpExtract,
  "keyword-research": commandKeywordResearch,
  "backlink-analysis": commandBacklinkAnalysis,
  "seo-analysis": commandSeoAnalysis,
  "topic-cluster": commandTopicCluster,
  eeat: commandEeat,
  "content-seo": commandContentSeo,
  "technical-seo": commandTechnicalSeo,
  "next-website-creator": commandNextWebsiteCreator,
  "payload-cms": commandPayloadCms,
  "audit-skills": commandAuditSkills,
};

function parseArgs(argv: string[]): { command: string; args: AnyRecord } {
  const [command, ...rest] = argv;
  if (!command || !(command in COMMANDS)) throw new CliError(`Unknown command: ${command || ""}`);
  const args: AnyRecord = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith("--")) {
      const key = token.slice(2).replace(/-/g, "_");
      const next = rest[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return { command, args };
}

function required(args: AnyRecord, key: string): string {
  const value = args[key];
  if (value === undefined || value === true || value === "") throw new CliError(`Missing --${key.replace(/_/g, "-")}.`);
  return String(value);
}

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class CliError extends Error {}

async function main(): Promise<number> {
  try {
    const { command, args } = parseArgs(process.argv.slice(2));
    if ("project" in args) throw new CliError("--project is no longer supported; SEO Brain uses the single project at project/.");
    await COMMANDS[command](args);
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
      return 1;
    }
    process.stderr.write(`${JSON.stringify({ ok: false, error: String((error as Error).message || error) })}\n`);
    return 1;
  }
}

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code;
  });
}
