#!/usr/bin/env node
// CLI for the /seo-brain:eeat skill engine.
// Subcommands: init, validate, consensus.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRaterOutput } from "./lib/eeat/validate.mjs";
import { normalizeRaterOutput } from "./lib/eeat/scoring.mjs";
import { buildReport } from "./lib/eeat/build-report.mjs";
import { renderMarkdown } from "./lib/eeat/render.mjs";

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

function projectDir(cwd) {
  const env = process.env.SEO_BRAIN_PROJECT_DIR;
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

function defaultPagesForBrain(projDir) {
  return [
    { id: "brain/identidade", path: "brain/identidade.md", page_type: "about" },
    { id: "brain/index", path: "brain/index.md", page_type: "homepage" },
    { id: "brain/editorial", path: "brain/editorial.md", page_type: "service" },
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
    const mode = args.mode || (args.url ? "url" : "wiki");
    if (!["wiki", "url"].includes(mode)) fail("--mode must be wiki|url");
    const value = mode === "url" ? args.url : (args.value || path.join(projectDir(cwd), "wiki", "eeat.md"));
    if (mode === "url" && !value) fail("--url required for url mode");
    const targetSlug = slugify(args.slug || (mode === "url" ? new URL(value).hostname : "brain"));
    const proj = projectDir(cwd);
    const runId = `${stamp()}-${targetSlug}`;
    const runDir = path.join(proj, "workbench", "eeat", runId);
    fs.mkdirSync(path.join(runDir, "raters"), { recursive: true });
    let pages;
    if (args["pages-file"]) pages = readJson(args["pages-file"]);
    else if (mode === "brain" || mode === "wiki") pages = defaultPagesForBrain(proj);
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
    writeJson(outJson, report);
    writeText(outMd, renderMarkdown(report));
    ok({ ok: true, report_json: path.relative(cwd, outJson), report_md: path.relative(cwd, outMd), score: report.score, page_quality: report.page_quality, narrative_pending: true });
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
    writeJson(reportPath, report);
    writeText(path.join(runDir, "report.md"), renderMarkdown(report));
    ok({ ok: true, run_id: report.run_id, narrative_chars: narrative.length });
  },
};

const argv = process.argv.slice(2);
const sub = argv[0];
const args = parseArgs(argv.slice(1));
if (!sub || !SUBCOMMANDS[sub]) fail(`unknown subcommand: ${sub || ""}. expected: init|validate|consensus|synthesize`);
SUBCOMMANDS[sub](args, process.cwd());
