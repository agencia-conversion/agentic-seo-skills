#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { parseFrontmatter, reviewReportMarkdown } from "./report-contract.mjs";
import { appendReportLog, reportMarkdownPath } from "./page-report.mjs";

function normalizeRel(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function sourceRel(projectDir, sourceArtifactPath) {
  if (!sourceArtifactPath) return null;
  const absolute = path.isAbsolute(sourceArtifactPath) ? sourceArtifactPath : path.join(projectDir, sourceArtifactPath);
  return normalizeRel(path.relative(projectDir, absolute));
}

export function writeReportOrThrow({
  projectDir,
  moduleId,
  runSlug,
  markdown,
  sourceArtifactPath,
  appendLog = true,
  logTitle,
  logSummary,
  approval = "agent",
}) {
  if (!projectDir) throw new Error("projectDir is required.");
  if (!moduleId) throw new Error("moduleId is required.");
  if (!runSlug) throw new Error("runSlug is required.");
  if (typeof markdown !== "string" || !markdown.trim()) throw new Error("markdown is required.");

  const absoluteProjectDir = path.resolve(projectDir);
  const reportMd = reportMarkdownPath(absoluteProjectDir, moduleId, runSlug);
  const parsed = parseFrontmatter(markdown);
  const expectedSourceRel = sourceRel(absoluteProjectDir, sourceArtifactPath);
  if (expectedSourceRel && normalizeRel(parsed.data?.source_artifact) !== expectedSourceRel) {
    throw new Error(`Report source_artifact must be ${expectedSourceRel}; got ${parsed.data?.source_artifact || "(missing)"}.`);
  }

  const review = reviewReportMarkdown({ markdown, file: reportMd, projectDir: absoluteProjectDir });
  if (!review.ok) {
    const lines = review.errors.map((error) => `${error.code}: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
    throw new Error(`Report contract failed before write:\n${lines.join("\n")}`);
  }

  fs.mkdirSync(path.dirname(reportMd), { recursive: true });
  fs.writeFileSync(reportMd, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");

  if (appendLog) {
    const reportRel = normalizeRel(path.relative(absoluteProjectDir, reportMd));
    appendReportLog(absoluteProjectDir, {
      title: logTitle || `Relatório ${moduleId} ${runSlug}`,
      files: [expectedSourceRel, reportRel].filter(Boolean),
      summary: logSummary || `Relatório ${moduleId} validado pelo contrato de módulo e gravado no Web Companion.`,
      approval,
    });
  }

  return { ok: true, report_md: normalizeRel(path.relative(absoluteProjectDir, reportMd)), review };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function readStdin() {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  const markdown = args.markdownFile ? fs.readFileSync(args.markdownFile, "utf8") : await readStdin();
  try {
    const result = writeReportOrThrow({
      projectDir: path.resolve(args.project || process.env.AGENTIC_SEO_PROJECT_DIR || "project"),
      moduleId: args.module,
      runSlug: args.slug,
      markdown,
      sourceArtifactPath: args.sourceArtifact,
      appendLog: !args.noLog,
      logTitle: args.logTitle,
      logSummary: args.logSummary,
      approval: args.approval || "agent",
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`);
    process.exit(1);
  }
}
