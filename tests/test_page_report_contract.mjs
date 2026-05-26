import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { buildRater, statesAllPresent } from "./fixtures/eeat/rater-builder.mjs";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "agentic-seo");
const eeatEngine = resolve(root, "scripts", "eeat.mjs");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-page-reports-"));
const projectDir = join(tmp, "project");
const env = { ...process.env, AGENTIC_SEO_PROJECT_DIR: projectDir, DATAFORSEO_LOGIN: "test-login", DATAFORSEO_PASSWORD: "test-password" };

function run(args) {
  const stdout = execFileSync(bin, args, { cwd: root, encoding: "utf8", env });
  return JSON.parse(stdout);
}

function runNode(script, args) {
  const stdout = execFileSync("node", [script, ...args], { cwd: root, encoding: "utf8", env });
  return JSON.parse(stdout);
}

function bypassArgs(reason) {
  return [
    "--dataforseo-bypass-confirmed",
    "--dataforseo-bypass-reason",
    reason,
    "--dataforseo-bypass-approved-by",
    "Page Report Test",
    "--dataforseo-bypass-confirmation-text",
    "Confirmo seguir sem DataForSEO neste teste de contrato.",
    "--dataforseo-bypass-confirmed-at",
    "2026-05-23T00:00:00+00:00",
  ];
}

function assertReport(result, moduleId) {
  assert.ok(result.report_md, `${moduleId} missing report_md`);
  assert.ok(result.report_md.startsWith(join("analyses", moduleId)), `${moduleId} report path mismatch`);
  assert.equal(result.browser_prompt?.recommended, true);
  assert.equal(result.browser_prompt.message, "Posso abrir o Web Companion para você ver a análise?");
  assert.equal(existsSync(join(projectDir, result.report_md)), true, `${moduleId} report file missing`);
  assert.equal(result.report_html, undefined, `${moduleId} returned report_html`);
  const text = readFileSync(join(projectDir, result.report_md), "utf8");
  assert.doesNotMatch(text.replace(/^---\n[\s\S]*?\n---\n?/, ""), /^#\s+/m, `${moduleId} body must not contain H1`);
  assert.doesNotMatch(text, /\[object Object\]/);
  assert.doesNotMatch(text, /round\(sum\(points_awarded\)/);
  assert.match(text, /source_artifact:/);
  assert.match(text, /```agentic-/);
  assert.match(text, /version: 1/);
  assert.equal(existsSync(join(projectDir, result.report_md.replace(/report\.md$/, "report.html"))), false);
}

try {
  run(["project-init", "Page reports"]);

  const keyword = run(["keyword-research", "--keyword", "seo agêntico", "--mode", "offline"]);
  assertReport(keyword, "keyword-research");

  const serp = run(["serp-extract", "--keyword", "seo agêntico", "--mode", "offline"]);
  assertReport(serp, "serp-extract");

  const serpDir = join(projectDir, "sources", "serp");
  mkdirSync(serpDir, { recursive: true });
  writeFileSync(join(serpDir, "99999999-999999-seo-agentico.normalized.yaml"), YAML.stringify({
    keyword: "seo agêntico",
    provider: "dataforseo",
    mode: "offline-fixture",
    timestamp: new Date().toISOString(),
    location: "Brazil",
    language: "pt",
    device: "desktop",
    organic_results: [
      { rank_absolute: 1, rank_group: 1, title: "SEO agêntico guia", url: "https://example.com/a", domain: "example.com", snippet: "Guia de SEO agêntico." },
      { rank_absolute: 2, rank_group: 2, title: "SEO agêntico exemplos", url: "https://example.org/b", domain: "example.org", snippet: "Exemplos de SEO agêntico." },
      { rank_absolute: 3, rank_group: 3, title: "SEO agêntico tecnologia", url: "https://example.net/c", domain: "example.net", snippet: "Tecnologia para SEO agêntico." },
      { rank_absolute: 4, rank_group: 4, title: "Agentes para busca", url: "https://example.edu/d", domain: "example.edu", snippet: "Agentes aplicados à busca." },
      { rank_absolute: 5, rank_group: 5, title: "IA em SEO", url: "https://example.io/e", domain: "example.io", snippet: "IA e SEO técnico." },
    ],
    serp_features: ["people_also_ask"],
  }, { lineWidth: 0 }));
  const seo = run(["seo-analysis", "--keyword", "seo agêntico"]);
  assertReport(seo, "seo-analysis");

  const topic = run(["topic-cluster", "--seed", "seo agêntico", "--hypothesis-only", ...bypassArgs("teste de contrato sem DataForSEO")]);
  assertReport(topic, "topic-cluster");

  const backlink = run(["backlink-analysis", "--target", "example.com", "--mode", "offline"]);
  assertReport(backlink, "backlink-analysis");

  const technical = run(["technical-seo", "--html-file", resolve(root, "tests", "fixtures", "technical-seo-valid.html"), "--page-type", "blog-post"]);
  assertReport(technical, "technical-seo");
  assert.match(readFileSync(join(projectDir, technical.report_md), "utf8"), /role: weight/);

  const internal = run(["internal-links", "--pages-file", resolve(root, "tests", "fixtures", "internal-links-pages.json"), "--target", "/seo-agentico/", "--topic", "SEO agêntico"]);
  assertReport(internal, "internal-links");
  assert.equal(internal.recommendations.length, 1);
  assert.equal(internal.blocked_candidates.some((item) => /Já existe link/.test(item.reason)), true);

  const init = runNode(eeatEngine, ["init", "--mode", "brain", "--slug", "contract"]);
  for (const [i, outPath] of init.rater_output_paths.entries()) {
    const rater = buildRater({ raterId: `rater-${i + 1}`, states: statesAllPresent() });
    writeFileSync(resolve(root, outPath), JSON.stringify(rater, null, 2), "utf8");
  }
  const eeat = runNode(eeatEngine, ["consensus", "--run", init.run_id]);
  assertReport(eeat, "eeat");

  const competitive = run(["competitive-analysis", "--target", "example.com", "--competitors", "competitor-a.com", "--offline"]);
  assertReport(competitive, "competitive-analysis");
  assert.ok(Array.isArray(competitive.modules_run) && competitive.modules_run.length > 0, "competitive-analysis must report modules_run");
  assert.equal(competitive.log_appended, true, "competitive-analysis must append a brain log entry");

  const review = spawnSync("node", [resolve(root, "scripts", "review_reports.mjs"), projectDir], { cwd: root, encoding: "utf8" });
  assert.equal(review.status, 0, review.stderr || review.stdout);

  console.log("page report contract ok");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
