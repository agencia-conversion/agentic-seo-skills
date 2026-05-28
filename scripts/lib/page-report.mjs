#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import sharedModules from "../../shared/report-modules.js";
import companionRoutes from "../../shared/companion-routes.js";

const {
  REPORT_BROWSER_PROMPT_MESSAGE: SHARED_PROMPT,
  REPORT_MODULE_IDS: SHARED_IDS,
  REPORT_DIR_NAME: SHARED_DIR,
} = sharedModules;
const { companionTargetForPath } = companionRoutes;

export const REPORT_BROWSER_PROMPT_MESSAGE = SHARED_PROMPT;

export const REPORT_DIR_NAME = SHARED_DIR;

export const REPORT_MODULE_IDS = new Set(SHARED_IDS);

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
  return path.join(projectDir, REPORT_DIR_NAME, moduleId, slugifyReport(runSlug), "report.md");
}

export function browserPrompt(reportMd, projectDir) {
  const reportRel = path.relative(projectDir, reportMd).replace(/\\/g, "/");
  return {
    recommended: true,
    message: REPORT_BROWSER_PROMPT_MESSAGE,
    report_md: reportRel,
    ...companionTargetForPath(reportRel),
    open_with: "project-browser",
  };
}

export function attachReportPrompt(data, reportMd, projectDir) {
  const reportRel = path.relative(projectDir, reportMd).replace(/\\/g, "/");
  return {
    ...data,
    report_md: reportRel,
    ...companionTargetForPath(reportRel),
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
      normalized.startsWith(`${REPORT_DIR_NAME}/`) ||
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
  const approver = approval && approval !== "not-required" && approval !== "pending" ? approval : "agent";
  const lines = [
    "",
    "",
    `## ${today()} - ${title}`,
    "",
    "- type: decision",
    `- scope: ${links}`,
    `- decision: ${summary}`,
    `- evidence: ${links}`,
    `- approver: ${approver}`,
  ];
  fs.appendFileSync(brainLog, `${lines.join("\n")}\n`, "utf8");
}
