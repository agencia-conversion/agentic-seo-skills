#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFrontmatterValue = setFrontmatterValue;
exports.taskResultReady = taskResultReady;
exports.normalizeSerpBatch = normalizeSerpBatch;
exports.serpForKeywords = serpForKeywords;
exports.normalizeKeywords = normalizeKeywords;
exports.normalizeSuggestions = normalizeSuggestions;
exports.collectKeywords = collectKeywords;
exports.buildClusterPage = buildClusterPage;
exports.mergeClusterPage = mergeClusterPage;
exports.mergeClusterPages = mergeClusterPages;
exports.renderTopicClustersWiki = renderTopicClustersWiki;
exports.renderTopicClustersMarkdown = renderTopicClustersMarkdown;
const node_buffer_1 = require("node:buffer");
const fs = __importStar(require("node:fs"));
const node_os_1 = require("node:os");
const path = __importStar(require("node:path"));
const ROOT = path.resolve(__dirname, "..");
const PROJECT_DIR = resolveProjectDir();
const TEMPLATES_DIR = path.join(ROOT, "templates", "project");
const DATAFORSEO_MODES = new Set(["offline", "live", "standard", "async"]);
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
function nowIso() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
}
function today() {
    return new Date().toISOString().slice(0, 10);
}
function stamp() {
    return new Date().toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "-");
}
function slugify(value) {
    const slug = value
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    if (!slug)
        throw new CliError("Slug is empty after normalization.");
    if (slug === "." || slug === ".." || slug.includes("/"))
        throw new CliError("Unsafe slug.");
    return slug;
}
function resolveProjectDir() {
    const configured = process.env.CLAUDE_PLUGIN_OPTION_project_dir || process.env.SEO_BRAIN_PROJECT_DIR;
    if (!configured)
        return path.join(ROOT, "project");
    return path.isAbsolute(configured) ? configured : path.resolve(ROOT, configured);
}
function ensureProject() {
    if (!fs.existsSync(PROJECT_DIR))
        throw new CliError(`Project not found: ${PROJECT_DIR}. Run: bin/seo-brain project-init "Project name"`);
    return PROJECT_DIR;
}
function mkdirp(p) {
    fs.mkdirSync(p, { recursive: true });
}
function writeJson(file, data) {
    mkdirp(path.dirname(file));
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function writeText(file, text) {
    mkdirp(path.dirname(file));
    fs.writeFileSync(file, text, "utf8");
}
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}
function copyDir(src, dest) {
    if (!fs.existsSync(src))
        return;
    mkdirp(dest);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory())
            copyDir(from, to);
        else if (!fs.existsSync(to))
            fs.copyFileSync(from, to);
    }
}
function appendLog(eventType, title, files, summary, approval) {
    const wikiLog = path.join(PROJECT_DIR, "wiki", "log", "index.md");
    mkdirp(path.dirname(wikiLog));
    const links = files.length ? files.map((f) => `[[${f}]]`).join(", ") : "n/a";
    fs.appendFileSync(wikiLog, `\n\n## [${today()}] ${eventType} | ${title}\n\n- Actor: agent\n- Files: ${links}\n- Summary: ${summary}\n- Approval: ${approval}\n`, "utf8");
}
function parseFrontmatter(text) {
    if (!text.startsWith("---\n"))
        return [{}, text];
    const end = text.indexOf("\n---", 4);
    if (end === -1)
        return [{}, text];
    const raw = text.slice(4, end);
    const body = text.slice(end + 4).replace(/^\n/, "");
    const data = {};
    for (const line of raw.split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx > -1 && !/^\s/.test(line))
            data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return [data, body];
}
function setFrontmatterValue(file, updates) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.startsWith("---\n")) {
        const lines = ["---", ...Object.entries(updates).map(([k, v]) => `${k}: ${v}`), "---", "", text];
        fs.writeFileSync(file, lines.join("\n"), "utf8");
        return;
    }
    const end = text.indexOf("\n---", 4);
    if (end === -1)
        throw new CliError(`Malformed frontmatter in ${file}`);
    let block = text.slice(4, end);
    const body = text.slice(end + 4);
    for (const [key, value] of Object.entries(updates)) {
        const pattern = new RegExp(`^${escapeRegExp(key)}:.*(?:\\n[ \\t].*)*`, "m");
        if (pattern.test(block))
            block = block.replace(pattern, `${key}: ${value}`);
        else
            block = `${block.replace(/\n?$/, "\n")}${key}: ${value}\n`;
    }
    fs.writeFileSync(file, `---\n${block.replace(/\n+$/, "")}\n---${body}`, "utf8");
}
function readEnvFile(file = path.join(ROOT, ".env")) {
    const values = {};
    if (!fs.existsSync(file))
        return values;
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || !line.includes("="))
            continue;
        const [key, ...rest] = line.split("=");
        values[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
    return values;
}
function readHomeCredentials() {
    const file = path.join((0, node_os_1.homedir)(), ".seo-brain", "credentials.json");
    if (!fs.existsSync(file))
        return {};
    try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        const out = {};
        if (data.dataforseo_login)
            out.DATAFORSEO_LOGIN = String(data.dataforseo_login);
        if (data.dataforseo_password)
            out.DATAFORSEO_PASSWORD = String(data.dataforseo_password);
        if (data.dataforseo_mode)
            out.SEO_BRAIN_DATAFORSEO_MODE = String(data.dataforseo_mode);
        return out;
    }
    catch {
        return {};
    }
}
function getSecret(name) {
    return (process.env[name] ||
        readEnvFile(path.join(PROJECT_DIR, ".env.local"))[name] ||
        readHomeCredentials()[name] ||
        readEnvFile()[name] ||
        "");
}
function mask(value) {
    if (!value)
        return "missing";
    if (value.length <= 6)
        return "***";
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
function dataforseoCredentialsPresent() {
    const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
    const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
    return Boolean(login && password);
}
function resolveSeoProvider(prefer) {
    const choice = (prefer || "auto").trim().toLowerCase();
    const hasCreds = dataforseoCredentialsPresent();
    if (choice === "websearch")
        return { provider: "websearch", reason: "Forced by --provider websearch." };
    if (choice === "dataforseo") {
        if (!hasCreds)
            throw new CliError("DataForSEO credentials missing. Set DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD or use --provider websearch.");
        return { provider: "dataforseo", reason: "Forced by --provider dataforseo." };
    }
    if (choice !== "auto")
        throw new CliError(`Unsupported provider preference: ${choice}. Use dataforseo, websearch, or auto.`);
    if (hasCreds)
        return { provider: "dataforseo", reason: "DataForSEO credentials present in environment." };
    return { provider: "websearch", reason: "DataForSEO credentials absent; falling back to websearch." };
}
async function dataforseoRequest(method, endpoint, payload, sandbox = false) {
    const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
    const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
    if (!login || !password)
        throw new Error("DataForSEO credentials are missing.");
    const host = sandbox ? "https://sandbox.dataforseo.com" : "https://api.dataforseo.com";
    const response = await fetch(host + endpoint, {
        method,
        body: payload === undefined ? undefined : JSON.stringify(payload),
        headers: {
            Authorization: `Basic ${node_buffer_1.Buffer.from(`${login}:${password}`).toString("base64")}`,
            "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(60000),
    });
    return (await response.json());
}
function resolveDataforseoMode(args) {
    if (args.live)
        return "live";
    if (args.offline)
        return "offline";
    const configured = args.mode ||
        process.env.CLAUDE_PLUGIN_OPTION_dataforseo_mode ||
        process.env.SEO_BRAIN_DATAFORSEO_MODE ||
        readEnvFile().SEO_BRAIN_DATAFORSEO_MODE ||
        "standard";
    const mode = String(configured).trim().toLowerCase();
    if (!DATAFORSEO_MODES.has(mode))
        throw new CliError(`Unsupported DataForSEO mode: ${mode}. Use one of: ${Array.from(DATAFORSEO_MODES).sort().join(", ")}.`);
    return mode;
}
function taskIdsFromResponse(response) {
    return (response.tasks || []).map((task) => task.id).filter(Boolean);
}
function taskResultReady(response) {
    const tasks = response.tasks || [];
    if (!tasks.length)
        return false;
    const task = tasks[0];
    if (task.result)
        return true;
    const statusCode = Number(task.status_code || response.status_code || 0);
    if (statusCode === 40601 || statusCode === 40602)
        return false;
    if (statusCode >= 40000)
        return true;
    return false;
}
async function dataforseoStandardTask(postEndpoint, getEndpointTemplate, payload, sandbox, pollInterval, timeout) {
    const postResponse = await dataforseoRequest("POST", postEndpoint, payload, sandbox);
    const ids = taskIdsFromResponse(postResponse);
    if (!ids.length)
        return { mode: "standard", post_response: postResponse, tasks: postResponse.tasks || [] };
    const deadline = Date.now() + timeout * 1000;
    const taskGetResponses = [];
    const pending = new Set(ids);
    while (pending.size && Date.now() < deadline) {
        for (const taskId of Array.from(pending)) {
            const response = await dataforseoRequest("GET", getEndpointTemplate.replace("{id}", taskId), undefined, sandbox);
            if (taskResultReady(response)) {
                taskGetResponses.push(response);
                pending.delete(taskId);
            }
        }
        if (pending.size)
            await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
    }
    if (pending.size)
        return { mode: "standard", status: "pending_timeout", post_response: postResponse, pending_task_ids: Array.from(pending).sort(), task_get_responses: taskGetResponses };
    if (taskGetResponses.length === 1)
        return { ...taskGetResponses[0], mode: "standard", post_response: postResponse };
    return { mode: "standard", post_response: postResponse, task_get_responses: taskGetResponses };
}
async function runDataforseoCall(endpoints, payload, args) {
    const requested = resolveDataforseoMode(args);
    const liveOnly = !endpoints.taskPostEndpoint || !endpoints.taskGetEndpoint;
    const mode = liveOnly && (requested === "standard" || requested === "async") ? "live" : requested;
    if (mode === "live")
        return { ...(await dataforseoRequest("POST", endpoints.liveEndpoint, payload, Boolean(args.sandbox))), mode: "live" };
    if (mode === "standard")
        return await dataforseoStandardTask(endpoints.taskPostEndpoint, endpoints.taskGetEndpoint, payload, Boolean(args.sandbox), Number(args.poll_interval || 10), Number(args.timeout || 180));
    if (mode === "async")
        return await dataforseoAsyncTask(endpoints.taskPostEndpoint, payload, Boolean(args.sandbox), args.pingback_url, args.postback_url, args.postback_data || "advanced");
    return { status_code: "offline", mode: "offline", tasks: [], note: "Run with --mode standard or --mode live to fetch DataForSEO data." };
}
async function dataforseoAsyncTask(postEndpoint, payload, sandbox, pingbackUrl, postbackUrl, postbackData = "advanced") {
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
function parseAttrs(raw = "") {
    const attrs = {};
    const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = pattern.exec(raw)))
        attrs[match[1].toLowerCase()] = htmlDecode(match[2] ?? match[3] ?? match[4] ?? "");
    return attrs;
}
function tags(html, name) {
    const out = [];
    const pattern = new RegExp(`<${name}\\b([^>]*)>`, "gi");
    let match;
    while ((match = pattern.exec(html)))
        out.push({ raw: match[0], attrs: parseAttrs(match[1] || "") });
    return out;
}
function htmlDecode(value) {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}
function stripTags(value) {
    return htmlDecode(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function extractHtml(html, sourceUrl) {
    const title = stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const meta = {};
    const metaTags = tags(html, "meta");
    for (const item of metaTags) {
        const key = (item.attrs.name || item.attrs.property || item.attrs["http-equiv"] || "").toLowerCase();
        if (key)
            meta[key] = item.attrs.content || "";
    }
    const linkTags = tags(html, "link").map((item) => item.attrs);
    const canonical = (linkTags.find((item) => (item.rel || "").toLowerCase().split(/\s+/).includes("canonical")) || {}).href || "";
    const hreflang = linkTags.filter((item) => (item.rel || "").toLowerCase().split(/\s+/).includes("alternate") && item.hreflang);
    const headings = [];
    const headingPattern = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
    let headingMatch;
    while ((headingMatch = headingPattern.exec(html)))
        headings.push({ level: `h${headingMatch[1]}`, text: stripTags(headingMatch[2]) });
    const images = tags(html, "img").map((item) => item.attrs);
    const anchors = [];
    const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let anchorMatch;
    while ((anchorMatch = anchorPattern.exec(html)))
        anchors.push({ ...parseAttrs(anchorMatch[1]), text: stripTags(anchorMatch[2]) });
    const scripts = tags(html, "script");
    const structuredData = [];
    const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptPattern.exec(html))) {
        const attrs = parseAttrs(scriptMatch[1]);
        if ((attrs.type || "").toLowerCase() !== "application/ld+json")
            continue;
        const raw = scriptMatch[2].trim();
        try {
            const parsed = JSON.parse(raw);
            const nodes = Array.isArray(parsed) ? parsed : [parsed];
            structuredData.push(...nodes.map((node) => ({ valid: true, type: schemaType(node), raw_type: node?.["@type"] || null })));
        }
        catch {
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
        html_bytes: node_buffer_1.Buffer.byteLength(html, "utf8"),
    };
}
function schemaType(node) {
    if (!node)
        return null;
    if (Array.isArray(node["@type"]))
        return node["@type"][0] || null;
    if (node["@type"])
        return node["@type"];
    if (node["@graph"] && Array.isArray(node["@graph"]))
        return schemaType(node["@graph"][0]);
    return null;
}
function safeHost(url) {
    try {
        return new URL(url).host;
    }
    catch {
        return "";
    }
}
function isInternalHref(href, sourceHost) {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
        return true;
    if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../"))
        return true;
    try {
        return Boolean(sourceHost && new URL(href).host === sourceHost);
    }
    catch {
        return false;
    }
}
async function fetchUrl(url) {
    const response = await fetch(url, { headers: { "User-Agent": "SEO-Brain/0.2" }, signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    return { status: response.status, html, finalUrl: response.url, headers: Object.fromEntries(response.headers.entries()) };
}
function normalizePageType(input = "unknown") {
    const value = input.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_]+/g, "-");
    if (["home", "homepage", "inicial", "inicio", "index"].includes(value))
        return "home";
    if (["ecommerce-product", "produto-ecommerce", "product-ecommerce", "produto-loja", "produto"].includes(value))
        return "ecommerce_product";
    if (["service-product", "service", "servico", "produto-servico", "produto-ou-servico", "institucional", "institutional-product-service", "product-service"].includes(value))
        return "service_product";
    if (["blog", "blog-post", "post", "article", "artigo"].includes(value))
        return "blog";
    if (["about", "quem-somos", "sobre", "sobre-nos", "about-us"].includes(value))
        return "about";
    return "unknown";
}
function hasSchema(extracted, expected) {
    const types = (extracted.schema_types || []).map((x) => x.toLowerCase());
    return expected.some((type) => types.includes(type.toLowerCase()));
}
function containsAny(haystack, needles) {
    const text = haystack.toLowerCase();
    return needles.some((needle) => text.includes(needle));
}
function headingHierarchyOk(headings) {
    let previous = 0;
    for (const h of headings) {
        const level = Number(String(h.level).replace("h", ""));
        if (previous && level > previous + 1)
            return false;
        previous = level;
    }
    return true;
}
function check(pass, id, name, severity, weight, evidence, repair) {
    return { id, name, severity, weight, passed: pass, score_awarded: pass ? weight : 0, evidence, repair };
}
function auditTechnicalSeo(extracted, options) {
    const checks = [];
    const robots = String(extracted.meta_robots || "").toLowerCase();
    const xRobots = String(options.headers?.["x-robots-tag"] || "").toLowerCase();
    const h1s = extracted.headings.filter((h) => h.level === "h1");
    const firstH1 = h1s[0]?.text || "";
    const allText = `${extracted.title} ${extracted.meta_description} ${extracted.headings.map((h) => h.text).join(" ")} ${extracted.body_text_sample || ""}`.toLowerCase();
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
    }
    else if (pageType === "ecommerce_product") {
        checks.push(check(hasSchema(extracted, ["Product"]), "product_schema", "Product schema exists", "error", 8, extracted.schema_types, "Add Product schema with name, image, offers, and availability when applicable."));
        checks.push(check(containsAny(allText, ["preco", "preço", "r$", "comprar", "estoque", "disponivel", "disponível"]), "product_commerce_signals", "Commerce signals are visible", "warning", 5, { matched_text_scope: "title/meta/headings" }, "Expose price, availability, buying action, or commercial terms in crawlable content."));
        checks.push(check(extracted.images_total >= 1, "product_image", "Product image exists", "warning", 4, { images_total: extracted.images_total }, "Include at least one product image with alt text."));
        checks.push(check(containsAny(allText, ["avaliacao", "avaliação", "review", "garantia", "entrega", "troca"]), "product_trust", "Product trust details are present", "info", 3, { matched_text_scope: "title/meta/headings" }, "Add review, warranty, shipping, return, or proof details when true."));
    }
    else if (pageType === "service_product") {
        checks.push(check(hasSchema(extracted, ["Service", "Product", "LocalBusiness", "ProfessionalService", "Organization"]), "service_schema", "Service/Product schema exists", "warning", 7, extracted.schema_types, "Add Service, Product, Organization, or LocalBusiness schema according to the offer."));
        checks.push(check(containsAny(allText, ["servico", "serviço", "solucao", "solução", "consultoria", "plano", "orcamento", "orçamento", "contato"]), "service_offer_clarity", "Offer and next step are clear", "warning", 5, { matched_text_scope: "title/meta/headings" }, "Make the offer, audience, and next step visible in crawlable content."));
        checks.push(check(extracted.link_counts.internal >= 2, "service_supporting_links", "Service page links to support content", "info", 3, extracted.link_counts, "Link to proof, cases, about, contact, FAQ, or related content."));
    }
    else if (pageType === "blog") {
        checks.push(check(hasSchema(extracted, ["Article", "BlogPosting", "NewsArticle"]), "article_schema", "Article schema exists", "warning", 7, extracted.schema_types, "Add Article or BlogPosting schema with headline, author, and date fields."));
        checks.push(check(extracted.word_count >= 500, "blog_depth", "Blog content has depth", "warning", 5, { word_count: extracted.word_count }, "Expand thin articles with original explanation, examples, and answers."));
        checks.push(check(extracted.h2_count >= 2, "blog_h2_structure", "Blog uses section H2s", "info", 3, { h2_count: extracted.h2_count }, "Use H2 sections that map to the searcher's questions."));
        checks.push(check(containsAny(allText, ["autor", "author", "atualizado", "publicado", "data"]), "blog_author_date_signals", "Author/date signals are visible", "info", 3, { matched_text_scope: "title/meta/headings" }, "Expose author and publish/update dates in crawlable content and schema."));
    }
    else if (pageType === "about") {
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
function severityRank(severity) {
    return { critical: 0, error: 1, warning: 2, info: 3 }[severity] ?? 4;
}
function renderTechnicalMarkdown(report) {
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
    if (!report.findings.length)
        lines.push("- No deterministic findings.");
    for (const finding of report.findings)
        lines.push(`- [${finding.severity}] ${finding.check}: ${finding.repair}`);
    lines.push("", "## Extracted signals", "", "```json", JSON.stringify(report.extracted, null, 2), "```", "");
    return `${lines.join("\n")}\n`;
}
function normalizeSerp(source, keyword, location, language, device) {
    const [normalized] = normalizeSerpBatch(source, [keyword], location, language, device);
    return normalized;
}
function normalizeSerpBatch(source, keywords, location, language, device) {
    if (!Array.isArray(keywords) || keywords.length === 0)
        throw new Error("normalizeSerpBatch requires a non-empty keywords array.");
    let tasks = source.tasks || [];
    if (source.task_get_responses)
        tasks = source.task_get_responses.flatMap((r) => r.tasks || []);
    const baseProvider = tasks.length ? "dataforseo" : source.mode === "async" ? "dataforseo" : "offline";
    const buildEntry = (keyword, items) => ({
        keyword,
        provider: items.length ? "dataforseo" : baseProvider,
        mode: source.mode || "unknown",
        timestamp: nowIso(),
        location,
        language,
        device,
        organic_results: items
            .filter((item) => item.type === "organic")
            .map((item) => ({ rank_group: item.rank_group, rank_absolute: item.rank_absolute, title: item.title, url: item.url, domain: item.domain, snippet: item.description || item.snippet })),
        serp_features: Array.from(new Set(items.filter((item) => item.type !== "organic").map((item) => String(item.type || "").trim()))).filter(Boolean).sort(),
    });
    const nameKey = (s) => String(s).trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
    const byInputKey = new Map();
    keywords.forEach((kw, i) => byInputKey.set(nameKey(kw), i));
    const byIndex = new Map();
    const usedTasks = new Set();
    for (let i = 0; i < tasks.length; i += 1) {
        const task = tasks[i];
        const items = task.result?.[0]?.items || [];
        const responseKw = String(task.result?.[0]?.keyword || task.data?.keyword || "").trim();
        const matchIdx = byInputKey.get(nameKey(responseKw));
        if (matchIdx !== undefined && !byIndex.has(matchIdx)) {
            byIndex.set(matchIdx, buildEntry(keywords[matchIdx], items));
            usedTasks.add(i);
        }
    }
    let cursor = 0;
    for (let i = 0; i < tasks.length; i += 1) {
        if (usedTasks.has(i))
            continue;
        const task = tasks[i];
        const items = task.result?.[0]?.items || [];
        while (cursor < keywords.length && byIndex.has(cursor))
            cursor += 1;
        if (cursor >= keywords.length)
            break;
        byIndex.set(cursor, buildEntry(keywords[cursor], items));
        cursor += 1;
    }
    const taskIds = source.task_ids || taskIdsFromResponse(source.post_response || {});
    const pending = source.pending_task_ids || [];
    return keywords.map((keyword, i) => {
        const entry = byIndex.get(i) || buildEntry(keyword, []);
        return { ...entry, task_ids: taskIds, pending_task_ids: pending };
    });
}
const SERP_ENDPOINTS = {
    liveEndpoint: "/v3/serp/google/organic/live/advanced",
    taskPostEndpoint: "/v3/serp/google/organic/task_post",
    taskGetEndpoint: "/v3/serp/google/organic/task_get/advanced/{id}",
};
async function serpForKeywords(keywords, args) {
    if (!keywords.length)
        throw new CliError("serpForKeywords requires at least one keyword.");
    const location = args.location || "Brazil";
    const language = args.language || "pt";
    const device = args.device || "desktop";
    const depth = Number(args.depth || 10);
    const payload = keywords.map((keyword) => ({ keyword, location_name: location, language_code: language, device, depth }));
    const requested = resolveDataforseoMode(args);
    let source;
    if (requested === "live") {
        const responses = await Promise.all(payload.map((p) => dataforseoRequest("POST", SERP_ENDPOINTS.liveEndpoint, [p], Boolean(args.sandbox))));
        source = { mode: "live", tasks: responses.flatMap((r) => r.tasks || []) };
    }
    else {
        source = await runDataforseoCall(SERP_ENDPOINTS, payload, args);
    }
    const normalized = normalizeSerpBatch(source, keywords, location, language, device);
    return { source, normalized };
}
function normalizeKeywords(source, keywords, location, language) {
    if (!Array.isArray(keywords) || keywords.length === 0)
        throw new Error("normalizeKeywords requires a non-empty keywords array.");
    let tasks = source.tasks || [];
    if (source.task_get_responses)
        tasks = source.task_get_responses.flatMap((r) => r.tasks || []);
    let items = [];
    if (tasks.length) {
        for (const result of tasks[0].result || []) {
            items.push({ keyword: result.keyword || "", search_volume: result.search_volume ?? null, competition: result.competition ?? null, cpc: result.cpc ?? null, monthly_searches: result.monthly_searches ?? null });
        }
    }
    else {
        items = keywords.map((keyword) => ({ keyword, search_volume: null, competition: null, cpc: null, monthly_searches: null }));
    }
    return {
        keyword: keywords[0],
        keywords_input: keywords,
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
function normalizeSuggestions(source, seed, location, language) {
    let tasks = source.tasks || [];
    if (source.task_get_responses)
        tasks = source.task_get_responses.flatMap((r) => r.tasks || []);
    const seen = new Set();
    const items = [];
    const pushItem = (raw) => {
        if (!raw || typeof raw !== "object")
            return;
        const keyword = String(raw.keyword || "").trim();
        if (!keyword)
            return;
        const key = keyword.toLowerCase();
        if (seen.has(key))
            return;
        seen.add(key);
        const ki = raw.keyword_info || {};
        items.push({
            keyword,
            search_volume: ki.search_volume ?? raw.search_volume ?? null,
            competition: ki.competition ?? raw.competition ?? null,
            cpc: ki.cpc ?? raw.cpc ?? null,
            monthly_searches: ki.monthly_searches ?? raw.monthly_searches ?? null,
            keyword_difficulty: raw.keyword_difficulty ?? null,
            search_intent_info: raw.search_intent_info ?? null,
        });
    };
    if (tasks.length) {
        for (const result of tasks[0].result || []) {
            if (result.seed_keyword_data)
                pushItem(result.seed_keyword_data);
            if (Array.isArray(result.items))
                for (const item of result.items)
                    pushItem(item);
            else if (!result.items && !result.seed_keyword_data)
                pushItem(result);
        }
    }
    return {
        seed,
        type: "suggestions",
        provider: tasks.length ? "dataforseo" : source.mode === "async" ? "dataforseo" : "offline",
        mode: source.mode || "unknown",
        task_ids: source.task_ids || taskIdsFromResponse(source.post_response || {}),
        pending_task_ids: source.pending_task_ids || [],
        timestamp: nowIso(),
        location,
        language,
        keywords: items,
        note: source.mode === "async" ? "Async task created; collect results via pingback/postback or task_get." : source.pending_task_ids ? "Task still pending; rerun task_get later." : tasks.length ? null : "Suggestions unavailable without a provider call.",
    };
}
function collectKeywords(args) {
    const list = [];
    if (args.keyword)
        list.push(String(args.keyword));
    if (args.keywords_file) {
        const file = String(args.keywords_file);
        if (!fs.existsSync(file))
            throw new CliError(`keywords-file not found: ${file}`);
        for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
            const trimmed = raw.trim();
            if (trimmed && !trimmed.startsWith("#"))
                list.push(trimmed);
        }
    }
    if (Array.isArray(args._))
        for (const item of args._)
            if (typeof item === "string" && item.trim())
                list.push(item.trim());
    if (!list.length)
        throw new CliError('Missing keywords. Provide --keyword "X", --keywords-file <path>, or positional keywords.');
    return Array.from(new Set(list));
}
function latestFile(directory, suffix) {
    if (!fs.existsSync(directory))
        return null;
    const files = fs
        .readdirSync(directory)
        .filter((name) => name.endsWith(suffix))
        .map((name) => path.join(directory, name))
        .filter((file) => fs.statSync(file).isFile())
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return files[0] || null;
}
function loadDataforseoSerpResults(projectDir, keyword, override) {
    const file = override || latestFile(path.join(projectDir, "sources", "serp"), `-${slugify(keyword)}.normalized.json`);
    if (!file || !fs.existsSync(file))
        return [];
    return readJson(file).organic_results || [];
}
function loadWebsearchResults(projectDir, keyword, override) {
    const file = override || path.join(projectDir, "sources", "websearch", `${slugify(keyword)}.json`);
    if (!fs.existsSync(file))
        return [];
    const data = readJson(file);
    return data.results || data.organic_results || [];
}
function loadKeywordMetrics(projectDir, keyword) {
    const file = latestFile(path.join(projectDir, "workbench", "keyword-research"), `-${slugify(keyword)}.json`);
    if (!file)
        return null;
    const primary = (readJson(file).keywords || [])[0];
    if (!primary || (primary.search_volume == null && primary.competition == null))
        return null;
    return { search_volume: primary.search_volume, competition: primary.competition, cpc: primary.cpc, source_path: path.relative(projectDir, file) };
}
function projectDisplayName(projectDir) {
    const config = path.join(projectDir, ".seo-brain", "project.json");
    if (!fs.existsSync(config))
        return "SEO Brain";
    try {
        return String(readJson(config).name || "SEO Brain");
    }
    catch {
        return "SEO Brain";
    }
}
async function commandProjectInit(args) {
    const name = args._[0] || "SEO Brain Project";
    const p = PROJECT_DIR;
    for (const dir of ["wiki", "web", "sources", "workbench", "artifacts", ".seo-brain"])
        mkdirp(path.join(p, dir));
    copyDir(path.join(TEMPLATES_DIR, "wiki"), path.join(p, "wiki"));
    writeJson(path.join(p, ".seo-brain", "project.json"), { name, created_at: nowIso(), language: args.language || "pt-BR", market: args.market || "Brasil", status: "draft" });
    appendLog("init", "Projeto criado", ["index"], `Projeto ${name} inicializado.`, "pending");
    printJson({ ok: true, project_dir: p });
}
async function commandWikiLint(args) {
    const p = ensureProject();
    const wiki = path.join(p, "wiki");
    const findings = [];
    for (const rel of REQUIRED_WIKI_PAGES) {
        const file = path.join(wiki, rel);
        if (!fs.existsSync(file)) {
            findings.push({ severity: "error", file: rel, message: "required Wiki page missing" });
            continue;
        }
        const [fm, body] = parseFrontmatter(fs.readFileSync(file, "utf8"));
        if (!("status" in fm))
            findings.push({ severity: "warning", file: rel, message: "missing status frontmatter" });
        if (STRATEGIC_PAGES.has(rel) && fm.status === "approved" && !fm.approved_by)
            findings.push({ severity: "error", file: rel, message: "strategic page approved without approved_by" });
        for (const match of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
            const target = match[1].split("|", 1)[0].trim();
            const candidate = path.join(wiki, target.endsWith(".md") ? target : `${target}.md`);
            if (!fs.existsSync(candidate))
                findings.push({ severity: "warning", file: rel, message: `broken wikilink: [[${match[1]}]]` });
        }
    }
    findings.push(...lintContentPublication(p));
    const result = { ok: !findings.some((f) => f.severity === "error"), findings };
    writeJson(path.join(p, "workbench", "wiki-lint.json"), result);
    appendLog("lint", "Wiki lint", ["workbench/wiki-lint.json"], `${findings.length} apontamentos encontrados.`, "not-required");
    printJson(result);
}
function lintContentPublication(projectDir) {
    const findings = [];
    const contentDir = path.join(projectDir, "wiki", "conteudos");
    const briefsDir = path.join(projectDir, "workbench", "content");
    if (!fs.existsSync(contentDir))
        return findings;
    for (const name of fs.readdirSync(contentDir)) {
        if (!name.endsWith(".md") || ["index.md", "topic-clusters.md"].includes(name))
            continue;
        const brief = path.join(briefsDir, `${path.basename(name, ".md")}.brief.json`);
        if (!fs.existsSync(brief))
            continue;
        let data;
        try {
            data = readJson(brief);
        }
        catch {
            findings.push({ severity: "warning", file: `conteudos/${name}`, message: `brief is not valid JSON: ${path.relative(projectDir, brief)}` });
            continue;
        }
        const forbidden = (data.must_not_mention_in_prose || []).map((d) => String(d).trim().toLowerCase()).filter(Boolean);
        const [, body] = parseFrontmatter(fs.readFileSync(path.join(contentDir, name), "utf8"));
        const clean = body.replace(/```[\s\S]*?```/g, "").toLowerCase();
        for (const domain of forbidden)
            if (clean.includes(domain))
                findings.push({ severity: "error", file: `conteudos/${name}`, message: `forbidden domain mentioned in prose: ${domain}` });
    }
    return findings;
}
async function commandWikiApprove(args) {
    const rel = required(args, "page").replace(/^\/+/, "");
    const by = required(args, "by");
    const file = path.join(ensureProject(), "wiki", rel);
    if (!fs.existsSync(file))
        throw new CliError(`Wiki page not found: ${file}`);
    setFrontmatterValue(file, { status: "approved", approved_by: JSON.stringify(by), approved_at: JSON.stringify(nowIso()), last_reviewed: JSON.stringify(today()) });
    appendLog("approval", rel, [rel.replace(/\.md$/, "")], `Pagina ${rel} aprovada por ${by}.`, "approved");
    printJson({ ok: true, approved: rel, by });
}
async function commandWikiIngest(args) {
    const source = required(args, "source");
    if (!fs.existsSync(source))
        throw new CliError(`Source not found: ${source}`);
    const p = ensureProject();
    const target = path.join(p, "sources", "manual", `${today()}-${slugify(path.basename(source, path.extname(source)))}${path.extname(source)}`);
    mkdirp(path.dirname(target));
    fs.copyFileSync(source, target);
    appendLog("ingest", path.basename(source), [path.relative(p, target)], "Fonte manual adicionada ao projeto.", "not-required");
    printJson({ ok: true, source: target });
}
async function commandDataSetup(args) {
    const login = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_login || getSecret("DATAFORSEO_LOGIN");
    const password = process.env.CLAUDE_PLUGIN_OPTION_dataforseo_password || getSecret("DATAFORSEO_PASSWORD");
    const mode = resolveDataforseoMode(args);
    const decision = resolveSeoProvider();
    const status = {
        dataforseo_login: mask(login),
        dataforseo_password: mask(password),
        default_mode: mode,
        dataforseo_configured: Boolean(login && password),
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
    };
    if (args.check) {
        try {
            const data = await dataforseoRequest("GET", "/v3/appendix/user_data", undefined, Boolean(args.sandbox));
            const task = (data.tasks || [{}])[0];
            const result = (task.result || [{}])[0];
            Object.assign(status, { live_ok: data.status_code === 20000, status_message: data.status_message, balance: result.money?.balance || result.balance });
        }
        catch (error) {
            Object.assign(status, { live_ok: false, error: String(error.message || error) });
        }
    }
    printJson(status);
}
async function commandSerpExtract(args) {
    const keyword = required(args, "keyword");
    const p = ensureProject();
    const mode = resolveDataforseoMode(args);
    const payload = [{ keyword, location_name: args.location || "Brazil", language_code: args.language || "pt", device: args.device || "desktop", depth: Number(args.depth || 10) }];
    let source;
    if (mode === "live")
        source = { ...(await dataforseoRequest("POST", "/v3/serp/google/organic/live/advanced", payload, Boolean(args.sandbox))), mode: "live" };
    else if (mode === "standard")
        source = await dataforseoStandardTask("/v3/serp/google/organic/task_post", "/v3/serp/google/organic/task_get/advanced/{id}", payload, Boolean(args.sandbox), Number(args.poll_interval || 10), Number(args.timeout || 180));
    else if (mode === "async")
        source = await dataforseoAsyncTask("/v3/serp/google/organic/task_post", payload, Boolean(args.sandbox), args.pingback_url, args.postback_url, args.postback_data || "advanced");
    else
        source = { status_code: "offline", mode: "offline", tasks: [], note: "Run with --mode standard or --mode live to fetch DataForSEO SERP data." };
    const normalized = normalizeSerp(source, keyword, args.location || "Brazil", args.language || "pt", args.device || "desktop");
    const base = path.join(p, "sources", "serp", `${stamp()}-${slugify(keyword)}`);
    writeJson(`${base}.raw.json`, source);
    writeJson(`${base}.normalized.json`, normalized);
    writeJson(path.join(p, "workbench", "serp", `${stamp()}-${slugify(keyword)}.json`), normalized);
    appendLog("serp", keyword, [path.relative(p, `${base}.normalized.json`)], "SERP extraida e normalizada.", "not-required");
    printJson(normalized);
}
const VOLUME_ENDPOINTS = {
    liveEndpoint: "/v3/keywords_data/google_ads/search_volume/live",
    taskPostEndpoint: "/v3/keywords_data/google_ads/search_volume/task_post",
    taskGetEndpoint: "/v3/keywords_data/google_ads/search_volume/task_get/{id}",
};
const SUGGESTIONS_ENDPOINTS = {
    liveEndpoint: "/v3/dataforseo_labs/google/keyword_suggestions/live",
    taskPostEndpoint: null,
    taskGetEndpoint: null,
};
const KEYWORD_IDEAS_ENDPOINTS = {
    liveEndpoint: "/v3/dataforseo_labs/google/keyword_ideas/live",
    taskPostEndpoint: null,
    taskGetEndpoint: null,
};
async function commandKeywordResearch(args) {
    const p = ensureProject();
    if (args.suggestions)
        return runKeywordSuggestions(args, p);
    return runKeywordVolume(args, p);
}
async function runKeywordVolume(args, projectDir) {
    const keywords = collectKeywords(args);
    const isBulk = keywords.length > 1;
    const payload = [{ keywords, location_name: args.location || "Brazil", language_code: args.language || "pt" }];
    const source = await runDataforseoCall(VOLUME_ENDPOINTS, payload, args);
    const normalized = normalizeKeywords(source, keywords, args.location || "Brazil", args.language || "pt");
    const slug = isBulk ? `bulk-${keywords.length}` : slugify(keywords[0]);
    const ts = stamp();
    const base = path.join(projectDir, "sources", "keyword-research", `${ts}-${slug}`);
    writeJson(`${base}.raw.json`, source);
    writeJson(`${base}.normalized.json`, normalized);
    writeJson(path.join(projectDir, "workbench", "keyword-research", `${ts}-${slug}.json`), normalized);
    const logTitle = isBulk ? `bulk (${keywords.length} keywords)` : keywords[0];
    appendLog("keyword-research", logTitle, [path.relative(projectDir, `${base}.normalized.json`)], "Pesquisa de keyword registrada.", "not-required");
    printJson(normalized);
}
async function runKeywordSuggestions(args, projectDir) {
    const seed = required(args, "keyword");
    const limit = Math.max(1, Math.min(1000, Number(args.limit || 100)));
    const payload = [{ keyword: seed, location_name: args.location || "Brazil", language_code: args.language || "pt", limit, include_seed_keyword: true }];
    const source = await runDataforseoCall(SUGGESTIONS_ENDPOINTS, payload, args);
    const normalized = normalizeSuggestions(source, seed, args.location || "Brazil", args.language || "pt");
    const slug = slugify(seed);
    const ts = stamp();
    const base = path.join(projectDir, "sources", "keyword-research", `${ts}-${slug}.suggestions`);
    writeJson(`${base}.raw.json`, source);
    writeJson(`${base}.normalized.json`, normalized);
    writeJson(path.join(projectDir, "workbench", "keyword-research", `${ts}-${slug}.suggestions.json`), normalized);
    appendLog("keyword-suggestions", seed, [path.relative(projectDir, `${base}.normalized.json`)], `Sugestoes de keyword registradas (${normalized.keywords.length} itens).`, "not-required");
    printJson(normalized);
}
async function commandKwVolume(args) {
    ensureProject();
    const keywords = collectKeywords(args);
    const payload = [{ keywords, location_name: args.location || "Brazil", language_code: args.language || "pt" }];
    const source = await runDataforseoCall(VOLUME_ENDPOINTS, payload, args);
    const normalized = normalizeKeywords(source, keywords, args.location || "Brazil", args.language || "pt");
    const lean = {
        provider: normalized.provider,
        mode: normalized.mode,
        timestamp: normalized.timestamp,
        location: normalized.location,
        language: normalized.language,
        items: (normalized.keywords || []).map((k) => ({ keyword: k.keyword, volume: k.search_volume ?? null, cpc: k.cpc ?? null, competition: k.competition ?? null })),
        note: normalized.note,
    };
    printJson(lean);
}
async function commandBacklinkAnalysis(args) {
    const target = required(args, "target");
    const p = ensureProject();
    const mode = resolveDataforseoMode(args);
    const payload = [{ target, include_subdomains: true, backlinks_status_type: "live" }];
    let source;
    if (mode === "live" || mode === "standard") {
        source = { ...(await dataforseoRequest("POST", "/v3/backlinks/summary/live", payload, Boolean(args.sandbox))), mode: "live" };
        if (mode === "standard")
            source.mode_note = "DataForSEO Backlinks API supports only Live retrieval; standard maps to live for backlinks.";
    }
    else if (mode === "async")
        throw new CliError("DataForSEO Backlinks API supports only Live retrieval in v3; async is not available for backlink-analysis.");
    else
        source = { status_code: "offline", mode: "offline", tasks: [], note: "Run with --mode live or --mode standard to fetch DataForSEO backlink data." };
    const result = source.tasks?.length ? source.tasks[0].result?.[0] || {} : {};
    const normalized = { target, provider: source.tasks?.length ? "dataforseo" : "offline", mode: source.mode || "unknown", timestamp: nowIso(), backlinks: result.backlinks, referring_domains: result.referring_domains, referring_main_domains: result.referring_main_domains, rank: result.rank, spam_score: result.backlinks_spam_score, note: source.mode_note || (source.tasks?.length ? null : "Backlink metrics unavailable without a provider call.") };
    const base = path.join(p, "sources", "backlinks", `${stamp()}-${slugify(target)}`);
    writeJson(`${base}.raw.json`, source);
    writeJson(path.join(p, "workbench", "backlinks", `${stamp()}-${slugify(target)}.json`), normalized);
    appendLog("backlinks", target, [path.relative(p, `${base}.raw.json`)], "Analise de backlinks registrada.", "not-required");
    printJson(normalized);
}
async function commandSeoAnalysis(args) {
    const keyword = required(args, "keyword");
    const p = ensureProject();
    const decision = resolveSeoProvider(args.provider || "auto");
    const organic = decision.provider === "dataforseo" ? loadDataforseoSerpResults(p, keyword, args.serp_file) : loadWebsearchResults(p, keyword, args.websearch_file);
    const keywordMetrics = decision.provider === "dataforseo" ? loadKeywordMetrics(p, keyword) : null;
    const topResults = organic.map((item, idx) => ({ position: item.rank_absolute || item.rank_group || item.position || idx + 1, title: item.title || "", url: item.url || "", snippet: item.snippet || item.description || "", domain: item.domain || "" }));
    const competitors = [];
    for (const entry of topResults.slice(0, 3)) {
        let extracted = {};
        let status = null;
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
    if (incomplete)
        limitations.push(`Apenas ${topResults.length} resultados disponíveis; ideal >=5.`);
    if (decision.provider === "websearch" && !topResults.length)
        limitations.push(`Nenhum resultado em sources/websearch/${slugify(keyword)}.json. Rode WebSearch e grave o JSON antes de reexecutar.`);
    if (decision.provider === "dataforseo" && keywordMetrics === null)
        limitations.push("Sem keyword-research recente para enriquecer keyword_metrics.");
    const report = {
        keyword,
        provider: decision.provider,
        provider_reason: decision.reason,
        keyword_metrics: keywordMetrics,
        top_results: topResults,
        competitors,
        intent,
        heading_patterns: competitors
            .map((c) => ({ url: c.serp.url, h1: (c.page.headings || []).find((h) => h.level === "h1")?.text || "", h2_count: (c.page.headings || []).filter((h) => h.level === "h2").length }))
            .filter((item) => item.h1 || item.h2_count),
        gaps: ["Mapear entidades e subtopicos pouco cobertos pelo top 3.", "Confirmar formato dominante: artigo, listicle, guia passo a passo.", "Identificar perguntas reais do leitor nao respondidas pelos competidores."],
        improvement_hypotheses: ["Cobertura mais densa de exemplos brasileiros do que os concorrentes.", "EEAT explicito com autoria e proveniencia declarada, ausente em parte do top 3.", "Estrutura de heading que responda a intencao observada antes de aprofundar."],
        limitations,
        incomplete,
        generated_at: nowIso(),
    };
    const out = path.join(p, "workbench", "seo-analysis", `${slugify(keyword)}.json`);
    writeJson(out, report);
    appendLog("seo-analysis", keyword, [path.relative(p, out)], `Analise SEO via ${decision.provider} (${topResults.length} resultados).`, "not-required");
    printJson(report);
}
function loadExistingCluster(projectDir, seedSlug) {
    const file = path.join(projectDir, "workbench", "topic-cluster", `${seedSlug}.json`);
    if (!fs.existsSync(file))
        return null;
    try {
        return readJson(file);
    }
    catch {
        return null;
    }
}
function buildClusterPage(role, item, serp) {
    return {
        role,
        title: null,
        slug: slugify(item.keyword),
        entity: null,
        keyword_principal: { keyword: item.keyword, volume: item.volume },
        keywords_secondary: [],
        funnel_stage: null,
        serp_intent: null,
        judgment: null,
        serp_evidence: serp ? { provider: serp.provider, organic_top: (serp.organic_results || []).slice(0, 5), serp_features: serp.serp_features || [] } : null,
    };
}
function pageSlug(page) {
    if (page.slug)
        return String(page.slug);
    if (page.keyword_principal?.keyword)
        return slugify(String(page.keyword_principal.keyword));
    if (page.title)
        return slugify(String(page.title));
    return "";
}
function mergeClusterPage(existing, fresh) {
    if (!existing)
        return fresh;
    const existingSecondary = Array.isArray(existing.keywords_secondary) && existing.keywords_secondary.length ? existing.keywords_secondary : null;
    return {
        ...fresh,
        title: existing.title ?? fresh.title,
        entity: existing.entity ?? fresh.entity,
        keywords_secondary: existingSecondary ?? fresh.keywords_secondary,
        funnel_stage: existing.funnel_stage ?? fresh.funnel_stage,
        serp_intent: existing.serp_intent ?? existing.intent ?? fresh.serp_intent,
        judgment: existing.judgment ?? fresh.judgment,
    };
}
function mergeClusterPages(existingPages, freshPages) {
    const bySlug = new Map();
    for (const ep of existingPages) {
        const slug = pageSlug(ep);
        if (slug)
            bySlug.set(slug, ep);
    }
    const merged = [];
    const seen = new Set();
    for (const fresh of freshPages) {
        const slug = pageSlug(fresh);
        merged.push(mergeClusterPage(bySlug.get(slug), fresh));
        seen.add(slug);
    }
    for (const ep of existingPages) {
        const slug = pageSlug(ep);
        if (!slug || seen.has(slug))
            continue;
        merged.push({
            role: ep.role === "pillar" ? "pillar" : "support",
            title: ep.title ?? null,
            slug,
            entity: ep.entity ?? null,
            keyword_principal: ep.keyword_principal ?? { keyword: ep.title || slug, volume: null },
            keywords_secondary: Array.isArray(ep.keywords_secondary) ? ep.keywords_secondary : [],
            funnel_stage: ep.funnel_stage ?? null,
            serp_intent: ep.serp_intent ?? ep.intent ?? null,
            judgment: ep.judgment ?? null,
            serp_evidence: ep.serp_evidence ?? null,
        });
    }
    return merged;
}
async function commandTopicCluster(args) {
    const seed = required(args, "seed");
    const p = ensureProject();
    const seedSlug = slugify(seed);
    const clusterFile = path.join(p, "workbench", "topic-cluster", `${seedSlug}.json`);
    const existingCluster = loadExistingCluster(p, seedSlug);
    if (args.render_only) {
        if (!existingCluster)
            throw new CliError(`No cluster JSON found for seed "${seed}". Run topic-cluster first.`);
        renderTopicClustersWiki(p);
        appendLog("topic-cluster", seed, ["conteudos/topic-clusters"], "Wiki rerenderizada a partir dos JSONs.", "not-required");
        printJson({ ok: true, rendered: true, file: clusterFile });
        return;
    }
    const hypothesisOnly = Boolean(args.hypothesis_only);
    const maxSupports = Math.max(1, Math.min(20, Number(args.max_supports || 7)));
    const language = args.language || "pt-BR";
    const location = args.location || "Brazil";
    const langCode = String(language).split("-")[0] || "pt";
    let suggestions = { keywords: [], provider: null };
    let ideas = { keywords: [], provider: null };
    let serpProvider = null;
    const serpByKeyword = new Map();
    if (!hypothesisOnly) {
        if (!dataforseoCredentialsPresent())
            throw new CliError("DataForSEO credentials missing. Set DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD or rerun with --hypothesis-only.");
        const limit = Math.max(maxSupports * 4, 50);
        const tsSugg = stamp();
        const baseSugg = path.join(p, "sources", "keyword-research", `${tsSugg}-${seedSlug}.suggestions`);
        const suggestionsSource = await runDataforseoCall(SUGGESTIONS_ENDPOINTS, [{ keyword: seed, location_name: location, language_code: langCode, limit, include_seed_keyword: true }], args);
        suggestions = normalizeSuggestions(suggestionsSource, seed, location, language);
        writeJson(`${baseSugg}.raw.json`, suggestionsSource);
        writeJson(`${baseSugg}.normalized.json`, suggestions);
        writeJson(path.join(p, "workbench", "keyword-research", `${tsSugg}-${seedSlug}.suggestions.json`), suggestions);
        const minPoolTarget = Math.max(maxSupports * 2, 20);
        if ((suggestions.keywords || []).length < minPoolTarget) {
            const tsIdeas = stamp();
            const baseIdeas = path.join(p, "sources", "keyword-research", `${tsIdeas}-${seedSlug}.ideas`);
            const ideasSource = await runDataforseoCall(KEYWORD_IDEAS_ENDPOINTS, [{ keywords: [seed], location_name: location, language_code: langCode, limit, closely_variants: true }], args);
            ideas = normalizeSuggestions(ideasSource, seed, location, language);
            writeJson(`${baseIdeas}.raw.json`, ideasSource);
            writeJson(`${baseIdeas}.normalized.json`, ideas);
            writeJson(path.join(p, "workbench", "keyword-research", `${tsIdeas}-${seedSlug}.ideas.json`), ideas);
        }
    }
    const seen = new Set();
    const pool = [];
    for (const item of [...(suggestions.keywords || []), ...(ideas.keywords || [])]) {
        const keyword = String(item.keyword || "").trim();
        if (!keyword)
            continue;
        const key = keyword.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        pool.push({ keyword, volume: item.search_volume ?? null, cpc: item.cpc ?? null, competition: item.competition ?? null });
    }
    const seedLower = seed.trim().toLowerCase();
    const seedInPool = pool.find((k) => k.keyword.toLowerCase() === seedLower);
    const pillarKeyword = seedInPool || { keyword: seed, volume: null, cpc: null, competition: null };
    const supportPool = pool.filter((k) => k.keyword.toLowerCase() !== pillarKeyword.keyword.toLowerCase());
    supportPool.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    const topSupports = supportPool.slice(0, maxSupports);
    if (!hypothesisOnly) {
        const allKeywords = [pillarKeyword.keyword, ...topSupports.map((s) => s.keyword)];
        if (allKeywords.length) {
            const { source, normalized } = await serpForKeywords(allKeywords, args);
            const baseSerp = path.join(p, "sources", "serp", `${stamp()}-cluster-${seedSlug}`);
            writeJson(`${baseSerp}.raw.json`, source);
            writeJson(`${baseSerp}.normalized.json`, normalized);
            for (const entry of normalized)
                serpByKeyword.set(entry.keyword, entry);
            serpProvider = "dataforseo";
        }
    }
    const freshPillar = buildClusterPage("pillar", { keyword: pillarKeyword.keyword, volume: pillarKeyword.volume ?? null }, serpByKeyword.get(pillarKeyword.keyword));
    const freshSupports = topSupports.map((item) => buildClusterPage("support", { keyword: item.keyword, volume: item.volume ?? null }, serpByKeyword.get(item.keyword)));
    const existingSupports = Array.isArray(existingCluster?.supporting_pages) ? existingCluster.supporting_pages : [];
    const mergedPillar = mergeClusterPage(existingCluster?.pillar, freshPillar);
    const mergedSupports = mergeClusterPages(existingSupports, freshSupports);
    const status = hypothesisOnly ? "hypothesis" : (suggestions.keywords?.length ? "draft" : "hypothesis");
    const cluster = {
        seed,
        seed_slug: seedSlug,
        status,
        language,
        location,
        generated_at: nowIso(),
        business_goal: existingCluster?.business_goal ?? { primary: null, secondary: [], notes: null },
        data_provenance: {
            suggestions: suggestions.keywords?.length ? { provider: suggestions.provider, count: suggestions.keywords.length, endpoint: "dataforseo_labs/keyword_suggestions" } : null,
            ideas: ideas.keywords?.length ? { provider: ideas.provider, count: ideas.keywords.length, endpoint: "dataforseo_labs/keyword_ideas" } : null,
            pool_size: pool.length,
            serp: serpByKeyword.size ? { provider: serpProvider, keyword_count: serpByKeyword.size } : null,
            hypothesis_only: hypothesisOnly || null,
        },
        pillar: mergedPillar,
        supporting_pages: mergedSupports,
        keyword_pool: pool,
        completeness_gaps: existingCluster?.completeness_gaps ?? [],
        open_questions: existingCluster?.open_questions ?? [],
        approval: existingCluster?.approval ?? { approved_by: null, approved_at: null, status: "draft" },
    };
    writeJson(clusterFile, cluster);
    renderTopicClustersWiki(p);
    appendLog("topic-cluster", seed, ["conteudos/topic-clusters"], `Cluster ${status} com ${mergedSupports.length} suportes (pool: ${pool.length}, SERP: ${serpByKeyword.size}).`, "pending");
    printJson(cluster);
}
function renderTopicClustersWiki(projectDir) {
    const dir = path.join(projectDir, "workbench", "topic-cluster");
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
    const clusters = [];
    for (const f of files) {
        try {
            clusters.push(readJson(path.join(dir, f)));
        }
        catch { /* skip malformed JSON */ }
    }
    writeText(path.join(projectDir, "wiki", "conteudos", "topic-clusters.md"), renderTopicClustersMarkdown(clusters));
}
function renderTopicClustersMarkdown(clusters) {
    const lines = [];
    lines.push("---");
    lines.push('title: "Topic clusters"');
    lines.push("status: draft");
    lines.push("pillar: estrategia");
    lines.push("owner: shared");
    lines.push(`last_reviewed: "${today()}"`);
    lines.push("approved_by: null");
    lines.push("approved_at: null");
    lines.push("sources: []");
    lines.push("judgment_level: strategic");
    lines.push("auto_generated: true");
    lines.push("---");
    lines.push("");
    lines.push("# Topic clusters");
    lines.push("");
    lines.push("Auto-gerado a partir de `workbench/topic-cluster/*.json`. Os campos de julgamento (title, entity, keywords_secondary, funnel_stage, serp_intent, judgment) sao editados nos JSONs; rode `bin/seo-brain topic-cluster --seed <seed> --render-only` para regenerar esta pagina.");
    lines.push("");
    if (!clusters.length) {
        lines.push("Nenhum cluster registrado.");
        lines.push("");
        return lines.join("\n");
    }
    lines.push("## Visao geral");
    lines.push("");
    lines.push("| Cluster | Pillar | Status | Suportes | Idioma |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const c of clusters) {
        const pillarKw = c.pillar?.keyword_principal?.keyword || c.pillar?.title || c.seed || "—";
        const supports = Array.isArray(c.supporting_pages) ? c.supporting_pages.length : 0;
        lines.push(`| ${escapeCell(String(c.seed || "—"))} | ${escapeCell(String(pillarKw))} | ${c.status || "—"} | ${supports} | ${c.language || "—"} |`);
    }
    lines.push("");
    for (const c of clusters) {
        lines.push(...renderClusterSection(c));
        lines.push("");
    }
    return lines.join("\n") + "\n";
}
function renderClusterSection(c) {
    const lines = [];
    lines.push(`## Cluster: ${c.seed || "(sem seed)"}`);
    lines.push("");
    const dp = c.data_provenance || {};
    const provBits = [];
    if (dp.suggestions)
        provBits.push(`suggestions: ${dp.suggestions.provider || "—"} (${dp.suggestions.count || 0} itens)`);
    if (dp.serp)
        provBits.push(`SERP: ${dp.serp.provider || "—"} (${dp.serp.keyword_count || 0} keywords)`);
    if (dp.hypothesis_only)
        provBits.push("modo: hypothesis-only");
    lines.push(`- Status: ${c.status || "—"}`);
    lines.push(`- Idioma/Localidade: ${c.language || "—"} / ${c.location || "—"}`);
    lines.push(`- Gerado em: ${c.generated_at || "—"}`);
    if (provBits.length)
        lines.push(`- Provenance: ${provBits.join(" · ")}`);
    if (c.business_goal?.primary)
        lines.push(`- Objetivo de negocio: ${c.business_goal.primary}`);
    lines.push("");
    lines.push("| Papel | Entidade | KW principal | Volume | KW Secundarias | Funil | Intencao de Busca |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    if (c.pillar)
        lines.push(renderPageRow({ ...c.pillar, role: "pillar" }));
    for (const s of c.supporting_pages || [])
        lines.push(renderPageRow({ ...s, role: s.role === "pillar" ? "pillar" : "support" }));
    if (Array.isArray(c.completeness_gaps) && c.completeness_gaps.length) {
        lines.push("");
        lines.push("### Lacunas de completude");
        lines.push("");
        for (const g of c.completeness_gaps)
            lines.push(`- ${g}`);
    }
    if (Array.isArray(c.open_questions) && c.open_questions.length) {
        lines.push("");
        lines.push("### Questoes abertas");
        lines.push("");
        for (const q of c.open_questions)
            lines.push(`- ${q}`);
    }
    return lines;
}
function renderPageRow(page) {
    const role = page.role === "pillar" ? "Pillar" : "Suporte";
    const entity = page.entity ?? "—";
    const kp = page.keyword_principal || {};
    const kpKw = kp.keyword ?? "—";
    const kpVol = kp.volume == null ? "—" : String(kp.volume);
    const secondary = Array.isArray(page.keywords_secondary) && page.keywords_secondary.length
        ? page.keywords_secondary.map((s) => `${s.keyword || "?"} (${s.volume == null ? "—" : s.volume})`).join(", ")
        : "—";
    const funnel = page.funnel_stage ?? "—";
    const intent = page.serp_intent ?? "—";
    return `| ${role} | ${escapeCell(String(entity))} | ${escapeCell(String(kpKw))} | ${kpVol} | ${escapeCell(secondary)} | ${escapeCell(String(funnel))} | ${escapeCell(String(intent))} |`;
}
function escapeCell(value) {
    return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
async function commandEeat(args) {
    const p = ensureProject();
    const page = path.join(p, "wiki", "eeat.md");
    if (!fs.existsSync(page))
        fs.copyFileSync(path.join(TEMPLATES_DIR, "wiki", "eeat.md"), page);
    const evidence = { claim: args.claim || "Evidencia a mapear", source: args.source || "sem fonte", status: args.status || "gap", timestamp: nowIso() };
    const report = { timestamp: nowIso(), evidence, rules: ["Nao inventar experiencia, clientes, credenciais, premios ou provas.", "Marcar alegacoes sem fonte como gap.", "Manter wiki/eeat.md em draft ou needs-review ate aprovacao explicita."] };
    fs.appendFileSync(page, `\n\n## Evidencia registrada\n\n- Alegacao: ${evidence.claim}\n- Fonte: ${evidence.source}\n- Status: ${evidence.status}\n`, "utf8");
    const out = path.join(p, "workbench", "eeat", `${stamp()}.json`);
    writeJson(out, report);
    appendLog("eeat", "Evidencia EEAT", ["eeat", path.relative(p, out)], "Evidencia ou lacuna EEAT registrada.", "pending");
    printJson(report);
}
async function commandContentSeo(args) {
    const topic = required(args, "topic");
    const p = ensureProject();
    const topicSlug = slugify(topic);
    const keyword = args.keyword || topic;
    const keywordSlug = slugify(keyword);
    const analysisFile = path.join(p, "workbench", "seo-analysis", `${keywordSlug}.json`);
    if (!fs.existsSync(analysisFile) && !args.skip_data)
        throw new CliError(`Missing seo-analysis for this topic. Run: bin/seo-brain seo-analysis --keyword "${keyword}" or rerun content-seo with --skip-data --skip-data-reason "motivo claro" para gerar um briefing sem proveniencia de SERP.`);
    if (args.skip_data && !args.skip_data_reason)
        throw new CliError('--skip-data requires --skip-data-reason "motivo claro".');
    const analysisData = fs.existsSync(analysisFile) ? readJson(analysisFile) : null;
    const mustNotMention = Array.from(new Set((analysisData?.top_results || []).map((entry) => String(entry.domain || "").trim().toLowerCase()).filter(Boolean))).sort();
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
async function commandTechnicalSeo(args) {
    let html;
    let status = null;
    let source;
    let headers = {};
    if (args.html_file) {
        html = fs.readFileSync(args.html_file, "utf8");
        source = args.html_file;
    }
    else if (args.url) {
        const fetched = await fetchUrl(args.url);
        html = fetched.html;
        status = fetched.status;
        source = fetched.finalUrl || args.url;
        headers = fetched.headers;
    }
    else {
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
async function commandNextWebsiteCreator(args) {
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
async function commandPayloadCms(args) {
    const web = path.join(ensureProject(), "web");
    mkdirp(web);
    writeText(path.join(web, "payload.config.ts"), "import { buildConfig } from 'payload'\n\nexport default buildConfig({\n  collections: [\n    { slug: 'pages', fields: [{ name: 'title', type: 'text', required: true }, { name: 'seoTitle', type: 'text' }, { name: 'seoDescription', type: 'textarea' }] },\n    { slug: 'posts', fields: [{ name: 'title', type: 'text', required: true }, { name: 'slug', type: 'text', required: true }, { name: 'content', type: 'richText' }] },\n    { slug: 'authors', fields: [{ name: 'name', type: 'text', required: true }, { name: 'bio', type: 'textarea' }] }\n  ]\n})\n");
    appendLog("technology", "Payload CMS", ["web/payload.config.ts"], "Config inicial do Payload criada.", "pending");
    printJson({ ok: true, payload_config: path.join(web, "payload.config.ts") });
}
async function commandUxWeb(args) {
    const p = ensureProject();
    const projectName = projectDisplayName(p);
    const reportLinks = [];
    walk(path.join(p, "workbench"), (file) => reportLinks.push(`<li>${path.relative(p, file)}</li>`));
    const pending = [];
    for (const rel of STRATEGIC_PAGES) {
        const file = path.join(p, "wiki", rel);
        if (fs.existsSync(file)) {
            const [fm] = parseFrontmatter(fs.readFileSync(file, "utf8"));
            if (fm.status !== "approved")
                pending.push(`<li>${rel}: ${fm.status || "sem status"}</li>`);
        }
    }
    const html = `<!doctype html>\n<html lang="pt-BR">\n<meta charset="utf-8">\n<title>SEO Brain - ${projectName}</title>\n<body>\n  <main>\n    <h1>SEO Brain: ${projectName}</h1>\n    <h2>Aprovacoes pendentes</h2>\n    <ul>${pending.join("") || "<li>Nenhuma</li>"}</ul>\n    <h2>Relatorios</h2>\n    <ul>${reportLinks.join("") || "<li>Nenhum relatorio gerado</li>"}</ul>\n  </main>\n</body>\n</html>\n`;
    const out = path.join(p, "artifacts", "dashboard", "index.html");
    writeText(out, html);
    appendLog("ux", "Dashboard", [path.relative(p, out)], "Dashboard HTML gerado.", "not-required");
    printJson({ ok: true, dashboard: out });
}
async function commandAuditSkills(args) {
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
function walk(dir, cb) {
    if (!fs.existsSync(dir))
        return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory())
            walk(p, cb);
        else
            cb(p);
    }
}
const COMMANDS = {
    "project-init": commandProjectInit,
    "wiki-lint": commandWikiLint,
    "wiki-approve": commandWikiApprove,
    "wiki-ingest": commandWikiIngest,
    "data-setup": commandDataSetup,
    "serp-extract": commandSerpExtract,
    "keyword-research": commandKeywordResearch,
    "kw-volume": commandKwVolume,
    "backlink-analysis": commandBacklinkAnalysis,
    "seo-analysis": commandSeoAnalysis,
    "topic-cluster": commandTopicCluster,
    eeat: commandEeat,
    "content-seo": commandContentSeo,
    "technical-seo": commandTechnicalSeo,
    "next-website-creator": commandNextWebsiteCreator,
    "payload-cms": commandPayloadCms,
    "ux-web": commandUxWeb,
    "audit-skills": commandAuditSkills,
};
function parseArgs(argv) {
    const [command, ...rest] = argv;
    if (!command || !(command in COMMANDS))
        throw new CliError(`Unknown command: ${command || ""}`);
    const args = { _: [] };
    for (let i = 0; i < rest.length; i += 1) {
        const token = rest[i];
        if (token.startsWith("--")) {
            const key = token.slice(2).replace(/-/g, "_");
            const next = rest[i + 1];
            if (next === undefined || next.startsWith("--"))
                args[key] = true;
            else {
                args[key] = next;
                i += 1;
            }
        }
        else {
            args._.push(token);
        }
    }
    return { command, args };
}
function required(args, key) {
    const value = args[key];
    if (value === undefined || value === true || value === "")
        throw new CliError(`Missing --${key.replace(/_/g, "-")}.`);
    return String(value);
}
function printJson(data) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
class CliError extends Error {
}
async function main() {
    try {
        const { command, args } = parseArgs(process.argv.slice(2));
        if ("project" in args)
            throw new CliError("--project is no longer supported; SEO Brain uses the single project at project/.");
        await COMMANDS[command](args);
        return 0;
    }
    catch (error) {
        if (error instanceof CliError) {
            process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
            return 1;
        }
        process.stderr.write(`${JSON.stringify({ ok: false, error: String(error.message || error) })}\n`);
        return 1;
    }
}
if (require.main === module) {
    main().then((code) => {
        process.exitCode = code;
    });
}
