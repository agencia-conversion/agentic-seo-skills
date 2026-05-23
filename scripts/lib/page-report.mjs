#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

export const REPORT_BROWSER_PROMPT_MESSAGE = "Posso abrir o Web Companion para você ver o relatório?";

export const REPORT_MODULE_IDS = new Set([
  "technical-seo",
  "internal-links",
  "seo-analysis",
  "keyword-research",
  "serp-extract",
  "backlink-analysis",
  "topic-cluster",
  "eeat",
]);

export function reportLocale(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "pt-BR";
  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("en")) return "en";
  return "en";
}

export function slugifyReport(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
  if (!slug || slug === "." || slug === ".." || slug.includes("/")) throw new Error("Unsafe report slug.");
  return slug;
}

export function reportMarkdownPath(projectDir, moduleId, runSlug) {
  if (!REPORT_MODULE_IDS.has(moduleId)) throw new Error(`Unsupported report module: ${moduleId}`);
  return path.join(projectDir, "relatorios", moduleId, slugifyReport(runSlug), "report.md");
}

export function browserPrompt(reportMd, projectDir) {
  return {
    recommended: true,
    message: REPORT_BROWSER_PROMPT_MESSAGE,
    report_md: path.relative(projectDir, reportMd),
    open_with: "project-browser",
  };
}

export function attachReportPrompt(data, reportMd, projectDir) {
  return {
    ...data,
    report_md: path.relative(projectDir, reportMd),
    browser_prompt: browserPrompt(reportMd, projectDir),
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatLogFileRefs(files) {
  if (!files.length) return "n/a";
  return files.map((file) => {
    const normalized = String(file).replace(/\\/g, "/").replace(/\.md$/, "");
    if (
      normalized.startsWith("workbench/") ||
      normalized.startsWith("artifacts/") ||
      normalized.startsWith("relatorios/") ||
      normalized.startsWith("../") ||
      normalized.startsWith("sources/") ||
      normalized.startsWith("audits/") ||
      normalized.startsWith("keywords/") ||
      normalized.startsWith("clusters/") ||
      normalized.includes(".")
    ) {
      return file;
    }
    return `[[${normalized}]]`;
  }).join(", ");
}

export function appendReportLog(projectDir, { title, files, summary, approval = "agent" }) {
  const brainLog = path.join(projectDir, "brain", "log.md");
  fs.mkdirSync(path.dirname(brainLog), { recursive: true });
  const links = formatLogFileRefs(files || []);
  const aprovador = approval && approval !== "not-required" && approval !== "pending" ? approval : "agent";
  const lines = [
    "",
    "",
    `## ${today()} - ${title}`,
    "",
    "- tipo: decisao",
    `- escopo: ${links}`,
    `- decisao: ${summary}`,
    `- evidencia: ${links}`,
    `- aprovador: ${aprovador}`,
  ];
  fs.appendFileSync(brainLog, `${lines.join("\n")}\n`, "utf8");
}
