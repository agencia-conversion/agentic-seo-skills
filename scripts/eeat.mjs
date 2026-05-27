#!/usr/bin/env node
// CLI for the /agentic-seo:eeat skill engine.
// Subcommands: init, validate, consensus.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRaterOutput } from "./lib/eeat/validate.mjs";
import { normalizeRaterOutput } from "./lib/eeat/scoring.mjs";
import { buildReport } from "./lib/eeat/build-report.mjs";
import { renderMarkdown } from "./lib/eeat/render.mjs";
import { renderMarkdownReport } from "./lib/markdown-report.mjs";
import { appendReportLog, attachReportPrompt, reportMarkdownPath } from "./lib/page-report.mjs";
import { writeReportOrThrow } from "./lib/report-writer.mjs";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i += 1; }
    } else out._.push(tok);
  }
  return out;
}

function fail(msg, code = 1) {
  process.stderr.write(JSON.stringify({ ok: false, error: msg }) + "\n");
  process.exit(code);
}

function ok(payload) {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}
function writeText(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, "utf8");
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function projectDir(cwd) {
  const env = process.env.AGENTIC_SEO_PROJECT_DIR;
  if (env) return path.resolve(env);
  return path.resolve(cwd, "project");
}

function slugify(s) {
  return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "target";
}

function stamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function companionReportPath(proj, runId) {
  return reportMarkdownPath(proj, "eeat", runId);
}

const EEAT_PILLARS = ["experience", "expertise", "authoritativeness", "trust"];
const EEAT_PILLAR_LABELS = {
  experience: "Experience",
  expertise: "Expertise",
  authoritativeness: "Authoritativeness",
  trust: "Trust",
};

function naturalIdCompare(a, b) {
  const ra = String(a.id || "").match(/^([a-z]+)(\d+)$/i);
  const rb = String(b.id || "").match(/^([a-z]+)(\d+)$/i);
  if (ra && rb && ra[1] === rb[1]) return Number(ra[2]) - Number(rb[2]);
  return String(a.id || "").localeCompare(String(b.id || ""));
}

function reportTable(columns, rows) {
  const normalizedColumns = columns.map((label, index) => ({
    key: String(label || `c${index}`).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `c${index}`,
    label: String(label || `Coluna ${index + 1}`),
  }));
  const normalizedRows = rows.map((row) => Object.fromEntries(normalizedColumns.map((column, index) => [column.key, String(row?.[index] ?? "")])));
  return ["```agentic-table", YAML.stringify({ version: 1, columns: normalizedColumns, rows: normalizedRows }, { lineWidth: 0 }).replace(/\s+$/, ""), "```"].join("\n");
}

function friendlySeverity(value) {
  const labels = { critical: "crítico", high: "alto", medium: "médio", low: "baixo", warning: "atenção" };
  return labels[String(value || "").toLowerCase()] || String(value || "não informado").replace(/_/g, " ");
}

function friendlyState(value) {
  const labels = { met: "atendido", partially_met: "parcial", not_met: "não atendido", unknown: "não informado", expected: "esperado" };
  return labels[String(value || "").toLowerCase()] || String(value || "não informado").replace(/_/g, " ");
}

function friendlyIssue(value) {
  return String(value || "item").replace(/_/g, " ");
}

function renderCompanionReport(report) {
  const target = report.target?.mode === "url" ? report.target.value : "brain do projeto";
  const pillarRows = EEAT_PILLARS.map((pillar) => [
    EEAT_PILLAR_LABELS[pillar],
    report.numeric_scores?.[pillar] == null ? "não informado" : report.numeric_scores[pillar].toFixed(1),
  ]);
  const issueRows = (report.issues || []).map((issue) => [
    friendlySeverity(issue.severity),
    friendlyIssue(issue.issue_type),
    friendlyIssue(issue.criterion_id),
    friendlyIssue(issue.page_type),
    issue.recommendation || "Sem recomendação registrada.",
    issue.evidence || "Sem evidência compacta registrada.",
  ]);
  const evidenceRows = EEAT_PILLARS.flatMap((pillar) =>
    [...(report.checklist_consensus?.[pillar] || [])].sort(naturalIdCompare).map((item) => [
      EEAT_PILLAR_LABELS[pillar],
      item.label || friendlyIssue(item.id),
      friendlyState(item.applicability),
      friendlyState(item.consensus_state),
      item.criterion_score == null ? "não informado" : item.criterion_score,
      item.evidence_quotes?.[0]?.quote || "Sem citação curta registrada.",
    ])
  );
  return renderMarkdownReport({
    title: `E-E-A-T — ${report.run_id || "relatório"}`,
    slug: slugify(report.run_id || "eeat"),
    reportType: "eeat",
    generatedAt: new Date().toISOString(),
    status: "ready",
    sourceArtifact: `workbench/eeat/${report.run_id}/report.json`,
    summary: `Score ${report.score ?? "unknown"}; qualidade ${report.page_quality ?? "unknown"}.`,
    score: report.score,
    locale: "pt-BR",
    kpis: [
      { label: "Score", value: report.score == null ? "não informado" : `${report.score}/100`, detail: `Qualidade: ${report.page_quality ?? "não informada"}`, tone: Number(report.score || 0) >= 80 ? "good" : "warn" },
      { label: "Tipo de página", value: friendlyIssue(report.page_type || "homepage"), tone: "info" },
      { label: "YMYL", value: report.ymyl ? "sim" : "não", tone: report.ymyl ? "warn" : "info" },
      { label: "Issues", value: String((report.issues || []).length), tone: (report.issues || []).length ? "warn" : "good" },
    ],
    charts: [{
      title: "Score por pilar",
      description: "Leitura consolidada dos pilares E-E-A-T.",
      type: "bar",
      data: {
        labels: EEAT_PILLARS.map((pillar) => EEAT_PILLAR_LABELS[pillar]),
        datasets: [{ label: "Score", data: EEAT_PILLARS.map((pillar) => report.numeric_scores?.[pillar] || 0), backgroundColor: "#3a5bd9" }],
      },
    }],
    leadSections: [{
      heading: "Resumo executivo",
      body_markdown: `A análise E-E-A-T avaliou **${target}** e chegou a **${report.score ?? "score não informado"}/100**. O relatório visual resume os sinais principais; a evidência auditável completa permanece no artefato técnico.`,
    }],
    sections: [
      { heading: "Análise", body_markdown: report.consolidated_narrative || "_Narrativa consolidada ainda não foi sintetizada._" },
      { heading: "Score por pilar", body_markdown: reportTable(["Pilar", "Score"], pillarRows) },
      { heading: "Issues priorizadas", body_markdown: issueRows.length ? reportTable(["Severidade", "Tipo", "Critério", "Página", "Recomendação", "Evidência"], issueRows) : "Nenhuma issue estruturada." },
      { heading: "Evidência por pilar", body_markdown: evidenceRows.length ? reportTable(["Pilar", "Check", "Aplicabilidade", "Estado", "Score", "Evidência"], evidenceRows) : "Nenhuma evidência estruturada." },
      { heading: "Limitações", body_markdown: (report.limitations || []).length ? (report.limitations || []).map((item) => `- ${item}`).join("\n") : "Nenhuma limitação registrada." },
    ],
  }, { locale: "pt-BR" });
}

function defaultPagesForBrain(projDir) {
  return [
    { id: "brain/identidade", path: "brain/identidade.md", page_type: "about" },
    { id: "brain/index", path: "brain/index.md", page_type: "homepage" },
    { id: "brain/topic-clusters", path: "brain/topic-clusters.md", page_type: "service" },
    { id: "brain/voz", path: "brain/voz.md", page_type: "policy" },
    { id: "brain/tecnologia", path: "brain/tecnologia.md", page_type: "policy" },
  ].filter((p) => fs.existsSync(path.join(projDir, p.path)));
}

function defaultPagesForUrl(rootUrl) {
  const u = new URL(rootUrl);
  const base = `${u.protocol}//${u.host}`;
  return [
    { id: "home", url: base, page_type: "homepage" },
    { id: "about", page_type: "about", candidates: [`${base}/sobre/`, `${base}/quem-somos/`, `${base}/about/`, `${base}/about-us/`] },
    { id: "contact", page_type: "contact", candidates: [`${base}/contato/`, `${base}/contact/`, `${base}/fale-conosco/`] },
    { id: "privacy", page_type: "policy", candidates: [`${base}/politica-de-privacidade/`, `${base}/privacy/`, `${base}/privacy-policy/`] },
    { id: "terms", page_type: "policy", candidates: [`${base}/termos/`, `${base}/termos-de-uso/`, `${base}/terms/`] },
    { id: "blog_index", page_type: "article", candidates: [`${base}/blog/`, `${base}/news/`, `${base}/insights/`, `${base}/artigos/`] },
    { id: "blog_sample_a", page_type: "article", candidates: [], note: "rater picks one recent article from the blog index and resolves URL" },
    { id: "blog_sample_b", page_type: "article", candidates: [], note: "rater picks a second article on a different topic for breadth" },
    { id: "cases_or_authors", page_type: "case_study", candidates: [`${base}/cases/`, `${base}/clientes/`, `${base}/work/`, `${base}/autores/`, `${base}/equipe/`, `${base}/team/`] },
  ];
}

function defaultReputationQuery(rootUrl) {
  const u = new URL(rootUrl);
  const brand = u.hostname.replace(/^www\./, "").split(".")[0];
  return `${brand} fundador OR autores OR menções OR review -site:${u.hostname}`;
}

const SUBCOMMANDS = {
  init(args, cwd) {
    const mode = args.mode || (args.url ? "url" : "brain");
    if (!["brain", "url"].includes(mode)) fail("--mode must be brain|url");
    const value = mode === "url" ? args.url : (args.value || path.join(projectDir(cwd), "brain", "identidade.md"));
    if (mode === "url" && !value) fail("--url required for url mode");
    const targetSlug = slugify(args.slug || (mode === "url" ? new URL(value).hostname : "brain"));
    const proj = projectDir(cwd);
    const runId = `${stamp()}-${targetSlug}`;
    const runDir = path.join(proj, "workbench", "eeat", runId);
    fs.mkdirSync(path.join(runDir, "raters"), { recursive: true });
    let pages;
    if (args["pages-file"]) pages = readJson(args["pages-file"]);
    else if (mode === "brain") pages = defaultPagesForBrain(proj);
    else pages = defaultPagesForUrl(value);
    const reputationQuery = mode === "url"
      ? args["reputation-query"] || defaultReputationQuery(value)
      : null;
    const manifest = {
      run_id: runId, run_dir: path.relative(cwd, runDir),
      target: { mode, value },
      pages,
      reputation_query: reputationQuery,
      created_at: new Date().toISOString(),
    };
    writeJson(path.join(runDir, "manifest.json"), manifest);
    ok({ run_id: runId, run_dir: manifest.run_dir, manifest_path: path.relative(cwd, path.join(runDir, "manifest.json")), rater_output_paths: [1, 2, 3].map((n) => path.relative(cwd, path.join(runDir, "raters", `rater-${n}.json`))) });
  },

  validate(args) {
    if (!args["rater-output"]) fail("--rater-output required");
    const data = readJson(args["rater-output"]);
    const errors = validateRaterOutput(data);
    if (errors.length) fail(`invalid: ${errors.join("; ")}`);
    const { rater, adjustments } = normalizeRaterOutput(data);
    ok({ ok: true, adjustments, rater_id: rater.rater_id });
  },

  consensus(args, cwd) {
    if (!args.run) fail("--run required");
    const proj = projectDir(cwd);
    const runDir = path.isAbsolute(args.run) ? args.run : path.join(proj, "workbench", "eeat", args.run);
    const manifest = readJson(path.join(runDir, "manifest.json"));
    const rawRaters = [1, 2, 3].map((n) => readJson(path.join(runDir, "raters", `rater-${n}.json`)));
    const report = buildReport({ manifest, rawRaters, onError: fail });
    const outJson = path.join(runDir, "report.json");
    const outMd = path.join(runDir, "report.md");
    const companionMd = companionReportPath(proj, report.run_id);
    const body = renderMarkdown(report);
    writeJson(outJson, report);
    writeText(outMd, body);
    writeReportOrThrow({
      projectDir: proj,
      moduleId: "eeat",
      runSlug: report.run_id,
      markdown: renderCompanionReport(report),
      sourceArtifactPath: outJson,
      appendLog: false,
    });
    appendReportLog(proj, {
      title: `E-E-A-T ${report.run_id}`,
      files: [path.relative(proj, outJson), path.relative(proj, outMd), path.relative(proj, companionMd)],
      summary: `Consensus E-E-A-T report generated with score ${report.score}/100 and Companion Markdown report.`,
    });
    ok(attachReportPrompt({
      ok: true,
      report_json: path.relative(cwd, outJson),
      workbench_report_md: path.relative(cwd, outMd),
      score: report.score,
      page_quality: report.page_quality,
      narrative_pending: true,
    }, companionMd, proj));
  },

  synthesize(args, cwd) {
    if (!args.run) fail("--run required");
    const proj = projectDir(cwd);
    const runDir = path.isAbsolute(args.run) ? args.run : path.join(proj, "workbench", "eeat", args.run);
    let narrative;
    if (args["narrative-file"]) narrative = fs.readFileSync(args["narrative-file"], "utf8").trim();
    else if (typeof args.narrative === "string") narrative = args.narrative.trim();
    else fail("--narrative-file <path> or --narrative <text> required");
    if (narrative.length < 80) fail("narrative too short — write at least one substantive paragraph (≥80 chars)");
    const reportPath = path.join(runDir, "report.json");
    const report = { ...readJson(reportPath), consolidated_narrative: narrative };
    const body = renderMarkdown(report);
    writeJson(reportPath, report);
    writeText(path.join(runDir, "report.md"), body);
    const companionMd = companionReportPath(proj, report.run_id);
    writeReportOrThrow({
      projectDir: proj,
      moduleId: "eeat",
      runSlug: report.run_id,
      markdown: renderCompanionReport(report),
      sourceArtifactPath: reportPath,
      appendLog: false,
    });
    appendReportLog(proj, {
      title: `E-E-A-T ${report.run_id}`,
      files: [path.relative(proj, reportPath), path.relative(proj, path.join(runDir, "report.md")), path.relative(proj, companionMd)],
      summary: "Narrativa consolidada do relatório E-E-A-T atualizada no Web Companion.",
    });
    ok(attachReportPrompt({ ok: true, run_id: report.run_id, narrative_chars: narrative.length }, companionMd, proj));
  },
};

const argv = process.argv.slice(2);
const sub = argv[0];
const args = parseArgs(argv.slice(1));
if (!sub || !SUBCOMMANDS[sub]) fail(`unknown subcommand: ${sub || ""}. expected: init|validate|consensus|synthesize`);
SUBCOMMANDS[sub](args, process.cwd());
