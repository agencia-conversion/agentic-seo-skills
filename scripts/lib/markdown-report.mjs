#!/usr/bin/env node

import YAML from "yaml";
import { normalizeLanguage } from "../../shared/locale.mjs";

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function safeYaml(value) {
  return YAML.stringify(value ?? null, { lineWidth: 0 }).replace(/\s+$/, "");
}

function reportLocale(value) {
  return normalizeLanguage(value);
}

function reportText(locale, pt, en) {
  return reportLocale(locale) === "pt-BR" ? pt : en;
}

function frontmatter(input) {
  const fields = {
    title: input.title || "Relatório Agentic SEO",
    slug: input.slug || "relatorio",
    report_type: input.reportType || input.report_type || "unknown",
    generated_at: input.generatedAt || input.generated_at || new Date().toISOString(),
    status: input.status || "ready",
    source_artifact: input.sourceArtifact || input.source_artifact || "",
    summary: input.summary || input.subtitle || "",
  };
  if (input.score !== undefined && input.score !== null) fields.score = input.score;
  return ["---", ...Object.entries(fields).map(([key, value]) => `${key}: ${yamlString(value)}`), "---", ""].join("\n");
}

function fenced(kind, value) {
  return ["```" + kind, safeYaml(value), "```"].join("\n");
}

function cleanInlineMarkdown(text) {
  const lines = String(text || "").split("\n");
  let inFence = false;
  return lines
    .map((line) => {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/\*\*/g, "").replace(/`([^`]+)`/g, "$1");
    })
    .join("\n");
}

function renderSections(sections, locale) {
  if (!Array.isArray(sections)) return "";
  return sections
    .map((section) => {
      const heading = section?.heading || reportText(locale, "Seção", "Section");
      const body = cleanInlineMarkdown(section?.body_markdown || section?.body_md || section?.body || "").trim();
      return [`## ${heading}`, "", body || reportText(locale, "Sem conteúdo registrado.", "No content recorded.")].join("\n");
    })
    .join("\n\n");
}

export function renderMarkdownReport(input = {}, options = {}) {
  const locale = reportLocale(options.locale || input.locale);
  const subtitle = input.subtitle || input.summary || "";
  const lines = [frontmatter(input)];
  if (subtitle) lines.push(subtitle, "");
  const leadSections = renderSections(input.leadSections || input.lead_sections, locale);
  if (leadSections) lines.push(leadSections, "");
  if (Array.isArray(input.kpis) && input.kpis.length) lines.push(fenced("agentic-kpis", { version: 1, items: input.kpis }), "");
  if (Array.isArray(input.charts)) {
    for (const chart of input.charts) lines.push(fenced("agentic-chart", { version: 1, ...chart }), "");
  }
  const sections = renderSections(input.sections, locale);
  if (sections) lines.push(sections, "");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
}

async function readStdin() {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const isCli = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isCli) {
  const text = await readStdin();
  let payload = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      process.stderr.write(`markdown-report: invalid JSON on stdin: ${err.message}\n`);
      process.exit(2);
    }
  }
  process.stdout.write(renderMarkdownReport(payload));
}
