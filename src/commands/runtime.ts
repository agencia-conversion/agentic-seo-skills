#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import YAML from "yaml";
import { buildPlayerScoreReport } from "../lib/player-score";

type AnyRecord = Record<string, any>;
type Severity = "critical" | "error" | "warning" | "info";
type DataforseoBypassContext = {
  workflow: string;
  step: string;
  subject?: string;
  reason?: string;
  consequence: string;
  provider_used?: string;
  confirmed?: unknown;
};

const ROOT = path.resolve(__dirname, "../..");
const PROJECT_DIR = resolveProjectDir();
const TEMPLATES_DIR = path.join(ROOT, "templates", "project");
const DATAFORSEO_MODES = new Set(["offline", "live", "standard", "async"]);
const BACKLINK_STATUS_TYPES = new Set(["all", "live", "lost"]);
const REQUIRED_BRAIN_PAGES = [
  "index.md",
  "identidade.md",
  "voz.md",
  "tecnologia.md",
  "editorial.md",
  "topic-clusters.md",
  "log.md",
];
const AUTHORIAL_BRAIN_PAGES = new Set([
  "index.md",
  "identidade.md",
  "voz.md",
  "tecnologia.md",
  "editorial.md",
  "topic-clusters.md",
]);
const PUBLIC_CONTENT_ORIGENS = new Set(["blog", "linkedin", "podcast", "outros"]);

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
  if (!fs.existsSync(PROJECT_DIR)) throw new CliError(`Project not found: ${PROJECT_DIR}. Initialize the SEO Brain project first.`);
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

function writeYaml(file: string, data: unknown): void {
  mkdirp(path.dirname(file));
  const text = YAML.stringify(data, { lineWidth: 0 });
  fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function readYaml(file: string): AnyRecord {
  const data = YAML.parse(fs.readFileSync(file, "utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`YAML root must be an object: ${file}`);
  return data as AnyRecord;
}

function readDataFile(file: string): AnyRecord {
  return file.endsWith(".yaml") || file.endsWith(".yml") ? readYaml(file) : readJson(file);
}

function dataFile(projectDir: string, relNoExt: string): string | null {
  const yaml = path.join(projectDir, `${relNoExt}.yaml`);
  if (fs.existsSync(yaml)) return yaml;
  const json = path.join(projectDir, `${relNoExt}.json`);
  if (fs.existsSync(json)) return json;
  return null;
}

function readContentBrief(file: string): AnyRecord {
  return readDataFile(file);
}

function writeContentBrief(file: string, data: AnyRecord): void {
  if (file.endsWith(".json")) writeJson(file, data);
  else writeYaml(file, data);
}

const WORD_COUNT_METHOD = {
  name: "seo-brain-visible-unicode-words",
  version: "1.0.0",
  excludes: ["frontmatter", "code fences", "inline code", "script/style blocks", "HTML tags"],
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function countUnicodeWords(text: string): number {
  const matches = text.normalize("NFC").match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

function markdownVisibleText(text: string): string {
  const [, body] = parseFrontmatter(text);
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[_*~>|#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlVisibleText(html: string): string {
  return stripTags(
    html
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(?:p|div|section|article|main|aside|header|footer|li|h[1-6]|tr|td|th|br)>/gi, " "),
  );
}

function countVisibleMarkdownWords(text: string): AnyRecord {
  return {
    words: countUnicodeWords(markdownVisibleText(text)),
    method: WORD_COUNT_METHOD,
  };
}

function countVisibleHtmlWords(html: string): AnyRecord {
  return {
    words: countUnicodeWords(htmlVisibleText(html)),
    method: WORD_COUNT_METHOD,
  };
}

function roundUpToHundred(value: number): number {
  return Math.ceil(value / 100) * 100;
}

function contentBriefFile(projectDir: string, slug: string): string | null {
  const current = path.join(projectDir, "workbench", "content", slug, "brief.yaml");
  if (fs.existsSync(current)) return current;
  const base = path.join(projectDir, "workbench", "content", slug);
  const yaml = `${base}.brief.yaml`;
  if (fs.existsSync(yaml)) return yaml;
  const json = `${base}.brief.json`;
  return fs.existsSync(json) ? json : null;
}

function contentWorkbenchDir(projectDir: string, slug: string): string {
  return path.join(projectDir, "workbench", "content", slug);
}

function contentArtifactsDir(projectDir: string, slug: string): string {
  return path.join(projectDir, "artifacts", "contents", slug);
}

function seoAnalysisFile(projectDir: string, keywordSlug: string): string | null {
  return dataFile(projectDir, path.join("workbench", "seo-analysis", keywordSlug));
}

function contentDraftFile(projectDir: string, slug: string): string {
  return path.join(contentArtifactsDir(projectDir, slug), "draft.md");
}

function contentCheckFile(projectDir: string, slug: string): string {
  return path.join(contentArtifactsDir(projectDir, slug), "publication-check.yaml");
}

function contentWordCountFile(projectDir: string, slug: string): string {
  return path.join(contentArtifactsDir(projectDir, slug), "word-count.yaml");
}

function contentReviewFile(projectDir: string, slug: string): string {
  return path.join(contentArtifactsDir(projectDir, slug), "review.yaml");
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

function formatLogFileRefs(files: string[]): string {
  if (!files.length) return "n/a";
  return files.map((f) => {
    const normalized = f.replace(/\\/g, "/").replace(/\.md$/, "");
    if (normalized.startsWith("workbench/") || normalized.startsWith("artifacts/") || normalized.startsWith("../") || normalized.startsWith("sources/") || normalized.includes(".")) return f;
    return `[[${normalized}]]`;
  }).join(", ");
}

function isBrainPageFilled(body: string): boolean {
  const stripped = body.replace(/<!--[\s\S]*?-->/g, "");
  if (/<\w[^>]*>/.test(stripped)) return false;
  return stripped.trim().length > 100;
}

function mapEventTypeToTipo(eventType: string): string {
  const lower = eventType.toLowerCase();
  if (lower.includes("approv") || lower.includes("aprovac")) return "aprovacao";
  if (lower.includes("ingest")) return "ingestao";
  if (lower.includes("lint")) return "lint";
  if (lower.includes("publica")) return "publicacao";
  if (lower.includes("errat")) return "errata";
  if (lower.includes("prova") || lower.includes("proof")) return "prova";
  return "decisao";
}

function appendLog(eventType: string, title: string, files: string[], summary: string, approval: string): void {
  const brainLog = path.join(PROJECT_DIR, "brain", "log.md");
  mkdirp(path.dirname(brainLog));
  const links = formatLogFileRefs(files);
  const tipo = mapEventTypeToTipo(eventType);
  const aprovador = approval && approval !== "not-required" && approval !== "pending" ? approval : "agent";
  const isHumanApprover = aprovador !== "agent" && aprovador !== "pendente";
  const lines = [
    "",
    "",
    `## ${today()} - ${title}`,
    "",
    `- tipo: ${tipo}`,
    `- escopo: ${links}`,
    `- decisao: ${summary}`,
    `- evidencia: ${links}`,
    `- aprovador: ${aprovador}`,
  ];
  if (isHumanApprover) lines.push(`- aprovado_em: ${today()}`);
  fs.appendFileSync(brainLog, lines.join("\n") + "\n", "utf8");
}

function appendOperationalLog(eventType: string, title: string, files: string[], decision: string, summary: string, notes?: string): void {
  const brainLog = path.join(PROJECT_DIR, "brain", "log.md");
  mkdirp(path.dirname(brainLog));
  const links = formatLogFileRefs(files);
  const tipo = mapEventTypeToTipo(eventType);
  const lines = [
    "",
    "",
    `## ${today()} - ${title}`,
    "",
    `- tipo: ${tipo}`,
    `- escopo: ${links}`,
    `- decisao: ${decision}`,
    `- evidencia: ${summary}`,
    "- aprovador: agent",
  ];
  if (notes) lines.push(`- notas: ${notes}`);
  fs.appendFileSync(brainLog, lines.join("\n") + "\n", "utf8");
}

function appendDataforseoBypassLog(title: string, approvals: AnyRecord | AnyRecord[] | null | undefined, files: string[]): void {
  const list = Array.isArray(approvals) ? approvals : approvals ? [approvals] : [];
  for (const approval of list) {
    if (approval?.required_provider !== "dataforseo" || approval.approval_mode === "companion") continue;
    appendOperationalLog(
      "dataforseo-bypass",
      title,
      files,
      `${approval.workflow} sem DataForSEO em ${approval.step}: ${approval.consequence}`,
      "approved",
      `Aprovado por ${approval.aprovador}; motivo: ${approval.reason}; confirmado em ${approval.confirmado_em}.`,
    );
  }
}

function parseFrontmatter(text: string): [AnyRecord, string] {
  if (!text.startsWith("---\n")) return [{}, text];
  const end = text.indexOf("\n---", 4);
  if (end === -1) return [{}, text];
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  try {
    const parsed = YAML.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return [parsed as AnyRecord, body];
  } catch {
    // Fall through to a tiny parser for malformed legacy frontmatter.
  }
  const data: AnyRecord = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > -1 && !/^\s/.test(line)) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return [data, body];
}

function cleanFrontmatterValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value).trim().replace(/^["']|["']$/g, "") || null;
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

const HOME_CREDENTIAL_KEYS: Record<string, string> = {
  DATAFORSEO_LOGIN: "dataforseo_login",
  DATAFORSEO_PASSWORD: "dataforseo_password",
  SEO_BRAIN_DATAFORSEO_MODE: "dataforseo_mode",
};

function getSecret(name: string): string {
  const home = readHomeCredentials();
  const homeKey = HOME_CREDENTIAL_KEYS[name];
  return (
    process.env[name] ||
    readEnvFile(path.join(PROJECT_DIR, ".env.local"))[name] ||
    (homeKey && home[homeKey] ? String(home[homeKey]) : "") ||
    readEnvFile()[name] ||
    ""
  );
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

function seoProviderDefaultStatus(): AnyRecord {
  if (dataforseoCredentialsPresent()) return { provider: "dataforseo", reason: "DataForSEO credentials present in environment." };
  return { provider: "dataforseo", reason: "DataForSEO credentials absent; setup required before SERP-backed SEO analysis.", setup_required: true };
}

function nonemptyString(...values: unknown[]): string {
  for (const value of values) {
    if (value === undefined || value === null || value === true || value === false) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function confirmationMentionsDataforseo(text: string): boolean {
  return /\bdata\s*for\s*seo\b|\bdataforseo\b/i.test(text);
}

function confirmationAcknowledgesBypass(text: string): boolean {
  const normalized = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(sem|without|bypass|dispens|dispenso|pular|skip|ignorar|secondary|secundario)\b/.test(normalized)
    || /\b(nao usar|not use|no dataforseo|not dataforseo)\b/.test(normalized);
}

function dataforseoBypassError(context: DataforseoBypassContext): CliError {
  const subject = context.subject ? ` for "${context.subject}"` : "";
  return new CliError(
    `${context.workflow}${subject} requires written approval to bypass DataForSEO at ${context.step}. ` +
    `Consequence: ${context.consequence} ` +
    `Use the DataForSEO bypass Companion handoff, or pass --dataforseo-bypass-confirmed ` +
    `--dataforseo-bypass-reason "motivo claro" --dataforseo-bypass-approved-by "Nome" ` +
    `--dataforseo-bypass-confirmation-text "Confirmo seguir sem DataForSEO..." ` +
    `--dataforseo-bypass-confirmed-at "${nowIso()}".`,
  );
}

function normalizeDataforseoBypassApproval(args: AnyRecord, context: DataforseoBypassContext, mode: string): AnyRecord {
  const confirmed = boolArg(args.dataforseo_bypass_confirmed ?? context.confirmed, false);
  const reason = nonemptyString(args.dataforseo_bypass_reason, context.reason);
  const approvedBy = nonemptyString(args.dataforseo_bypass_approved_by);
  const confirmationText = nonemptyString(args.dataforseo_bypass_confirmation_text);
  const confirmedAt = nonemptyString(args.dataforseo_bypass_confirmed_at);
  if (!confirmed || !reason || !approvedBy || !confirmationText || !confirmedAt) throw dataforseoBypassError(context);
  if (!confirmationMentionsDataforseo(confirmationText) || !confirmationAcknowledgesBypass(confirmationText)) {
    throw new CliError("DataForSEO bypass confirmation must mention DataForSEO and explicitly acknowledge using a bypass or proceeding without it.");
  }
  if (Number.isNaN(Date.parse(confirmedAt))) throw new CliError("--dataforseo-bypass-confirmed-at must be an ISO-like timestamp.");
  return {
    step: context.step,
    workflow: context.workflow,
    subject: context.subject || null,
    confirmed: true,
    reason,
    consequence: context.consequence,
    aprovador: approvedBy,
    confirmation_text: confirmationText,
    confirmado_em: confirmedAt,
    approval_mode: mode,
    required_provider: "dataforseo",
    provider_used: context.provider_used || "secondary-or-none",
  };
}

function runDataforseoBypassHandoff(context: DataforseoBypassContext): AnyRecord {
  const args = [
    path.join(ROOT, "scripts", "companion.mjs"),
    "dataforseo-bypass",
    "--project-root",
    PROJECT_DIR,
    "--workflow",
    context.workflow,
    "--step",
    context.step,
    "--consequence",
    context.consequence,
  ];
  if (context.subject) args.push("--subject", context.subject);
  if (context.reason) args.push("--reason", context.reason);
  if (context.provider_used) args.push("--provider-used", context.provider_used);
  const handoff = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (handoff.stderr) process.stderr.write(handoff.stderr);
  if (handoff.status !== 0) throw new CliError(`DataForSEO bypass handoff failed: ${handoff.stderr || handoff.stdout || "unknown error"}`);
  const result = JSON.parse(handoff.stdout || "{}");
  if (!result.ok) throw new CliError(`DataForSEO bypass handoff failed: ${result.reason || "unknown error"}`);
  return result.approval || result;
}

function requireDataforseoBypassApproval(args: AnyRecord, context: DataforseoBypassContext): AnyRecord {
  if (boolArg(args.dataforseo_bypass_handoff, false)) {
    const approval = runDataforseoBypassHandoff(context);
    args.dataforseo_bypass_handoff = false;
    args.dataforseo_bypass_confirmed = true;
    args.dataforseo_bypass_reason = approval.reason;
    args.dataforseo_bypass_approved_by = approval.aprovador;
    args.dataforseo_bypass_confirmation_text = approval.confirmation_text;
    args.dataforseo_bypass_confirmed_at = approval.confirmado_em;
    args.dataforseo_bypass_approval_mode = "companion";
    return normalizeDataforseoBypassApproval(args, context, "companion");
  }
  return normalizeDataforseoBypassApproval(args, context, nonemptyString(args.dataforseo_bypass_approval_mode) || "chat-or-cli");
}

function resolveSeoProvider(args: AnyRecord = {}): AnyRecord {
  const prefer = args.provider || "auto";
  const choice = (prefer || "auto").trim().toLowerCase();
  const hasCreds = dataforseoCredentialsPresent();
  if (choice === "websearch") {
    if (!args.websearch_confirmed || !args.websearch_reason) throw new CliError('WebSearch is secondary for ranking research. Use --provider websearch --websearch-confirmed --websearch-reason "motivo claro" only after explicitly accepting this bypass.');
    const bypass = requireDataforseoBypassApproval(args, {
      workflow: "seo-analysis",
      step: "serp-extract-dataforseo",
      subject: args.keyword ? String(args.keyword) : undefined,
      reason: String(args.websearch_reason).trim(),
      consequence: "SERP/ranking data is WebSearch-derived and not DataForSEO-backed.",
      provider_used: "websearch",
      confirmed: args.websearch_confirmed,
    });
    return { provider: "websearch", reason: `Explicit WebSearch bypass: ${bypass.reason}`, bypass };
  }
  if (choice === "dataforseo") {
    if (!hasCreds) throw new CliError("DataForSEO credentials missing. Run: bin/seo-brain data-setup --handoff");
    return { provider: "dataforseo", reason: "Forced by --provider dataforseo." };
  }
  if (choice !== "auto") throw new CliError(`Unsupported provider preference: ${choice}. Use dataforseo, websearch, or auto.`);
  if (hasCreds) return { provider: "dataforseo", reason: "DataForSEO credentials present in environment." };
  throw new CliError("DataForSEO credentials missing. SEO analysis no longer falls back to WebSearch automatically. Run: bin/seo-brain data-setup --handoff");
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

type DataforseoEndpoints = {
  liveEndpoint: string;
  taskPostEndpoint: string | null;
  taskGetEndpoint: string | null;
};

async function runDataforseoCall(endpoints: DataforseoEndpoints, payload: AnyRecord[], args: AnyRecord): Promise<AnyRecord> {
  const requested = resolveDataforseoMode(args);
  const liveOnly = !endpoints.taskPostEndpoint || !endpoints.taskGetEndpoint;
  const mode = liveOnly && (requested === "standard" || requested === "async") ? "live" : requested;
  if (mode === "live") return { ...(await dataforseoRequest("POST", endpoints.liveEndpoint, payload, Boolean(args.sandbox))), mode: "live" };
  if (mode === "standard") return await dataforseoStandardTask(endpoints.taskPostEndpoint!, endpoints.taskGetEndpoint!, payload, Boolean(args.sandbox), Number(args.poll_interval || 10), Number(args.timeout || 180));
  if (mode === "async") return await dataforseoAsyncTask(endpoints.taskPostEndpoint!, payload, Boolean(args.sandbox), args.pingback_url, args.postback_url, args.postback_data || "advanced");
  return { status_code: "offline", mode: "offline", tasks: [], note: "Run with --mode standard or --mode live to fetch DataForSEO data." };
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
  const bodyText = htmlVisibleText(body);
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
    word_count: countUnicodeWords(bodyText),
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
  return { id, name, severity, weight, passed: pass, score: pass ? 100 : 0, points_awarded: pass ? weight : 0, evidence, repair };
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
  const awarded = checks.reduce((sum, item) => sum + item.points_awarded, 0);
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
  const [normalized] = normalizeSerpBatch(source, [keyword], location, language, device);
  return normalized;
}

export function normalizeSerpBatch(source: AnyRecord, keywords: string[], location: string, language: string, device: string): AnyRecord[] {
  if (!Array.isArray(keywords) || keywords.length === 0) throw new Error("normalizeSerpBatch requires a non-empty keywords array.");
  let tasks: AnyRecord[] = source.tasks || [];
  if (source.task_get_responses) tasks = source.task_get_responses.flatMap((r: AnyRecord) => r.tasks || []);
  const baseProvider = tasks.length ? "dataforseo" : source.mode === "async" ? "dataforseo" : "offline";
  const buildEntry = (keyword: string, items: AnyRecord[]): AnyRecord => ({
    keyword,
    provider: items.length ? "dataforseo" : baseProvider,
    mode: source.mode || "unknown",
    timestamp: nowIso(),
    location,
    language,
    device,
    organic_results: items
      .filter((item: AnyRecord) => item.type === "organic")
      .map((item: AnyRecord) => ({ rank_group: item.rank_group, rank_absolute: item.rank_absolute, title: item.title, url: item.url, domain: item.domain, snippet: item.description || item.snippet })),
    serp_features: Array.from(new Set(items.filter((item: AnyRecord) => item.type !== "organic").map((item: AnyRecord) => String(item.type || "").trim()))).filter(Boolean).sort(),
  });
  const nameKey = (s: string): string => String(s).trim().toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const byInputKey = new Map<string, number>();
  keywords.forEach((kw, i) => byInputKey.set(nameKey(kw), i));
  const byIndex = new Map<number, AnyRecord>();
  const usedTasks = new Set<number>();
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
    if (usedTasks.has(i)) continue;
    const task = tasks[i];
    const items = task.result?.[0]?.items || [];
    while (cursor < keywords.length && byIndex.has(cursor)) cursor += 1;
    if (cursor >= keywords.length) break;
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

const SERP_ENDPOINTS: DataforseoEndpoints = {
  liveEndpoint: "/v3/serp/google/organic/live/advanced",
  taskPostEndpoint: "/v3/serp/google/organic/task_post",
  taskGetEndpoint: "/v3/serp/google/organic/task_get/advanced/{id}",
};

export async function serpForKeywords(keywords: string[], args: AnyRecord): Promise<{ source: AnyRecord; normalized: AnyRecord[] }> {
  if (!keywords.length) throw new CliError("serpForKeywords requires at least one keyword.");
  const location = args.location || "Brazil";
  const language = args.language || "pt";
  const device = args.device || "desktop";
  const depth = Number(args.depth || 10);
  const payload = keywords.map((keyword) => ({ keyword, location_name: location, language_code: language, device, depth }));
  const requested = resolveDataforseoMode(args);
  let source: AnyRecord;
  if (requested === "live") {
    const responses = await Promise.all(payload.map((p) => dataforseoRequest("POST", SERP_ENDPOINTS.liveEndpoint, [p], Boolean(args.sandbox))));
    source = { mode: "live", tasks: responses.flatMap((r) => r.tasks || []) };
  } else {
    source = await runDataforseoCall(SERP_ENDPOINTS, payload, args);
  }
  const normalized = normalizeSerpBatch(source, keywords, location, language, device);
  return { source, normalized };
}

export function normalizeKeywords(source: AnyRecord, keywords: string[], location: string, language: string): AnyRecord {
  if (!Array.isArray(keywords) || keywords.length === 0) throw new Error("normalizeKeywords requires a non-empty keywords array.");
  let tasks = source.tasks || [];
  if (source.task_get_responses) tasks = source.task_get_responses.flatMap((r: AnyRecord) => r.tasks || []);
  let items: AnyRecord[] = [];
  if (tasks.length) {
    for (const result of tasks[0].result || []) {
      items.push({ keyword: result.keyword || "", search_volume: result.search_volume ?? null, competition: result.competition ?? null, cpc: result.cpc ?? null, monthly_searches: result.monthly_searches ?? null });
    }
  } else {
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

export function normalizeSuggestions(source: AnyRecord, seed: string, location: string, language: string): AnyRecord {
  let tasks = source.tasks || [];
  if (source.task_get_responses) tasks = source.task_get_responses.flatMap((r: AnyRecord) => r.tasks || []);
  const seen = new Set<string>();
  const items: AnyRecord[] = [];
  const pushItem = (raw: AnyRecord): void => {
    if (!raw || typeof raw !== "object") return;
    const keyword = String(raw.keyword || "").trim();
    if (!keyword) return;
    const key = keyword.toLowerCase();
    if (seen.has(key)) return;
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
      if (result.seed_keyword_data) pushItem(result.seed_keyword_data);
      if (Array.isArray(result.items)) for (const item of result.items) pushItem(item);
      else if (!result.items && !result.seed_keyword_data) pushItem(result);
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

export function collectKeywords(args: AnyRecord): string[] {
  const list: string[] = [];
  if (args.keyword) list.push(String(args.keyword));
  if (args.keywords_file) {
    const file = String(args.keywords_file);
    if (!fs.existsSync(file)) throw new CliError(`keywords-file not found: ${file}`);
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (trimmed && !trimmed.startsWith("#")) list.push(trimmed);
    }
  }
  if (Array.isArray(args._)) for (const item of args._) if (typeof item === "string" && item.trim()) list.push(item.trim());
  if (!list.length) throw new CliError('Missing keywords. Provide --keyword "X", --keywords-file <path>, or positional keywords.');
  return Array.from(new Set(list));
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

function latestFileAny(directory: string, suffixes: string[]): string | null {
  if (!fs.existsSync(directory)) return null;
  const files = fs
    .readdirSync(directory)
    .filter((name) => suffixes.some((suffix) => name.endsWith(suffix)))
    .map((name) => path.join(directory, name))
    .filter((file) => fs.statSync(file).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] || null;
}

function loadDataforseoSerpResults(projectDir: string, keyword: string, override?: string): AnyRecord[] {
  const file = dataforseoSerpFile(projectDir, keyword, override);
  if (!file || !fs.existsSync(file)) return [];
  return readDataFile(file).organic_results || [];
}

function dataforseoSerpFile(projectDir: string, keyword: string, override?: string): string | null {
  return override || latestFileAny(path.join(projectDir, "sources", "serp"), [`-${slugify(keyword)}.normalized.yaml`, `-${slugify(keyword)}.normalized.json`]);
}

function websearchSourceFile(projectDir: string, keyword: string, override?: string): string | null {
  return override || dataFile(projectDir, path.join("sources", "websearch", slugify(keyword)));
}

function loadWebsearchResults(projectDir: string, keyword: string, override?: string): AnyRecord[] {
  const file = websearchSourceFile(projectDir, keyword, override);
  if (!file || !fs.existsSync(file)) return [];
  const data = readDataFile(file);
  return data.results || data.organic_results || [];
}

function loadKeywordMetrics(projectDir: string, keyword: string): AnyRecord | null {
  const file = latestFileAny(path.join(projectDir, "workbench", "keyword-research"), [`-${slugify(keyword)}.yaml`, `-${slugify(keyword)}.json`]);
  if (!file) return null;
  const primary = (readDataFile(file).keywords || [])[0];
  if (!primary || (primary.search_volume == null && primary.competition == null)) return null;
  return { search_volume: primary.search_volume, competition: primary.competition, cpc: primary.cpc, source_path: path.relative(projectDir, file) };
}

function projectSettings(projectDir: string): AnyRecord {
  const config = path.join(projectDir, ".seo-brain", "project.json");
  const brainIndex = path.join(projectDir, "brain", "index.md");
  let data: AnyRecord = {};
  if (fs.existsSync(config)) {
    try {
      data = readJson(config);
    } catch {
      data = {};
    }
  }
  if (fs.existsSync(brainIndex)) {
    try {
      const [fm] = parseFrontmatter(fs.readFileSync(brainIndex, "utf8"));
      data = { ...data, ...fm };
    } catch {
      // Keep project.json/defaults when the brain index is not parseable.
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
  for (const dir of ["brain", "conteudos", "web", "sources", "workbench", "artifacts", ".seo-brain"]) mkdirp(path.join(p, dir));
  for (const origem of PUBLIC_CONTENT_ORIGENS) mkdirp(path.join(p, "conteudos", origem));
  copyDir(path.join(TEMPLATES_DIR, "brain"), path.join(p, "brain"));
  copyDir(path.join(TEMPLATES_DIR, "conteudos"), path.join(p, "conteudos"));
  writeJson(path.join(p, ".seo-brain", "project.json"), { schema_version: "2.0.0", name, created_at: nowIso(), language, market, country, single_project_root: "project" });
  const brainIndex = path.join(p, "brain", "index.md");
  if (fs.existsSync(brainIndex)) {
    setFrontmatterValue(brainIndex, { title: JSON.stringify(name), updated: JSON.stringify(today()) });
  }
  appendLog("init", "Projeto criado", ["index"], `Projeto ${name} inicializado em ${country}/${language}.`, "agent");
  printJson({ ok: true, project_dir: p });
}

async function commandBrainLint(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  const brain = path.join(p, "brain");
  const findings: AnyRecord[] = [];
  for (const rel of REQUIRED_BRAIN_PAGES) {
    const file = path.join(brain, rel);
    if (!fs.existsSync(file)) {
      findings.push({ severity: "error", file: rel, message: "required brain page missing" });
      continue;
    }
    const [fm, body] = parseFrontmatter(fs.readFileSync(file, "utf8"));
    if (!fm.title) findings.push({ severity: "warning", file: rel, message: "missing title frontmatter" });
    if (!fm.updated) findings.push({ severity: "warning", file: rel, message: "missing updated frontmatter" });
    for (const forbidden of ["status", "judgment_level", "pillar", "owner", "approved_by", "approved_at"]) {
      if (forbidden in fm) findings.push({ severity: "warning", file: rel, message: `obsolete frontmatter field: ${forbidden}` });
    }
    for (const match of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const target = match[1].split("|", 1)[0].split("#", 1)[0].trim();
      if (!target) continue;
      const candidate = path.join(brain, target.endsWith(".md") ? target : `${target}.md`);
      if (!fs.existsSync(candidate)) findings.push({ severity: "warning", file: rel, message: `broken wikilink: [[${match[1]}]]` });
    }
  }
  findings.push(...lintContentPublication(p));
  const result = { ok: !findings.some((f) => f.severity === "error"), findings };
  writeJson(path.join(p, "workbench", "brain-lint.json"), result);
  appendLog("lint", "Brain lint", ["workbench/brain-lint.json"], `${findings.length} apontamentos encontrados.`, "agent");
  printJson(result);
}

function lintContentPublication(projectDir: string): AnyRecord[] {
  const findings: AnyRecord[] = [];
  const conteudosRoot = path.join(projectDir, "conteudos");
  if (!fs.existsSync(conteudosRoot)) return findings;
  for (const origem of fs.readdirSync(conteudosRoot)) {
    const origemDir = path.join(conteudosRoot, origem);
    if (!fs.statSync(origemDir).isDirectory()) continue;
    for (const name of fs.readdirSync(origemDir)) {
      if (!name.endsWith(".md") || name.startsWith("_")) continue;
      const brief = contentBriefFile(projectDir, path.basename(name, ".md"));
      if (!brief) continue;
      let data: AnyRecord;
      try {
        data = readContentBrief(brief);
      } catch {
        findings.push({ severity: "warning", file: `conteudos/${origem}/${name}`, message: `brief is not valid YAML/JSON: ${path.relative(projectDir, brief)}` });
        continue;
      }
      const text = fs.readFileSync(path.join(origemDir, name), "utf8");
      const issues = validatePublicContentDraft(text, data);
      for (const issue of issues) findings.push({ severity: "error", file: `conteudos/${origem}/${name}`, message: issue });
    }
  }
  return findings;
}

function frontmatterListValue(fm: AnyRecord, key: string): string[] {
  const value = fm[key];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function markdownLinks(body: string): Array<{ anchor: string; href: string; sentence: string }> {
  const out: Array<{ anchor: string; href: string; sentence: string }> = [];
  for (const match of body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const idx = match.index || 0;
    const start = Math.max(body.lastIndexOf(".", idx), body.lastIndexOf("\n", idx));
    const endDot = body.indexOf(".", idx);
    const endBreak = body.indexOf("\n", idx);
    const ends = [endDot, endBreak].filter((n) => n > idx);
    const end = ends.length ? Math.min(...ends) : body.length;
    out.push({ anchor: match[1].trim(), href: match[2].trim(), sentence: body.slice(start + 1, end).trim() });
  }
  return out;
}

function searchNormalized(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function normalizedPublicUrl(value: string): string | null {
  const raw = value.trim().replace(/^["']|["']$/g, "");
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/#.*$/, "").replace(/\/$/, "");
  }
}

function publicSourceUrls(fm: AnyRecord, brief: AnyRecord): Set<string> {
  const urls = new Set<string>();
  for (const source of frontmatterListValue(fm, "sources")) {
    const normalized = normalizedPublicUrl(source);
    if (normalized) urls.add(normalized);
  }
  for (const citation of Array.isArray(brief.public_citations) ? brief.public_citations : []) {
    const normalized = normalizedPublicUrl(String(citation?.url || citation));
    if (normalized) urls.add(normalized);
  }
  return urls;
}

function unorderedBulletCount(body: string): number {
  return (body.match(/^\s{0,3}[-*+]\s+\S/gm) || []).length;
}

function frontmatterBoolean(fm: AnyRecord, key: string): boolean {
  return cleanFrontmatterValue(fm[key]) === "true";
}

function isMarkdownHeading(line: string): RegExpMatchArray | null {
  return line.match(/^\s{0,3}(#{1,6})\s+\S/);
}

function isParagraphLine(line: string): boolean {
  const trimmed = line.trim();
  return Boolean(trimmed)
    && !isMarkdownHeading(trimmed)
    && !/^\s{0,3}[-*+]\s+\S/.test(line)
    && !/^\s{0,3}\d+[.)]\s+\S/.test(line)
    && !/^\s{0,3}>/.test(line)
    && !/^\s{0,3}\|/.test(line)
    && !/^\s{0,3}<\/?[a-z][^>]*>\s*$/i.test(line);
}

function headingSpacingIssues(body: string): string[] {
  const issues: string[] = [];
  let previousNonEmpty = "";
  for (const line of body.split(/\r?\n/)) {
    const heading = isMarkdownHeading(line);
    if (heading && heading[1].length > 1 && !isParagraphLine(previousNonEmpty)) {
      issues.push(`heading missing preceding paragraph: ${line.trim()}`);
    }
    if (line.trim()) previousNonEmpty = line;
  }
  return issues;
}

function validatePublicContentDraft(text: string, brief: AnyRecord): string[] {
  const issues: string[] = [];
  const [fm, body] = parseFrontmatter(text);
  const cleanBody = body.replace(/```[\s\S]*?```/g, "");
  const lower = cleanBody.toLowerCase();
  const searchableBody = searchNormalized(cleanBody);
  const bulletCount = unorderedBulletCount(cleanBody);
  const bulletException = frontmatterBoolean(fm, "bullet_exception") && Boolean(cleanFrontmatterValue(fm.bullet_exception_reason));
  if (bulletCount > 3 && !bulletException) issues.push(`too many unordered bullet items in public body: ${bulletCount}/3`);
  if (searchableBody.includes("fontes publicas consultadas")) issues.push("consulted source section in public body: Fontes públicas consultadas");
  issues.push(...headingSpacingIssues(cleanBody));
  const topicalText = [brief.topic, brief.keyword, brief.brief?.promise].map((v) => String(v || "").toLowerCase()).join(" ");
  const allowAgentTerm = /\bag[eê]nt/i.test(topicalText);
  const forbidden = [
    ...(brief.forbidden_prose_terms || []),
    ...(brief.serp_competitor_domains || []),
    ...(brief.must_not_mention_in_prose || []),
  ].map((d: string) => String(d).trim().toLowerCase()).filter(Boolean);
  for (const term of Array.from(new Set(forbidden))) {
    if (lower.includes(term)) issues.push(`forbidden term mentioned in public prose: ${term}`);
  }
  const internalPatterns = [
    /\bworkbench\b/i,
    /\bbriefing\b/i,
    /\bbrain\b/i,
    /\blog\b/i,
    ...(allowAgentTerm ? [] : [/\bagente?s?\b/i]),
    /project\/(?:workbench|brain|sources|artifacts|conteudos)\//i,
    /\.\.\/(?:\.\.\/)?sources\//i,
    /\.brief\.(?:ya?ml|json)\b/i,
  ];
  for (const pattern of internalPatterns) {
    if (pattern.test(cleanBody)) issues.push(`internal process language or path leaked: ${pattern.source}`);
  }
  const links = markdownLinks(cleanBody);
  const genericAnchors = new Set(["aqui", "clique aqui", "saiba mais", "link", "neste link", "leia mais"]);
  const consultedSourceUrls = publicSourceUrls(fm, brief);
  for (const link of links) {
    const anchor = link.anchor.toLowerCase();
    if (genericAnchors.has(anchor)) issues.push(`generic Markdown anchor: ${link.anchor}`);
    if (/^(?:\.{1,2}\/|\/Users\/|project\/|workbench\/|brain\/|sources\/)/i.test(link.href)) issues.push(`non-public link target in public body: ${link.href}`);
    const normalizedHref = normalizedPublicUrl(link.href);
    if (normalizedHref && consultedSourceUrls.has(normalizedHref)) issues.push(`consulted public source link in public body: ${link.href}`);
    const withoutLink = link.sentence.replace(`[${link.anchor}](${link.href})`, link.anchor).trim();
    if (withoutLink.length < 20 || !/\s/.test(withoutLink)) issues.push(`linked sentence fails link-removed test: ${link.anchor}`);
  }
  if (cleanFrontmatterValue(fm.public_content) !== "true") issues.push("missing public_content: true frontmatter");
  if (!cleanFrontmatterValue(fm.primary_keyword)) issues.push("missing primary_keyword frontmatter");
  if (!frontmatterListValue(fm, "sources").length) issues.push("empty sources frontmatter");
  return Array.from(new Set(issues));
}

async function commandBrainApprove(args: AnyRecord): Promise<void> {
  const rel = required(args, "page").replace(/^\/+/, "");
  const by = required(args, "by");
  if (!by.trim() || by.trim() === "agent" || by.trim() === "pendente") {
    throw new CliError("--by must be a human approver name (not 'agent' or 'pendente').");
  }
  if (!AUTHORIAL_BRAIN_PAGES.has(rel)) {
    throw new CliError(`brain-approve only accepts authorial brain pages (${[...AUTHORIAL_BRAIN_PAGES].join(", ")}). Got: ${rel}`);
  }
  const file = path.join(ensureProject(), "brain", rel);
  if (!fs.existsSync(file)) throw new CliError(`Brain page not found: ${file}`);
  setFrontmatterValue(file, { updated: JSON.stringify(today()) });
  appendLog("aprovacao", `Aprovação ${rel}`, [rel.replace(/\.md$/, "")], `Página ${rel} aprovada por ${by}.`, by);
  printJson({ ok: true, approved: rel, by });
}

async function commandBrainIngest(args: AnyRecord): Promise<void> {
  const source = required(args, "source");
  if (!fs.existsSync(source)) throw new CliError(`Source not found: ${source}`);
  const p = ensureProject();
  const target = path.join(p, "sources", "manual", `${today()}-${slugify(path.basename(source, path.extname(source)))}${path.extname(source)}`);
  mkdirp(path.dirname(target));
  fs.copyFileSync(source, target);
  appendLog("ingest", `Ingestão de fonte: ${path.basename(source)}`, [path.relative(p, target)], "Fonte manual adicionada ao projeto.", "agent");
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
  const decision = seoProviderDefaultStatus();
  const credentialStatus = dataforseoCredentialStatus();
  const status: AnyRecord = {
    dataforseo_login: credentialStatus.dataforseo_login,
    dataforseo_password: credentialStatus.dataforseo_password,
    default_mode: mode,
    dataforseo_configured: credentialStatus.dataforseo_configured,
    home_credentials_present: credentialStatus.home_credentials_present,
    websearch_available: true,
    websearch_requires_dataforseo_bypass: true,
    provider_default: decision.provider,
    provider_default_reason: decision.reason,
    modes: {
      live: "ultrarrápido: usa endpoints /live; retorna em segundos e costuma custar mais.",
      standard: "médio: usa task_post + polling task_get; padrão do SEO Brain.",
      async: "assíncrono: usa task_post com pingback_url/postback_url quando informado.",
      offline: "teste local: não chama a DataForSEO.",
    },
    credentials_present: Boolean(login && password),
    checked_live: Boolean(args.check),
    setup_handoff_available: true,
    setup_handoff_action: {
      type: "browser-handoff",
      handoff: "collect-env",
      user_instruction: "Abra a configuração local de credenciais pelo agente e preencha os dados na página segura.",
    },
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
  if (mode !== "offline" && !dataforseoCredentialsPresent()) {
    if (shouldAutoOpenDataSetup(args)) {
      const handoff = runDataSetupHandoff();
      if (!handoff.ok) throw new CliError(`DataForSEO web setup failed: ${handoff.reason}`);
    }
    if (!dataforseoCredentialsPresent()) throw new CliError("DataForSEO credentials missing. Run: bin/seo-brain data-setup --handoff");
  }
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
  writeYaml(`${base}.normalized.yaml`, normalized);
  writeYaml(path.join(p, "workbench", "serp", `${stamp()}-${slugify(keyword)}.yaml`), normalized);
  appendLog("serp", keyword, [path.relative(p, `${base}.normalized.yaml`)], "SERP extraída e normalizada.", "not-required");
  printJson(normalized);
}

const VOLUME_ENDPOINTS: DataforseoEndpoints = {
  liveEndpoint: "/v3/keywords_data/google_ads/search_volume/live",
  taskPostEndpoint: "/v3/keywords_data/google_ads/search_volume/task_post",
  taskGetEndpoint: "/v3/keywords_data/google_ads/search_volume/task_get/{id}",
};

const SUGGESTIONS_ENDPOINTS: DataforseoEndpoints = {
  liveEndpoint: "/v3/dataforseo_labs/google/keyword_suggestions/live",
  taskPostEndpoint: null,
  taskGetEndpoint: null,
};

const KEYWORD_IDEAS_ENDPOINTS: DataforseoEndpoints = {
  liveEndpoint: "/v3/dataforseo_labs/google/keyword_ideas/live",
  taskPostEndpoint: null,
  taskGetEndpoint: null,
};

async function commandKeywordResearch(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  if (args.suggestions) return runKeywordSuggestions(args, p);
  return runKeywordVolume(args, p);
}

async function runKeywordVolume(args: AnyRecord, projectDir: string): Promise<void> {
  const settings = projectSettings(projectDir);
  const keywords = collectKeywords(args);
  const isBulk = keywords.length > 1;
  const location = args.location || settings.dataforseo_location;
  const language = args.language || settings.dataforseo_language;
  const payload = [{ keywords, location_name: location, language_code: language }];
  const source = await runDataforseoCall(VOLUME_ENDPOINTS, payload, args);
  const normalized = normalizeKeywords(source, keywords, location, language);
  const slug = isBulk ? `bulk-${keywords.length}` : slugify(keywords[0]);
  const ts = stamp();
  const base = path.join(projectDir, "sources", "keyword-research", `${ts}-${slug}`);
  writeJson(`${base}.raw.json`, source);
  writeYaml(`${base}.normalized.yaml`, normalized);
  writeYaml(path.join(projectDir, "workbench", "keyword-research", `${ts}-${slug}.yaml`), normalized);
  const logTitle = isBulk ? `bulk (${keywords.length} keywords)` : keywords[0];
  appendLog("keyword-research", logTitle, [path.relative(projectDir, `${base}.normalized.yaml`)], "Pesquisa de keyword registrada.", "not-required");
  printJson(normalized);
}

async function runKeywordSuggestions(args: AnyRecord, projectDir: string): Promise<void> {
  const seed = required(args, "keyword");
  const limit = Math.max(1, Math.min(1000, Number(args.limit || 100)));
  const settings = projectSettings(projectDir);
  const location = args.location || settings.dataforseo_location;
  const language = args.language || settings.dataforseo_language;
  const payload = [{ keyword: seed, location_name: location, language_code: language, limit, include_seed_keyword: true }];
  const source = await runDataforseoCall(SUGGESTIONS_ENDPOINTS, payload, args);
  const normalized = normalizeSuggestions(source, seed, location, language);
  const slug = slugify(seed);
  const ts = stamp();
  const base = path.join(projectDir, "sources", "keyword-research", `${ts}-${slug}.suggestions`);
  writeJson(`${base}.raw.json`, source);
  writeJson(`${base}.normalized.json`, normalized);
  writeJson(path.join(projectDir, "workbench", "keyword-research", `${ts}-${slug}.suggestions.json`), normalized);
  appendLog("keyword-suggestions", seed, [path.relative(projectDir, `${base}.normalized.json`)], `Sugestões de keyword registradas (${normalized.keywords.length} itens).`, "not-required");
  printJson(normalized);
}

async function commandKwVolume(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  const settings = projectSettings(p);
  const keywords = collectKeywords(args);
  const location = args.location || settings.dataforseo_location;
  const language = args.language || settings.dataforseo_language;
  const payload = [{ keywords, location_name: location, language_code: language }];
  const source = await runDataforseoCall(VOLUME_ENDPOINTS, payload, args);
  const normalized = normalizeKeywords(source, keywords, location, language);
  const lean = {
    provider: normalized.provider,
    mode: normalized.mode,
    timestamp: normalized.timestamp,
    location: normalized.location,
    language: normalized.language,
    items: (normalized.keywords || []).map((k: AnyRecord) => ({ keyword: k.keyword, volume: k.search_volume ?? null, cpc: k.cpc ?? null, competition: k.competition ?? null })),
    note: normalized.note,
  };
  printJson(lean);
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
      if (!dataforseoCredentialsPresent()) throw new CliError("DataForSEO credentials missing. Use the local credential setup handoff before running live backlink analysis.");
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
  writeYaml(path.join(p, "workbench", "backlinks", `${stamp()}-${slugify(target)}.yaml`), normalized);
  appendLog("backlinks", target, [path.relative(p, `${base}.raw.json`)], "Análise de backlinks registrada.", "not-required");
  printJson(normalized);
}

async function commandSeoAnalysis(args: AnyRecord): Promise<void> {
  const keyword = required(args, "keyword");
  const p = ensureProject();
  const settings = projectSettings(p);
  const decision = resolveSeoProvider(args);
  const serpSourceFile = decision.provider === "dataforseo" ? dataforseoSerpFile(p, keyword, args.serp_file) : websearchSourceFile(p, keyword, args.websearch_file);
  const organic = decision.provider === "dataforseo" ? loadDataforseoSerpResults(p, keyword, args.serp_file) : loadWebsearchResults(p, keyword, args.websearch_file);
  if (decision.provider === "dataforseo" && !organic.length) throw new CliError(`Missing DataForSEO SERP for "${keyword}". Run: bin/seo-brain serp-extract --keyword "${keyword}"`);
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
  if (decision.provider === "websearch" && !topResults.length) limitations.push(`Nenhum resultado em sources/websearch/${slugify(keyword)}.yaml. Rode WebSearch e grave o YAML antes de reexecutar.`);
  if (decision.provider === "websearch") limitations.push(`WebSearch usado como bypass explícito: ${String(args.websearch_reason || "").trim()}`);
  if (decision.provider === "dataforseo" && keywordMetrics === null) limitations.push("Sem keyword-research recente para enriquecer keyword_metrics.");
  let report: AnyRecord = {
    keyword,
    provider: decision.provider,
    provider_reason: decision.reason,
    data_provenance: {
      serp_extract: serpSourceFile ? { path: path.relative(p, serpSourceFile), provider: decision.provider } : null,
      provider_bypass: decision.bypass || null,
    },
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
    gaps: ["Mapear entidades e subtópicos pouco cobertos pelo top 3.", "Confirmar formato dominante: artigo, listicle, guia passo a passo.", "Identificar perguntas reais do leitor não respondidas pelos competidores."],
    improvement_hypotheses: ["Cobertura mais densa de exemplos brasileiros do que os concorrentes.", "EEAT explícito com autoria e proveniência declarada, ausente em parte do top 3.", "Estrutura de heading que responda à intenção observada antes de aprofundar."],
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
      readJson: readDataFile,
      writeJson,
      writeYaml,
      writeText,
      fetchUrl,
      extractHtml,
      auditTechnicalSeo,
      renderTechnicalMarkdown,
      slugify,
      stamp,
    });
  }
  const out = path.join(p, "workbench", "seo-analysis", `${slugify(keyword)}.yaml`);
  writeYaml(out, report);
  appendDataforseoBypassLog(keyword, decision.bypass, [path.relative(p, out)]);
  appendLog("seo-analysis", keyword, [path.relative(p, out), ...(report.technical_seo_reports || [])], `Análise SEO via ${decision.provider} (${topResults.length} resultados${args.player_score ? "; player score ativo" : ""}).`, "not-required");
  printJson(report);
}

function loadExistingCluster(projectDir: string, seedSlug: string): AnyRecord | null {
  const file = path.join(projectDir, "workbench", "topic-cluster", `${seedSlug}.json`);
  if (!fs.existsSync(file)) return null;
  try { return readJson(file); } catch { return null; }
}

export function buildClusterPage(role: "pillar" | "support", item: { keyword: string; volume: number | null }, serp: AnyRecord | undefined): AnyRecord {
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

function pageSlug(page: AnyRecord): string {
  if (page.slug) return String(page.slug);
  if (page.keyword_principal?.keyword) return slugify(String(page.keyword_principal.keyword));
  if (page.title) return slugify(String(page.title));
  return "";
}

export function mergeClusterPage(existing: AnyRecord | undefined, fresh: AnyRecord): AnyRecord {
  if (!existing) return fresh;
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

export function mergeClusterPages(existingPages: AnyRecord[], freshPages: AnyRecord[]): AnyRecord[] {
  const bySlug = new Map<string, AnyRecord>();
  for (const ep of existingPages) {
    const slug = pageSlug(ep);
    if (slug) bySlug.set(slug, ep);
  }
  const merged: AnyRecord[] = [];
  const seen = new Set<string>();
  for (const fresh of freshPages) {
    const slug = pageSlug(fresh);
    merged.push(mergeClusterPage(bySlug.get(slug), fresh));
    seen.add(slug);
  }
  for (const ep of existingPages) {
    const slug = pageSlug(ep);
    if (!slug || seen.has(slug)) continue;
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

async function commandTopicCluster(args: AnyRecord): Promise<void> {
  const seed = required(args, "seed");
  const p = ensureProject();
  const seedSlug = slugify(seed);
  const clusterFile = path.join(p, "workbench", "topic-cluster", `${seedSlug}.json`);
  const existingCluster = loadExistingCluster(p, seedSlug);

  if (args.render_only) {
    if (!existingCluster) throw new CliError(`No cluster JSON found for seed "${seed}". Run topic-cluster first.`);
    renderTopicClustersBrain(p);
    appendLog("topic-cluster", seed, ["conteudos/topic-clusters"], "Wiki rerenderizada a partir dos JSONs.", "not-required");
    printJson({ ok: true, rendered: true, file: clusterFile });
    return;
  }

  const settings = projectSettings(p);
  const requestedHypothesisOnly = Boolean(args.hypothesis_only);
  const credsMissing = !dataforseoCredentialsPresent();
  let dataforseoBypass: AnyRecord | null = null;
  if (requestedHypothesisOnly || credsMissing) {
    dataforseoBypass = requireDataforseoBypassApproval(args, {
      workflow: "topic-cluster",
      step: "dataforseo-keyword-and-serp-evidence",
      subject: seed,
      reason: args.dataforseo_bypass_reason,
      consequence: "Cluster will be hypothesis-only with null keyword volumes and no DataForSEO SERP intent evidence.",
      provider_used: "hypothesis-only",
      confirmed: args.dataforseo_bypass_confirmed,
    });
  }
  const hypothesisOnly = requestedHypothesisOnly || credsMissing;
  const maxSupports = Math.max(1, Math.min(20, Number(args.max_supports || 7)));
  const language = args.language || settings.language || "pt-BR";
  const location = args.location || settings.dataforseo_location || "Brazil";
  const langCode = settings.dataforseo_language || String(language).split("-")[0] || "pt";

  let suggestions: AnyRecord = { keywords: [], provider: null };
  let ideas: AnyRecord = { keywords: [], provider: null };
  let serpProvider: string | null = null;
  const serpByKeyword = new Map<string, AnyRecord>();

  if (!hypothesisOnly) {
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

  const seen = new Set<string>();
  const pool: AnyRecord[] = [];
  for (const item of [...(suggestions.keywords || []), ...(ideas.keywords || [])]) {
    const keyword = String(item.keyword || "").trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({ keyword, volume: item.search_volume ?? null, cpc: item.cpc ?? null, competition: item.competition ?? null });
  }
  const seedLower = seed.trim().toLowerCase();
  const seedInPool = pool.find((k: AnyRecord) => k.keyword.toLowerCase() === seedLower);
  const pillarKeyword = seedInPool || { keyword: seed, volume: null, cpc: null, competition: null };
  const supportPool = pool.filter((k: AnyRecord) => k.keyword.toLowerCase() !== pillarKeyword.keyword.toLowerCase());
  supportPool.sort((a: AnyRecord, b: AnyRecord) => (b.volume ?? 0) - (a.volume ?? 0));
  const topSupports = supportPool.slice(0, maxSupports);

  if (!hypothesisOnly) {
    const allKeywords = [pillarKeyword.keyword, ...topSupports.map((s: AnyRecord) => s.keyword)];
    if (allKeywords.length) {
      const { source, normalized } = await serpForKeywords(allKeywords, args);
      const baseSerp = path.join(p, "sources", "serp", `${stamp()}-cluster-${seedSlug}`);
      writeJson(`${baseSerp}.raw.json`, source);
      writeJson(`${baseSerp}.normalized.json`, normalized);
      for (const entry of normalized) serpByKeyword.set(entry.keyword, entry);
      serpProvider = "dataforseo";
    }
  }

  const freshPillar = buildClusterPage("pillar", { keyword: pillarKeyword.keyword, volume: pillarKeyword.volume ?? null }, serpByKeyword.get(pillarKeyword.keyword));
  const freshSupports = topSupports.map((item: AnyRecord) => buildClusterPage("support", { keyword: item.keyword, volume: item.volume ?? null }, serpByKeyword.get(item.keyword)));
  const existingSupports = Array.isArray(existingCluster?.supporting_pages) ? existingCluster!.supporting_pages : [];
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
      hypothesis_reason: hypothesisOnly ? (requestedHypothesisOnly ? "requested" : "dataforseo-credentials-missing") : null,
      provider_bypass: dataforseoBypass,
    },
    pillar: mergedPillar,
    supporting_pages: mergedSupports,
    keyword_pool: pool,
    completeness_gaps: existingCluster?.completeness_gaps ?? [],
    open_questions: existingCluster?.open_questions ?? [],
    approval: existingCluster?.approval ?? { aprovador: null, aprovado_em: null, status: "draft" },
  };

  writeJson(clusterFile, cluster);
  renderTopicClustersBrain(p);
  appendDataforseoBypassLog(seed, dataforseoBypass, [path.relative(p, clusterFile), "topic-clusters"]);
  appendLog("topic-cluster", seed, ["topic-clusters"], `Cluster ${status} com ${mergedSupports.length} suportes (pool: ${pool.length}, SERP: ${serpByKeyword.size}).`, "pendente");
  printJson(cluster);
}

export function renderTopicClustersBrain(projectDir: string): void {
  const dir = path.join(projectDir, "workbench", "topic-cluster");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  const clusters: AnyRecord[] = [];
  for (const f of files) {
    try { clusters.push(readJson(path.join(dir, f))); } catch { /* skip malformed JSON */ }
  }
  writeText(path.join(projectDir, "brain", "topic-clusters.md"), renderTopicClustersMarkdown(clusters));
}

export function renderTopicClustersMarkdown(clusters: AnyRecord[]): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push('title: "Topic clusters"');
  lines.push(`updated: "${today()}"`);
  lines.push("auto_generated: true");
  lines.push("---");
  lines.push("");
  lines.push("# Topic clusters");
  lines.push("");
  lines.push("Auto-gerado a partir de `workbench/topic-cluster/*.json`. Os campos de julgamento (title, entity, keywords_secondary, funnel_stage, serp_intent, judgment) são editados nos JSONs; rode `bin/seo-brain topic-cluster --seed <seed> --render-only` para regenerar esta página.");
  lines.push("");
  if (!clusters.length) {
    lines.push("Nenhum cluster registrado.");
    lines.push("");
    return lines.join("\n");
  }
  lines.push("## Visão geral");
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

function renderClusterSection(c: AnyRecord): string[] {
  const lines: string[] = [];
  lines.push(`## Cluster: ${c.seed || "(sem seed)"}`);
  lines.push("");
  const dp = c.data_provenance || {};
  const provBits: string[] = [];
  if (dp.suggestions) provBits.push(`suggestions: ${dp.suggestions.provider || "—"} (${dp.suggestions.count || 0} itens)`);
  if (dp.serp) provBits.push(`SERP: ${dp.serp.provider || "—"} (${dp.serp.keyword_count || 0} keywords)`);
  if (dp.hypothesis_only) provBits.push("modo: hypothesis-only");
  lines.push(`- Status: ${c.status || "—"}`);
  lines.push(`- Idioma/Localidade: ${c.language || "—"} / ${c.location || "—"}`);
  lines.push(`- Gerado em: ${c.generated_at || "—"}`);
  if (provBits.length) lines.push(`- Provenance: ${provBits.join(" · ")}`);
  if (c.business_goal?.primary) lines.push(`- Objetivo de negócio: ${c.business_goal.primary}`);
  lines.push("");
  lines.push("| Papel | Entidade | KW principal | Volume | KW Secundárias | Funil | Intenção de Busca |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  if (c.pillar) lines.push(renderPageRow({ ...c.pillar, role: "pillar" }));
  for (const s of c.supporting_pages || []) lines.push(renderPageRow({ ...s, role: s.role === "pillar" ? "pillar" : "support" }));
  if (Array.isArray(c.completeness_gaps) && c.completeness_gaps.length) {
    lines.push("");
    lines.push("### Lacunas de completude");
    lines.push("");
    for (const g of c.completeness_gaps) lines.push(`- ${g}`);
  }
  if (Array.isArray(c.open_questions) && c.open_questions.length) {
    lines.push("");
    lines.push("### Questões abertas");
    lines.push("");
    for (const q of c.open_questions) lines.push(`- ${q}`);
  }
  return lines;
}

function renderPageRow(page: AnyRecord): string {
  const role = page.role === "pillar" ? "Pillar" : "Suporte";
  const entity = page.entity ?? "—";
  const kp = page.keyword_principal || {};
  const kpKw = kp.keyword ?? "—";
  const kpVol = kp.volume == null ? "—" : String(kp.volume);
  const secondary = Array.isArray(page.keywords_secondary) && page.keywords_secondary.length
    ? page.keywords_secondary.map((s: AnyRecord) => `${s.keyword || "?"} (${s.volume == null ? "—" : s.volume})`).join(", ")
    : "—";
  const funnel = page.funnel_stage ?? "—";
  const intent = page.serp_intent ?? "—";
  return `| ${role} | ${escapeCell(String(entity))} | ${escapeCell(String(kpKw))} | ${kpVol} | ${escapeCell(secondary)} | ${escapeCell(String(funnel))} | ${escapeCell(String(intent))} |`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function commandEeat(_args: AnyRecord): Promise<void> {
  const message = "The eeat command is now driven by the /seo-brain:eeat skill, which dispatches 3 parallel rater sub-agents against a fixed E-E-A-T checklist and writes a consensus report. See skills/eeat/SKILL.md for the contract.";
  printJson({ ok: false, error: message });
  throw new CliError(message);
}

function yamlString(value: unknown): string {
  return JSON.stringify(String(value ?? ""));
}

function asStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
  return [String(value)];
}

function intentSummary(intent: unknown): string {
  if (!intent) return "informational";
  if (typeof intent === "string") return intent;
  if (typeof intent === "object") {
    const data = intent as AnyRecord;
    return String(data.description || data.primary || "informational");
  }
  return String(intent);
}

function topResultDomains(analysisData: AnyRecord | null): string[] {
  return Array.from(new Set<string>((analysisData?.top_results || [])
    .map((entry: AnyRecord) => String(entry.domain || "").trim().toLowerCase())
    .filter(Boolean))).sort();
}

function contentPublicCitations(analysisData: AnyRecord | null): AnyRecord[] {
  const citations = analysisData?.public_citations || analysisData?.canonical_sources || [];
  if (!Array.isArray(citations)) return [];
  return citations
    .map((entry: AnyRecord) => ({
      title: String(entry.title || entry.label || "").trim(),
      url: String(entry.url || "").trim(),
    }))
    .filter((entry: AnyRecord) => entry.title && /^https?:\/\//i.test(entry.url));
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    const key = clean.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function competitorHeadingThemes(competitorEvidence: AnyRecord | null): string[] {
  const headings: string[] = (competitorEvidence?.competitors || [])
    .flatMap((row: AnyRecord) => Array.isArray(row.headings) ? row.headings : [])
    .map((heading: AnyRecord) => String(heading.text || "").toLowerCase());
  const themes: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/\bo que (e|é)|significa|conceito|defini/, "definição e contexto"],
    [/tipo|fonte|canal|diferen/, "tipos, fontes e diferenças"],
    [/por que|benef|vantagem|import/, "benefícios e critérios de investimento"],
    [/estrat|planej|criar|gerar|aument/, "estratégia e plano de execução"],
    [/seo|on-page|off-page|tecnico|técnico|palavra-chave/, "SEO, conteúdo e otimização"],
    [/monitor|metric|medir|resultado|ajuste/, "mensuração e melhoria contínua"],
    [/erro|risco|cuidado|problema/, "erros, riscos e limites"],
  ];
  for (const [pattern, label] of checks) {
    if (headings.some((heading) => pattern.test(heading))) themes.push(label);
  }
  return uniqueStrings(themes).slice(0, 6);
}

function roundUpToFifty(value: number): number {
  return Math.ceil(value / 50) * 50;
}

function buildDimensionedContentOutline(topic: string, analysisData: AnyRecord | null, targetWords: number): AnyRecord {
  const gaps = asStringList(analysisData?.gaps);
  const hypotheses = asStringList(analysisData?.improvement_hypotheses);
  const themes = asStringList(analysisData?.competitor_heading_themes);
  const minH2Sections = Math.max(4, Math.ceil(targetWords / 500));
  const iterations: AnyRecord[] = [];
  const h2s: AnyRecord[] = [];
  const addH2 = (title: string, purpose: string, source = "editorial") => {
    if (h2s.some((item) => item.title.toLowerCase() === title.toLowerCase())) return;
    h2s.push({ level: 2, title, purpose, source });
  };

  addH2("O que é e por que importa", "Responder à intenção principal com definição direta, contexto de uso e relevância prática.");
  addH2("Como funciona na prática", "Explicar os componentes do tema sem assumir conhecimento prévio.");
  if (themes.length) addH2("Padrões que a busca espera encontrar", `Cobrir os temas recorrentes da SERP sem reproduzir headings concorrentes: ${themes.join(", ")}.`, "serp-patterns");
  if (gaps[0]) addH2("Lacunas que este conteúdo precisa cobrir", `Transformar a lacuna identificada em orientação pública: ${gaps[0]}.`, "seo-analysis-gap");
  if (hypotheses[0]) addH2("Diferencial editorial recomendado", `Aplicar a hipótese editorial com cuidado e sem tratá-la como fato comprovado: ${hypotheses[0]}.`, "seo-analysis-hypothesis");

  const fallbackSections = [
    ["Quando faz sentido priorizar", "Ajudar o leitor a decidir se o tema é prioridade no cenário atual."],
    ["Diagnóstico antes da execução", "Mostrar quais sinais devem ser avaliados antes de criar ou alterar páginas."],
    ["Planejamento da estratégia", "Organizar objetivo, público, intenção de busca e responsabilidades."],
    ["Conteúdo e intenção de busca", "Explicar como alinhar pauta, profundidade e utilidade ao que o leitor procura."],
    ["Otimização de páginas existentes", "Orientar melhorias em páginas que já existem antes de criar novos ativos."],
    ["SEO técnico e experiência", "Conectar estrutura, rastreabilidade, velocidade e UX ao resultado orgânico."],
    ["Autoridade, distribuição e confiança", "Tratar sinais externos e prova com linguagem proporcional à evidência disponível."],
    ["Como medir evolução", "Definir indicadores, leitura de tendência e limites de atribuição."],
    ["Erros comuns", "Prevenir promessas sem prova, atalhos frágeis e interpretações superficiais."],
    ["Plano de ação", "Fechar com próximos passos concretos e proporcionais à evidência disponível."],
    ["Checklist de revisão", "Dar ao leitor uma forma simples de conferir se a execução está completa."],
    ["Perguntas frequentes", "Responder dúvidas recorrentes sem criar uma lista artificial de termos."],
  ];

  iterations.push({ iteration: 1, action: "seed-outline", h2_sections: h2s.length });
  let fallbackIndex = 0;
  while (h2s.length < minH2Sections && fallbackIndex < fallbackSections.length) {
    const [title, purpose] = fallbackSections[fallbackIndex++];
    addH2(title, purpose);
  }
  while (h2s.length < minH2Sections) {
    addH2(`Seção complementar ${h2s.length + 1}`, "Expandir o tema apenas com orientação útil, verificável e alinhada à intenção de busca.");
  }

  const h2Budget = roundUpToFifty(Math.max(350, Math.ceil(targetWords / h2s.length)));
  const outline = [
    { level: 1, title: topic, purpose: "Responder à intenção principal com linguagem pública.", word_budget: 0, source: "topic" },
    ...h2s.map((item) => ({ ...item, word_budget: h2Budget })),
  ];
  const plannedWords = h2Budget * h2s.length;
  const capacity = {
    target_words: targetWords,
    min_h2_sections: minH2Sections,
    planned_h2_sections: h2s.length,
    planned_words: plannedWords,
    can_support_target: h2s.length >= minH2Sections && plannedWords >= targetWords,
    iterations: [
      ...iterations,
      { iteration: 2, action: "expanded-outline", h2_sections: h2s.length, section_word_budget: h2Budget, planned_words: plannedWords },
    ],
  };
  return { outline, capacity };
}

function shortExcerpt(line: string): string {
  return line.replace(/\s+/g, " ").trim().slice(0, 180);
}

function firstMarkdownTitle(body: string, fallback: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function wikiExcerpts(body: string, max = 3): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("|") && line.length > 20)
    .slice(0, max)
    .map(shortExcerpt);
}

function headingSectionItems(body: string, heading: RegExp, max = 5): string[] {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => heading.test(line.trim()));
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    const clean = line.replace(/^[-*]\s+/, "").trim();
    if (clean && !clean.startsWith("|") && clean.length > 2) out.push(shortExcerpt(clean));
    if (out.length >= max) break;
  }
  return out;
}

function readBrainEvidencePage(projectDir: string, rel: string): AnyRecord {
  const file = path.join(projectDir, "brain", rel);
  if (!fs.existsSync(file)) {
    return {
      path: `brain/${rel}`,
      title: path.basename(rel, ".md"),
      filled: false,
      content_hash_sha256: null,
      excerpts_used: [],
      authorial: AUTHORIAL_BRAIN_PAGES.has(rel),
    };
  }
  const text = fs.readFileSync(file, "utf8");
  const [fm, body] = parseFrontmatter(text);
  const filled = isBrainPageFilled(body);
  return {
    path: `brain/${rel}`,
    title: cleanFrontmatterValue(fm.title) || firstMarkdownTitle(body, path.basename(rel, ".md")),
    updated: cleanFrontmatterValue(fm.updated),
    filled,
    content_hash_sha256: sha256Text(text),
    excerpts_used: wikiExcerpts(body),
    authorial: AUTHORIAL_BRAIN_PAGES.has(rel),
  };
}

function buildContentContextEvidence(projectDir: string, topicSlug: string): AnyRecord {
  const pageRels = ["index.md", "identidade.md", "voz.md", "tecnologia.md", "editorial.md"];
  const brainPages = pageRels.map((rel) => readBrainEvidencePage(projectDir, rel));
  const voicePage = brainPages.find((page) => page.path === "brain/voz.md") || readBrainEvidencePage(projectDir, "voz.md");
  const voiceFile = path.join(projectDir, "brain", "voz.md");
  let voiceBody = "";
  if (fs.existsSync(voiceFile)) voiceBody = parseFrontmatter(fs.readFileSync(voiceFile, "utf8"))[1];
  const limitations = brainPages
    .filter((page) => page.authorial && !page.filled)
    .map((page) => `Página autoral ${page.path} está vazia; orientação usada como limitação visível, não como contexto aprovado.`);
  return {
    generated_at: nowIso(),
    topic_slug: topicSlug,
    method: "read authorial brain pages, hash content, extract short orientation excerpts",
    brain_pages_read: brainPages,
    voice_evidence: {
      path: voicePage.path,
      title: voicePage.title,
      filled: voicePage.filled,
      updated: voicePage.updated,
      content_hash_sha256: voicePage.content_hash_sha256,
      patterns: headingSectionItems(voiceBody, /^##\s+(Princípios|Padrões)/i),
      avoid: headingSectionItems(voiceBody, /^##\s+Evitar/i),
      reference_phrases: headingSectionItems(voiceBody, /^##\s+(Frases de referência|Exemplos aprovados)/i),
    },
    limitations,
  };
}

function summarizeContextEvidence(evidence: AnyRecord, projectDir: string, evidencePath: string): AnyRecord {
  return {
    path: path.relative(projectDir, evidencePath),
    brain_pages_read: (evidence.brain_pages_read || []).map((page: AnyRecord) => ({
      path: page.path,
      title: page.title,
      filled: page.filled,
      updated: page.updated,
      content_hash_sha256: page.content_hash_sha256,
      excerpts_used: (page.excerpts_used || []).slice(0, 2),
    })),
    voice_evidence: evidence.voice_evidence,
    limitations: evidence.limitations || [],
  };
}

function competitorWordCountFromData(entry: AnyRecord, competitor?: AnyRecord): number | null {
  const candidates = [
    entry.word_count,
    entry.page?.word_count,
    entry.extracted?.word_count,
    competitor?.word_count,
    competitor?.page?.word_count,
    competitor?.extracted?.word_count,
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return Math.trunc(value);
  }
  return null;
}

function loadJsonishArg(value: unknown): AnyRecord {
  if (!value || value === true) return {};
  const raw = String(value);
  const candidate = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  if (fs.existsSync(candidate)) return readDataFile(candidate);
  return JSON.parse(raw);
}

async function loadCompetitorPage(entry: AnyRecord, args: AnyRecord): Promise<{ status: number | null; html: string; finalUrl: string; source: string }> {
  const fixtures = loadJsonishArg(args.competitor_fixtures || args.page_fixtures);
  const fixture = fixtures[entry.url] || fixtures[String(entry.url || "").replace(/\/+$/, "")];
  if (fixture) {
    const file = path.isAbsolute(String(fixture)) ? String(fixture) : path.resolve(ROOT, String(fixture));
    return { status: null, html: fs.readFileSync(file, "utf8"), finalUrl: entry.url, source: "fixture" };
  }
  const fetched = await fetchUrl(entry.url);
  return { status: fetched.status, html: fetched.html, finalUrl: fetched.finalUrl || entry.url, source: "fetched-page" };
}

function top3ByPosition(analysisData: AnyRecord | null): AnyRecord[] {
  return [...(Array.isArray(analysisData?.top_results) ? analysisData.top_results : [])]
    .filter((entry: AnyRecord) => entry.url)
    .sort((a: AnyRecord, b: AnyRecord) => Number(a.position || 999) - Number(b.position || 999))
    .slice(0, 3);
}

async function buildCompetitorEvidence(analysisData: AnyRecord | null, args: AnyRecord): Promise<AnyRecord> {
  const bypassConfirmed = boolArg(args.top3_bypass_confirmed, false);
  const bypassReason = String(args.top3_bypass_reason || "").trim();
  const top3 = top3ByPosition(analysisData);
  if (top3.length < 3 && !(bypassConfirmed && bypassReason)) throw new CliError("Top 3 competitor evidence requires 3 organic results. Rerun SERP extraction or use --top3-bypass-confirmed --top3-bypass-reason after explicit user approval.");
  const competitors = Array.isArray(analysisData?.competitors) ? analysisData.competitors : [];
  const rows: AnyRecord[] = [];
  const failures: string[] = [];
  for (const entry of top3) {
    const existing = competitors.find((item: AnyRecord) => item?.serp?.url === entry.url);
    let page = existing?.page || {};
    let httpStatus = existing?.http_status ?? null;
    let source = "seo-analysis";
    try {
      if (bypassConfirmed && bypassReason && (!page?.word_count || !Array.isArray(page?.headings) || !page.headings.length)) {
        rows.push({ position: entry.position, url: entry.url, domain: entry.domain || safeHost(entry.url), title: entry.title || "", fetch_status: "bypassed", error: "top3 evidence bypassed by user approval" });
        continue;
      }
      if (!page?.word_count || !Array.isArray(page?.headings) || !page.headings.length) {
        const loaded = await loadCompetitorPage(entry, args);
        httpStatus = loaded.status;
        source = loaded.source;
        page = extractHtml(loaded.html, loaded.finalUrl);
      }
      const wordCount = competitorWordCountFromData(entry, { page });
      const headings = (page.headings || []).filter((h: AnyRecord) => ["h1", "h2", "h3"].includes(String(h.level)));
      const h1 = headings.find((h: AnyRecord) => h.level === "h1")?.text || "";
      if (!wordCount || !headings.length || !h1) throw new Error("missing heading tags or word_count");
      rows.push({
        position: Number(entry.position || rows.length + 1),
        url: entry.url,
        domain: entry.domain || safeHost(entry.url),
        title: page.title || entry.title || "",
        meta_description: page.meta_description || "",
        http_status: httpStatus,
        fetch_status: "ok",
        source,
        h1,
        headings,
        h2_count: page.h2_count || headings.filter((h: AnyRecord) => h.level === "h2").length,
        word_count: wordCount,
        sub_agent_review: {
          agent_id: `top3-competitor-${Number(entry.position || rows.length + 1)}`,
          status: "complete",
          summary: `Concorrente analisado com ${wordCount} palavras visíveis, H1 "${h1}" e ${page.h2_count || 0} seções H2.`,
          evidence_refs: ["title", "meta_description", "h1", "headings", "word_count"],
        },
      });
    } catch (error) {
      const message = `${entry.domain || entry.url}: ${String((error as Error).message || error)}`;
      failures.push(message);
      rows.push({ position: entry.position, url: entry.url, domain: entry.domain || safeHost(entry.url), title: entry.title || "", fetch_status: "failed", error: message });
    }
  }
  if (failures.length && !(bypassConfirmed && bypassReason)) throw new CliError(`Top 3 competitor evidence failed: ${failures.join("; ")}. Use --top3-bypass-confirmed --top3-bypass-reason only after explicit user approval.`);
  return {
    generated_at: nowIso(),
    method: "top-3 independent competitor extraction with sub-agent-style reviews; deterministic fetch/extract supplies title, meta, headings, and word count",
    required: true,
    bypass: bypassConfirmed ? { confirmed: true, reason: bypassReason, consequence: "Briefing is not fully backed by Top 3 competitor word-count/heading evidence." } : null,
    competitors: rows,
    failures,
    valid: rows.filter((row) => row.fetch_status === "ok" && Number(row.word_count) > 0),
  };
}

function buildSkyscraperWordCount(competitorEvidence: AnyRecord, args: AnyRecord): AnyRecord {
  const rows: AnyRecord[] = (competitorEvidence.competitors || []).map((row: AnyRecord) => ({
    url: row.url || "",
    domain: row.domain || safeHost(row.url || ""),
    title: row.title || "",
    position: row.position,
    status: row.fetch_status === "ok" && Number(row.word_count) > 0 ? "ok" : "failed",
    source: row.source || "competitor-evidence",
    http_status: row.http_status ?? null,
    word_count: row.word_count ?? null,
    error: row.error || null,
  }));
  const valid = rows.filter((row) => row.status === "ok" && Number(row.word_count) > 0);
  if (!valid.length && !(boolArg(args.top3_bypass_confirmed, false) && args.top3_bypass_reason)) throw new CliError("Cannot calculate target_words: no valid Top 3 competitor word counts.");
  const maxWords = valid.length ? Math.max(...valid.map((row) => Number(row.word_count))) : 0;
  const rawTarget = maxWords ? Math.max(Math.ceil(maxWords * 1.2), 2000) : 2000;
  return {
    method: {
      formula: "max(ceil(max_competitor_words * 1.2), 2000), rounded up to 100-word block",
      word_counter: WORD_COUNT_METHOD,
    },
    floor_words: 2000,
    multiplier: 1.2,
    competitors: rows,
    valid_competitors: valid,
    max_competitor_words: maxWords || null,
    target_words: roundUpToHundred(rawTarget),
    limitations: valid.length ? rows.filter((row) => row.status !== "ok").map((row) => `${row.domain || row.url || "competidor"}: ${row.error}`) : ["Bypass explícito: nenhum concorrente válido com contagem de palavras; meta definida pelo piso de 2.000 palavras."],
  };
}

async function buildContentResearchPacket(topic: string, keyword: string, topicSlug: string, keywordSlug: string, projectDir: string, args: AnyRecord, competitorEvidence: AnyRecord): Promise<AnyRecord> {
  const analysisFile = seoAnalysisFile(projectDir, keywordSlug);
  if (!analysisFile && !args.skip_data) throw new CliError(`Missing seo-analysis for this topic. Run seo-analysis for "${keyword}" or rerun with --skip-data --skip-data-confirmed --skip-data-reason "motivo claro" after the user explicitly approves the bypass.`);
  if (args.skip_data && !args.skip_data_reason) throw new CliError('--skip-data requires --skip-data-reason "motivo claro".');
  if (args.skip_data && !args.skip_data_confirmed) throw new CliError("--skip-data requires --skip-data-confirmed after explicit user approval to bypass SEO analysis.");
  const analysisData = analysisFile ? readDataFile(analysisFile) : null;
  const skipDataBypass = args.skip_data
    ? requireDataforseoBypassApproval(args, {
      workflow: "content-seo",
      step: "seo-analysis-dataforseo",
      subject: topic,
      reason: args.skip_data_reason,
      consequence: "Briefing and draft will not be SERP-backed or DataForSEO-backed for the skipped SEO analysis dimension.",
      provider_used: "none",
      confirmed: args.skip_data_confirmed,
    })
    : null;
  const providerBypass = analysisData && analysisData.provider !== "dataforseo"
    ? requireDataforseoBypassApproval(args, {
      workflow: "content-seo",
      step: "dataforseo-serp-extract",
      subject: keyword,
      reason: args.provider_bypass_reason,
      consequence: "Briefing uses secondary-provider SERP evidence and is not DataForSEO-backed.",
      provider_used: String(analysisData.provider || "secondary"),
      confirmed: args.provider_bypass_confirmed,
    })
    : null;
  const domains = topResultDomains(analysisData);
  const skyscraperWordCount = buildSkyscraperWordCount(competitorEvidence, args);
  const evidenceSources = analysisData && analysisFile ? [path.relative(projectDir, analysisFile)] : [];
  const processBypasses = [
    skipDataBypass,
    providerBypass,
    competitorEvidence?.bypass ? { step: "top-3-competitor-evidence", ...competitorEvidence.bypass } : null,
  ].filter(Boolean);
  const limitations = [
    ...asStringList(analysisData?.limitations),
    ...(skyscraperWordCount.limitations || []),
    ...(analysisData?.keyword_metrics ? [] : ["Métricas de volume, dificuldade, tráfego, CTR e backlinks permanecem ausentes quando o provider não retorna esses dados."]),
  ];
  const headingThemes = competitorHeadingThemes(competitorEvidence);
  return {
    topic,
    topic_slug: topicSlug,
    keyword,
    keyword_slug: keywordSlug,
    generated_at: nowIso(),
    data_provenance: {
      seo_analysis: analysisData && analysisFile
        ? { path: path.relative(projectDir, analysisFile), provider: analysisData.provider, provider_reason: analysisData.provider_reason, generated_at: analysisData.generated_at }
        : { path: null, provider: null, provider_reason: `skip-data: ${args.skip_data_reason}` },
    },
    process_bypass: processBypasses.length ? processBypasses : null,
    evidence_used: evidenceSources,
    evidence_sources: evidenceSources,
    public_citations: contentPublicCitations(analysisData),
    serp_competitor_domains: domains,
    forbidden_prose_terms: domains,
    synthesis: {
      intent: intentSummary(analysisData?.intent),
      reader_need: "Entender o tema e tomar uma decisão prática sem depender de promessa, jargão ou prova inventada.",
      gaps: asStringList(analysisData?.gaps),
    },
    hypotheses: asStringList(analysisData?.improvement_hypotheses),
    competitor_heading_themes: headingThemes,
    skyscraper: {
      word_count: skyscraperWordCount,
    },
    limitations,
    incomplete: Boolean(analysisData?.incomplete),
  };
}

function contentVoiceContext(projectDir: string): AnyRecord {
  const voicePath = path.join(projectDir, "brain", "voz.md");
  const [voiceFm, voiceBody] = fs.existsSync(voicePath) ? parseFrontmatter(fs.readFileSync(voicePath, "utf8")) : [{}, ""];
  const filled = voiceBody.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").trim().length > 50;
  return {
    path: fs.existsSync(voicePath) ? path.relative(projectDir, voicePath) : null,
    filled,
    title: cleanFrontmatterValue(voiceFm.title) || "Voz",
    updated: cleanFrontmatterValue(voiceFm.updated),
  };
}

function buildContentBrief(research: AnyRecord, projectDir: string, approvalMode: string, contextEvidence: AnyRecord): AnyRecord {
  const voiceContext = contentVoiceContext(projectDir);
  const targetWords = Number(research.skyscraper?.word_count?.target_words || 2000);
  const bypasses = Array.isArray(research.process_bypass) ? research.process_bypass : research.process_bypass ? [research.process_bypass] : [];
  const outlinePlan = buildDimensionedContentOutline(research.topic, {
    gaps: research.synthesis.gaps,
    improvement_hypotheses: research.hypotheses,
    competitor_heading_themes: research.competitor_heading_themes,
  }, targetWords);
  return {
    topic: research.topic,
    topic_slug: research.topic_slug,
    keyword: research.keyword,
    keyword_slug: research.keyword_slug,
    language: "pt-BR",
    market: "Brasil",
    generated_at: nowIso(),
    data_provenance: research.data_provenance,
    process_bypass: research.process_bypass,
    competitor_evidence: research.data_provenance?.competitor_evidence || null,
    context_evidence: contextEvidence,
    evidence_sources: research.evidence_sources,
    public_citations: research.public_citations,
    serp_competitor_domains: research.serp_competitor_domains,
    forbidden_prose_terms: research.forbidden_prose_terms,
    skyscraper: research.skyscraper,
    source_policy: {
      evidence_sources: "local snapshots and reports only; never link these paths in public prose",
      public_citations: "canonical public URLs only",
      serp_competitor_domains: "SERP competitors inform gaps and must not appear in public prose",
    },
    voice_context: voiceContext,
    approval: {
      phase: "briefing",
      mode: approvalMode,
      status: "pending",
      aprovador: null,
      aprovado_em: null,
      decided_at: null,
      visible_missing_analysis: bypasses.map((item: AnyRecord) => item.consequence).filter(Boolean),
      notes: null,
    },
    brief: {
      public_content_type: "article",
      intent: research.synthesis.intent,
      reader_need: research.synthesis.reader_need,
      promise: `Explicar ${research.topic} com foco em aplicação prática para SEO, sem linguagem interna de processo.`,
      target_words: targetWords,
      must_include: ["resposta direta no início", "orientação prática", "limites de evidência", "próximo passo útil para o leitor"],
      must_avoid: ["linguagem de brain, workbench, briefing, log ou agente", "promessa de ranking sem evidência", "links para arquivos locais", "menção a concorrentes da SERP em prosa", "anchors genéricos"],
      source_requirements: ["usar URLs públicas canônicas no corpo quando houver citação externa", "manter snapshots e reports apenas em metadados"],
      outline: outlinePlan.outline,
      outline_capacity: outlinePlan.capacity,
    },
    draft_status: "briefing",
  };
}

function renderContentBriefMarkdown(brief: AnyRecord): string {
  const b = brief.brief || {};
  const outline = Array.isArray(b.outline) ? b.outline : [];
  const capacity = b.outline_capacity || {};
  const limitations = [
    ...asStringList(brief.context_evidence?.limitations),
    ...asStringList(brief.skyscraper?.word_count?.limitations),
    ...asStringList(brief.approval?.visible_missing_analysis),
  ];
  const evidence = asStringList(brief.evidence_sources);
  const forbidden = asStringList(brief.forbidden_prose_terms);
  const line = (value: unknown) => String(value || "não informado");
  return `# Briefing: ${line(brief.topic)}

Este é o artefato principal para revisão humana. O YAML continua sendo o contrato estruturado, mas a aprovação editorial deve considerar este Markdown e, preferencialmente, acontecer pelo Web Companion no navegador.

## Resumo

- Keyword principal: ${line(brief.keyword)}
- Mercado e idioma: ${line(brief.market)} · ${line(brief.language)}
- Intenção de busca: ${line(b.intent)}
- Necessidade do leitor: ${line(b.reader_need)}
- Promessa editorial: ${line(b.promise)}
- Meta de palavras: ${line(b.target_words)}

## Capacidade do outline

- H2 mínimos para a meta: ${line(capacity.min_h2_sections)}
- H2 planejados: ${line(capacity.planned_h2_sections)}
- Palavras planejadas: ${line(capacity.planned_words)}
- Suporta a meta: ${capacity.can_support_target ? "sim" : "não"}

## Evidências e limites

- Análise SEO: ${line(brief.data_provenance?.seo_analysis?.path)}
- Evidência Top 3: ${line(brief.competitor_evidence?.path)}
- Contexto de Wiki: ${line(brief.context_evidence?.path)}
- Tom de voz: ${line(brief.context_evidence?.voice_evidence?.path || brief.voice_context?.path)} (${line(brief.context_evidence?.voice_evidence?.status || brief.voice_context?.status)})
${evidence.length ? evidence.map((item) => `- Fonte de evidência: ${item}`).join("\n") : "- Fonte de evidência: não informada"}
${limitations.length ? limitations.map((item) => `- Limitação: ${item}`).join("\n") : "- Limitação: nenhuma limitação adicional registrada"}

## Outline publicável

${outline.map((item: AnyRecord) => {
    const level = Number(item.level) || 2;
    const prefix = level === 1 ? "#" : "##";
    const budget = Number(item.word_budget || 0) > 0 ? ` · orçamento aproximado: ${item.word_budget} palavras` : "";
    return `${prefix} ${line(item.title)}${budget}\n\n${line(item.purpose)}`;
  }).join("\n\n")}

## Diretrizes de escrita

${asStringList(b.must_include).map((item) => `- Incluir: ${item}`).join("\n") || "- Incluir: resposta direta e orientação prática"}
${asStringList(b.must_avoid).map((item) => `- Evitar: ${item}`).join("\n") || "- Evitar: linguagem interna e promessa sem evidência"}
${forbidden.length ? forbidden.map((item) => `- Não mencionar em prosa pública: ${item}`).join("\n") : "- Não mencionar em prosa pública: nenhum termo adicional registrado"}

## Próximo passo recomendado

Revise este briefing pelo Web Companion no navegador para aprovar, pedir reescrita ou rejeitar. A aprovação gera o rascunho em artifacts, mas não publica o conteúdo na Wiki.
`;
}

function resolveContentPaths(projectDir: string, args: AnyRecord): {
  topic: string;
  topicSlug: string;
  keyword: string;
  keywordSlug: string;
  workDir: string;
  artifactDir: string;
  researchPath: string;
  competitorEvidencePath: string;
  contextEvidencePath: string;
  briefPath: string;
  briefMarkdownPath: string;
  draftPath: string;
  checkPath: string;
  wordCountPath: string;
  reviewPath: string;
} {
  const topic = required(args, "topic");
  const keyword = args.keyword || topic;
  const topicSlug = slugify(topic);
  const keywordSlug = slugify(keyword);
  const workDir = contentWorkbenchDir(projectDir, topicSlug);
  const artifactDir = contentArtifactsDir(projectDir, topicSlug);
  return {
    topic,
    topicSlug,
    keyword,
    keywordSlug,
    workDir,
    artifactDir,
    researchPath: path.join(workDir, "research.yaml"),
    competitorEvidencePath: path.join(workDir, "competitor-evidence.yaml"),
    contextEvidencePath: path.join(workDir, "context-evidence.yaml"),
    briefPath: path.join(workDir, "brief.yaml"),
    briefMarkdownPath: path.join(workDir, "brief.md"),
    draftPath: contentDraftFile(projectDir, topicSlug),
    checkPath: contentCheckFile(projectDir, topicSlug),
    wordCountPath: contentWordCountFile(projectDir, topicSlug),
    reviewPath: contentReviewFile(projectDir, topicSlug),
  };
}

function assertBriefReadyForWriting(brief: AnyRecord, projectDir: string): void {
  if (brief.approval?.status !== "approved") throw new CliError("Briefing is not approved. Stop at the approval gate before writing.");
  if (!["approved-for-writing", "draft", "reviewed", "checks-failed"].includes(String(brief.draft_status || ""))) throw new CliError("Briefing is not approved for writing.");
  if (!brief.brief?.public_content_type) throw new CliError("Briefing is missing public content type.");
  const seoPath = brief.data_provenance?.seo_analysis?.path;
  if (!brief.process_bypass && (!seoPath || !fs.existsSync(path.join(projectDir, seoPath)))) throw new CliError("Briefing is missing valid seo-analysis provenance.");
}

function validateContextEvidenceForApproval(brief: AnyRecord, projectDir: string, notes = ""): void {
  const errors: string[] = [];
  const competitorEvidencePath = brief.competitor_evidence?.path ? path.join(projectDir, String(brief.competitor_evidence.path)) : "";
  if (!brief.competitor_evidence?.path || !fs.existsSync(competitorEvidencePath)) errors.push("missing-competitor-evidence-file");
  const context = brief.context_evidence;
  if (!context || typeof context !== "object") errors.push("missing-context-evidence");
  const contextPath = context?.path ? path.join(projectDir, String(context.path)) : "";
  if (!context?.path || !fs.existsSync(contextPath)) errors.push("missing-context-evidence-file");
  const brainPages = Array.isArray(context?.brain_pages_read) ? context.brain_pages_read : [];
  if (!brainPages.length) errors.push("missing-brain-pages-read");
  for (const page of brainPages) {
    if (!page?.path || !("content_hash_sha256" in page)) errors.push(`invalid-brain-evidence:${page?.path || "unknown"}`);
    if (page?.filled !== false && !page?.content_hash_sha256) errors.push(`missing-brain-hash:${page?.path || "unknown"}`);
  }
  const voice = context?.voice_evidence;
  if (!voice || typeof voice !== "object" || !voice.path || !("content_hash_sha256" in voice)) errors.push("missing-voice-evidence");
  if (voice?.filled !== false && !voice?.content_hash_sha256) errors.push("missing-voice-hash");
  if (voice?.filled !== true && !/\b(voz|voice|tom)\b/i.test(notes)) errors.push("voice-context-not-acknowledged");
  if (brief.brief?.outline_capacity?.can_support_target !== true) errors.push("outline-cannot-support-target");
  if (errors.length) throw new CliError(`Briefing approval blocked: ${Array.from(new Set(errors)).join(", ")}`);
}

function contentTargetWords(brief: AnyRecord): number {
  const value = Number(brief.skyscraper?.word_count?.target_words || brief.brief?.target_words || 2000);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 2000;
}

function renderContentDraft(brief: AnyRecord): string {
  const topic = String(brief.topic || "Conteúdo");
  const keyword = String(brief.keyword || topic);
  const slug = String(brief.topic_slug || slugify(topic));
  const targetWords = contentTargetWords(brief);
  const fallbackOutline = buildDimensionedContentOutline(topic, null, targetWords).outline;
  const outline = Array.isArray(brief.brief?.outline) && brief.brief.outline.length ? brief.brief.outline : fallbackOutline;
  const sectionItems = outline.filter((item: AnyRecord) => Number(item.level) === 2);
  const voiceFilled = brief.voice_context?.filled === true;
  const evidenceSources = asStringList(brief.evidence_sources);
  const contextEvidencePath = String(brief.context_evidence?.path || `workbench/content/${slug}/context-evidence.yaml`);
  const sections = sectionItems.map((item: AnyRecord) => `## ${String(item.title || "Seção")}\n\n${String(item.purpose || "Desenvolver esta seção com orientação pública, evidência proporcional e próximos passos claros.")}`).join("\n\n");
  const origem = String(brief.origem || "blog");
  const publishedAt = String(brief.published_at || today());
  const sourceUrl = String(brief.source_url || "");
  const area = String(brief.area || "");
  return `---\ntitle: ${yamlString(topic)}\nslug: ${yamlString(slug)}\npublished_at: ${yamlString(publishedAt)}\nsource_url: ${yamlString(sourceUrl)}\norigem: ${yamlString(origem)}\narea: ${yamlString(area)}\npublic_content: true\nprimary_keyword: ${yamlString(keyword)}\nbrief_path: ${yamlString(`workbench/content/${slug}/brief.yaml`)}\ncontext_evidence_path: ${yamlString(contextEvidencePath)}\nvoice_filled: ${voiceFilled}\ntarget_words: ${targetWords}\nsource_policy: frontmatter-consulted-sources\nsources:\n${evidenceSources.map((source) => `  - ${yamlString(source)}`).join("\n") || "  - \"not-serp-backed\""}\n---\n\n# ${topic}\n\n${topic} é uma busca que precisa entregar uma resposta clara, útil e proporcional ao que já pode ser comprovado. Para quem pesquisa por ${keyword}, o conteúdo deve explicar o conceito, mostrar como aplicar a ideia e deixar explícitos os limites da orientação.\n\n${sections}\n`;
}

function markdownH2Count(text: string): number {
  const [, body] = parseFrontmatter(text);
  return (body.match(/^##\s+\S/gm) || []).length;
}

function runContentPublicationCheck(brief: AnyRecord, draftPath: string, checkPath: string, wordCountPath: string, reviewPath: string): AnyRecord {
  if (!fs.existsSync(draftPath)) throw new CliError(`Draft not found: ${draftPath}`);
  const text = fs.readFileSync(draftPath, "utf8");
  const issues = validatePublicContentDraft(text, brief);
  const targetWords = contentTargetWords(brief);
  const counted = countVisibleMarkdownWords(text);
  const actualWords = Number(counted.words);
  const gapWords = Math.max(0, targetWords - actualWords);
  const minH2Sections = Math.ceil(targetWords / 500);
  const actualH2Sections = markdownH2Count(text);
  const route = gapWords === 0 ? "pass" : actualH2Sections < minH2Sections ? "return_to_briefing" : "return_to_writer";
  const wordCount = {
    ok: gapWords === 0,
    checked_at: nowIso(),
    draft: draftPath,
    target_words: targetWords,
    actual_words: actualWords,
    gap_words: gapWords,
    min_h2_sections: minH2Sections,
    actual_h2_sections: actualH2Sections,
    route,
    rationale: gapWords === 0
      ? "Conteúdo atingiu a meta determinística de palavras."
      : route === "return_to_briefing"
        ? "Conteúdo está curto e o outline tem poucas seções H2 para a meta; volte ao briefing."
        : "Conteúdo está curto, mas o outline comporta expansão; volte ao redator.",
    method: counted.method,
  };
  if (!wordCount.ok) issues.push(`word-count below target: ${actualWords}/${targetWords}`);
  const result = { ok: issues.length === 0 && wordCount.ok, checked_at: nowIso(), draft: draftPath, issues: Array.from(new Set(issues)), word_count_path: wordCountPath, review_path: reviewPath };
  const review = {
    ok: result.ok,
    reviewed_at: result.checked_at,
    draft: draftPath,
    route,
    findings: result.issues,
    recommendation: result.ok ? "ready_for_final_approval" : route,
  };
  writeYaml(wordCountPath, wordCount);
  writeYaml(reviewPath, review);
  writeYaml(checkPath, result);
  return result;
}

function writeApprovedContentDraft(
  brief: AnyRecord,
  projectDir: string,
  paths: ReturnType<typeof resolveContentPaths>,
  briefPath: string,
  actor: string,
  trigger: string,
): AnyRecord {
  assertBriefReadyForWriting(brief, projectDir);
  const draft = renderContentDraft(brief);
  writeText(paths.draftPath, draft);
  brief.draft_status = "draft";
  brief.draft_path = path.relative(projectDir, paths.draftPath);
  brief.updated_at = nowIso();
  writeContentBrief(briefPath, brief);
  appendOperationalLog(
    "content-draft",
    paths.topic,
    [path.relative(projectDir, paths.draftPath), path.relative(projectDir, briefPath)],
    "draft",
    `Rascunho público de SEO escrito em artifacts por ${trigger}; ainda não publicado na Wiki.`,
    actor ? `Actor: ${actor}` : undefined,
  );
  return { draft_path: paths.draftPath, brief_path: briefPath, draft_status: brief.draft_status };
}

async function commandContentSeo(args: AnyRecord): Promise<void> {
  const p = ensureProject();
  const phase = String(args.phase || "brief").trim().toLowerCase();
  if (!["brief", "approve", "write", "review", "check", "promote"].includes(phase)) throw new CliError("Unsupported --phase. Use brief, approve, write, review, check, or promote.");
  const paths = resolveContentPaths(p, args);

  if (phase === "brief") {
    const approvalMode = String(args.brief_approval || "manual").trim().toLowerCase();
    if (!["manual", "handoff"].includes(approvalMode)) throw new CliError("Unsupported --brief-approval. Auto approval was removed; use manual or handoff.");
    const analysisPath = seoAnalysisFile(p, paths.keywordSlug);
    if (!analysisPath && !args.skip_data) throw new CliError(`Missing seo-analysis for this topic. Run seo-analysis for "${paths.keyword}" or rerun with --skip-data --skip-data-confirmed --skip-data-reason "motivo claro" after the user explicitly approves the bypass.`);
    if (args.skip_data && !args.skip_data_reason) throw new CliError('--skip-data requires --skip-data-reason "motivo claro".');
    if (args.skip_data && !args.skip_data_confirmed) throw new CliError("--skip-data requires --skip-data-confirmed after explicit user approval to bypass SEO analysis.");
    const analysisData = analysisPath ? readDataFile(analysisPath) : null;
    if (args.skip_data) {
      requireDataforseoBypassApproval(args, {
        workflow: "content-seo",
        step: "seo-analysis-dataforseo",
        subject: paths.topic,
        reason: args.skip_data_reason,
        consequence: "Briefing and draft will not be SERP-backed or DataForSEO-backed for the skipped SEO analysis dimension.",
        provider_used: "none",
        confirmed: args.skip_data_confirmed,
      });
    }
    if (analysisData && analysisData.provider !== "dataforseo") {
      requireDataforseoBypassApproval(args, {
        workflow: "content-seo",
        step: "dataforseo-serp-extract",
        subject: paths.keyword,
        reason: args.provider_bypass_reason,
        consequence: "Briefing uses secondary-provider SERP evidence and is not DataForSEO-backed.",
        provider_used: String(analysisData.provider || "secondary"),
        confirmed: args.provider_bypass_confirmed,
      });
    }
    const competitorEvidence = await buildCompetitorEvidence(analysisData, args);
    const research = await buildContentResearchPacket(paths.topic, paths.keyword, paths.topicSlug, paths.keywordSlug, p, args, competitorEvidence);
    research.data_provenance.competitor_evidence = { path: path.relative(p, paths.competitorEvidencePath), required: true };
    research.evidence_sources = Array.from(new Set([...(research.evidence_sources || []), path.relative(p, paths.competitorEvidencePath)]));
    research.evidence_used = research.evidence_sources;
    const contextEvidence = buildContentContextEvidence(p, paths.topicSlug);
    const brief = buildContentBrief(research, p, approvalMode, summarizeContextEvidence(contextEvidence, p, paths.contextEvidencePath));
    writeYaml(paths.researchPath, research);
    writeYaml(paths.competitorEvidencePath, competitorEvidence);
    writeYaml(paths.contextEvidencePath, contextEvidence);
    writeYaml(paths.briefPath, brief);
    writeText(paths.briefMarkdownPath, renderContentBriefMarkdown(brief));
    appendDataforseoBypassLog(paths.topic, research.process_bypass, [path.relative(p, paths.researchPath), path.relative(p, paths.briefPath)]);
    appendOperationalLog("content-briefing", paths.topic, [path.relative(p, paths.researchPath), path.relative(p, paths.competitorEvidencePath), path.relative(p, paths.contextEvidencePath), path.relative(p, paths.briefPath), path.relative(p, paths.briefMarkdownPath)], "pending", "Briefing criado com evidência de Top 3, Wiki/tom de voz, Markdown de revisão e aguardando aprovação humana.");
    if (approvalMode === "handoff") {
      const handoff = spawnSync(process.execPath, [path.join(ROOT, "scripts", "companion.mjs"), "approve-briefing", "--project-root", p, "--brief", paths.briefPath], {
        cwd: ROOT,
        encoding: "utf8",
        env: process.env,
      });
      if (handoff.stderr) process.stderr.write(handoff.stderr);
      if (handoff.status !== 0) throw new CliError(`Briefing approval handoff failed: ${handoff.stderr || handoff.stdout || "unknown error"}`);
      printJson({ ok: true, phase, status: "approval_recorded", brief_path: paths.briefPath, brief_markdown_path: paths.briefMarkdownPath, draft_path: fs.existsSync(paths.draftPath) ? paths.draftPath : null, brief: readYaml(paths.briefPath) });
      return;
    }
    printJson({ ok: true, phase, status: "approval_required", approval_options: ["chat", "companion"], web_companion: { available: true, recommended: true, type: "approve-briefing" }, research_path: paths.researchPath, competitor_evidence_path: paths.competitorEvidencePath, context_evidence_path: paths.contextEvidencePath, brief_path: paths.briefPath, brief_markdown_path: paths.briefMarkdownPath, competitor_evidence: brief.competitor_evidence, context_evidence: brief.context_evidence, brief });
    return;
  }

  const briefPath = contentBriefFile(p, paths.topicSlug) || paths.briefPath;
  if (!fs.existsSync(briefPath)) throw new CliError(`Briefing not found: ${briefPath}`);
  const brief = readContentBrief(briefPath);

  if (phase === "approve") {
    const decision = String(args.decision || "approved").trim().toLowerCase();
    if (!["approved", "needs-rewrite", "rejected"].includes(decision)) throw new CliError("--decision must be approved, needs-rewrite, or rejected.");
    const approvedBy = String(args.approved_by || args.by || "").trim();
    if (!approvedBy) throw new CliError("--approved-by is required to approve or reject a briefing.");
    const notes = String(args.approval_notes || args.notes || "").trim();
    if (decision === "approved") validateContextEvidenceForApproval(brief, p, notes);
    brief.approval = {
      phase: "briefing",
      mode: brief.approval?.mode || "chat",
      status: decision,
      aprovador: decision === "approved" ? approvedBy : null,
      aprovado_em: decision === "approved" ? today() : null,
      decided_at: nowIso(),
      notes: notes || null,
      visible_missing_analysis: brief.approval?.visible_missing_analysis || [],
    };
    if (decision !== "approved") {
      brief.draft_status = decision;
      writeContentBrief(briefPath, brief);
      appendOperationalLog("content-briefing-approval", paths.topic, [path.relative(p, briefPath)], decision, `Briefing marcado como ${decision} por ${approvedBy}.`, notes || undefined);
      printJson({ ok: true, phase, status: decision, brief_path: briefPath, draft_path: null });
      return;
    }
    brief.draft_status = "approved-for-writing";
    const draftResult = writeApprovedContentDraft(brief, p, paths, briefPath, approvedBy, "briefing approval");
    appendOperationalLog("content-briefing-approval", paths.topic, [path.relative(p, briefPath), path.relative(p, paths.draftPath)], "approved", `Briefing aprovado por ${approvedBy}; draft gerado automaticamente em artifacts.`, notes || undefined);
    printJson({ ok: true, phase, status: "draft_created", decision, brief_path: briefPath, draft_path: draftResult.draft_path, context_evidence: brief.context_evidence });
    return;
  }

  if (phase === "write") {
    assertBriefReadyForWriting(brief, p);
    validateContextEvidenceForApproval(brief, p, String(brief.approval?.notes || ""));
    const draftResult = writeApprovedContentDraft(brief, p, paths, briefPath, String(brief.approval?.aprovador || "agent"), "write phase");
    printJson({ ok: true, phase, draft_path: draftResult.draft_path, brief_path: briefPath });
    return;
  }

  if (phase === "review" || phase === "check") {
    const result = runContentPublicationCheck(brief, paths.draftPath, paths.checkPath, paths.wordCountPath, paths.reviewPath);
    brief.draft_status = result.ok && phase === "review" ? "reviewed" : result.ok ? "checked" : "checks-failed";
    writeContentBrief(briefPath, brief);
    appendOperationalLog("content-check", paths.topic, [path.relative(p, paths.draftPath), path.relative(p, paths.checkPath), path.relative(p, paths.wordCountPath), path.relative(p, paths.reviewPath)], result.ok ? "passed" : "failed", `${result.issues.length} bloqueios encontrados.`);
    printJson({ ...result, phase });
    if (!result.ok) throw new CliError("Content publication checks failed.");
    return;
  }

  const approvedBy = args.approved_by ? String(args.approved_by).trim() : "";
  if (!approvedBy) throw new CliError("--approved-by is required for final approval before promotion.");
  if (!fs.existsSync(paths.checkPath)) throw new CliError("Publication checks must pass before promotion.");
  const check = readYaml(paths.checkPath);
  if (!check.ok) throw new CliError("Last publication checks did not pass.");
  if (fs.existsSync(paths.wordCountPath) && !readYaml(paths.wordCountPath).ok) throw new CliError("Word-count gate did not pass.");
  const origem = String(brief.origem || "blog");
  if (!PUBLIC_CONTENT_ORIGENS.has(origem)) throw new CliError(`Invalid origem: ${origem}. Use blog, linkedin, podcast, or outros.`);
  const target = path.join(p, "conteudos", origem, `${paths.topicSlug}.md`);
  writeText(target, fs.readFileSync(paths.draftPath, "utf8"));
  setFrontmatterValue(target, { published_at: yamlString(today()), origem: yamlString(origem) });
  brief.draft_status = "published";
  brief.publication = { path: path.relative(p, target), aprovador: approvedBy, aprovado_em: nowIso(), origem };
  writeContentBrief(briefPath, brief);
  appendLog("publicacao", `${paths.topic}`, [path.relative(p, target), path.relative(p, briefPath), path.relative(p, paths.checkPath)], `Conteúdo público publicado por ${approvedBy} em ${origem}.`, approvedBy);
  printJson({ ok: true, phase, promoted_path: target, aprovador: approvedBy });
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
  const outYaml = path.join(p, "workbench", "technical-seo", `${basename}.yaml`);
  const outMd = path.join(p, "workbench", "technical-seo", `${basename}.md`);
  writeYaml(outYaml, result);
  writeText(outMd, renderTechnicalMarkdown(result));
  appendLog("technical-seo", pageType, [path.relative(p, outYaml), path.relative(p, outMd)], "Auditoria técnica determinística executada.", "not-required");
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
  writeText(path.join(web, "app", "servicos", "page.tsx"), "export default function Page() { return <main><h1>Serviços</h1></main>; }\n");
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
  const requiredSections = ["## When To Use", "## Critical Points", "## Output Format"];
  const structuralSections = ["## Framework", "## Examples", "## Done Criteria", "## Related Skills"];
  function hasForbiddenRequirement(text: string): boolean {
    return text.split(/\r?\n/).some((line) => {
      const mentionsForbiddenPath = /(skills\/_shared\/|_shared\/|_legacy\/)/i.test(line);
      const requiresPath = /(must read|must use|required|requires|depend)/i.test(line);
      const negatesRequirement = /(no |not |do not|does not|without|forbidden|fail when)/i.test(line);
      return mentionsForbiddenPath && requiresPath && !negatesRequirement;
    });
  }
  const results = fs
    .readdirSync(skillDir)
    .filter((name) => !name.startsWith("_") && fs.existsSync(path.join(skillDir, name, "SKILL.md")))
    .sort()
    .map((name) => {
      const text = fs.readFileSync(path.join(skillDir, name, "SKILL.md"), "utf8");
      const checks = {
        frontmatter: text.startsWith("---\n") && /^name:\s*[\w-]+/m.test(text) && /^description:\s*.+/m.test(text),
        when_to_use: text.includes("## When To Use"),
        critical_points: text.includes("## Critical Points"),
        output_format: text.includes("## Output Format"),
        structural_section: structuralSections.some((section) => text.includes(section)),
        self_sufficient: !hasForbiddenRequirement(text),
      };
      const score = Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);
      return { skill: name, score, checks, promoted: score >= Number(args.threshold || 90) };
    });
  const report = { timestamp: nowIso(), threshold: Number(args.threshold || 90), results, ok: results.every((r) => r.promoted) };
  writeJson(path.join(ROOT, "runs", stamp(), "audit-skills-report.json"), report);
  printJson(report);
}

const COMMANDS: Record<string, (args: AnyRecord) => Promise<void>> = {
  "project-init": commandProjectInit,
  "brain-lint": commandBrainLint,
  "brain-approve": commandBrainApprove,
  "brain-ingest": commandBrainIngest,
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

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  try {
    const { command, args } = parseArgs(argv);
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
  runCli().then((code) => {
    process.exitCode = code;
  });
}
