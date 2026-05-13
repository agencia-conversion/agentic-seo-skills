#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = join(HERE, "..", "..", "apps", "companion", "public", "brand");

const ICON_SVG = readFileSync(join(BRAND_DIR, "icon.svg"), "utf8").trim();
const CONVERSION_SVG = readFileSync(join(BRAND_DIR, "conversion-logo-sidebar.svg"), "utf8").trim();

const TOKENS = {
  agenticBlue: "#3a5bd9",
  text: "#37352F",
  textMuted: "#787774",
  bg: "#FFFFFF",
  border: "rgba(55, 53, 47, 0.09)",
  surface: "rgba(55, 53, 47, 0.04)",
};

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = `'Space Grotesk', ${SANS}`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripUnsafe(html) {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
}

function styleBlock() {
  return `:root{--agentic-blue:${TOKENS.agenticBlue};--report-text:${TOKENS.text};--report-text-muted:${TOKENS.textMuted};--report-bg:${TOKENS.bg};--report-border:${TOKENS.border};--report-surface:${TOKENS.surface};}
*{box-sizing:border-box}
html{font-size:16.5px}
body{margin:0;background:var(--report-bg);color:var(--report-text);font-family:${SANS};-webkit-font-smoothing:antialiased}
.page{max-width:880px;margin:0 auto;padding:48px 32px 64px}
header{display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;border-bottom:1px solid var(--report-border)}
.brand{display:flex;align-items:center;gap:12px}
.brand .icon{width:32px;height:32px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center}
.brand .icon svg{width:100%;height:100%}
.brand .wordmark{font-family:${DISPLAY};font-weight:600;font-size:18px;letter-spacing:-.5px;text-transform:lowercase}
header .meta{color:var(--report-text-muted);font-size:13px;font-variant-numeric:tabular-nums}
h1.report-title{font-family:${DISPLAY};font-weight:700;font-size:2.25rem;line-height:1.15;margin:40px 0 8px}
.report-subtitle{color:var(--report-text-muted);font-size:1rem;margin:0 0 32px}
section.report-section{margin:32px 0}
section.report-section h2{font-family:${DISPLAY};font-weight:600;font-size:1.375rem;margin:0 0 12px}
section.report-section .body{line-height:1.6}
section.report-section .body p{margin:.5em 0}
section.report-section .body a{color:var(--agentic-blue);text-underline-offset:2px}
section.report-section .body table{border-collapse:collapse;width:100%;margin:12px 0}
section.report-section .body th,section.report-section .body td{border:1px solid var(--report-border);padding:8px 12px;text-align:left;vertical-align:top}
section.report-section .body th{background:var(--report-surface);font-weight:600}
section.report-section .body code{background:var(--report-surface);padding:2px 6px;border-radius:3px;font-size:.85em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
section.report-section .body pre{background:var(--report-surface);padding:16px;border-radius:6px;overflow-x:auto;font-size:.85em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
section.report-section .body blockquote{border-left:3px solid var(--agentic-blue);padding-left:1rem;margin:1rem 0;color:var(--report-text)}
footer{margin-top:64px;padding-top:24px;border-top:1px solid var(--report-border);display:flex;align-items:center;justify-content:space-between;color:var(--report-text-muted);font-size:12px}
footer .by{display:flex;align-items:center;gap:8px}
footer .by .conversion{width:90px;height:14px;color:var(--report-text-muted);display:inline-flex;align-items:center}
footer .by .conversion svg{width:100%;height:100%}
@media (prefers-color-scheme:dark){:root{--report-bg:#191919;--report-text:#D1D1D1;--report-text-muted:#9B9B9B;--report-border:rgba(255,255,255,.09);--report-surface:rgba(255,255,255,.06)}}
@media print{body{background:#fff}header,footer{border-color:#ddd}}`;
}

function renderSection(section) {
  const heading = escapeHtml(section?.heading);
  const body = stripUnsafe(section?.body_html);
  return `<section class="report-section"><h2>${heading}</h2><div class="body">${body}</div></section>`;
}

export function renderHtmlReport(input = {}) {
  const title = input.title || "Relatório Agentic SEO";
  const subtitle = input.subtitle || "";
  const generatedAt = input.generatedAt || new Date().toISOString();
  const sections = Array.isArray(input.sections) ? input.sections : [];

  const head = `<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="generator" content="Agentic SEO"/>
<title>${escapeHtml(title)}</title>
<style>${styleBlock()}</style>
</head>`;

  const header = `<header>
<div class="brand">
<span class="icon" aria-hidden="true">${ICON_SVG}</span>
<span class="wordmark">agentic seo</span>
</div>
<div class="meta">${escapeHtml(generatedAt)}</div>
</header>`;

  const titleBlock = `<h1 class="report-title">${escapeHtml(title)}</h1>${
    subtitle ? `<p class="report-subtitle">${escapeHtml(subtitle)}</p>` : ""
  }`;

  const body = sections.map(renderSection).join("\n");

  const footer = `<footer>
<span class="by"><span>by</span><span class="conversion" aria-label="Conversion">${CONVERSION_SVG}</span></span>
<span>Gerado em ${escapeHtml(generatedAt)}</span>
</footer>`;

  return `<!doctype html>
<html lang="pt-BR">
${head}
<body>
<div class="page">
${header}
${titleBlock}
${body}
${footer}
</div>
</body>
</html>
`;
}

async function readStdin() {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const text = await readStdin();
  let payload = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      process.stderr.write(`html-report: invalid JSON on stdin: ${err.message}\n`);
      process.exit(2);
    }
  }
  process.stdout.write(renderHtmlReport(payload));
}
