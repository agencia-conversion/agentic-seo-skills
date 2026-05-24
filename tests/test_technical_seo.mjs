import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "agentic-seo");
const tmp = mkdtempSync(resolve(tmpdir(), "agentic-seo-technical-"));
const env = { ...process.env, AGENTIC_SEO_PROJECT_DIR: resolve(tmp, "project") };

execFileSync(bin, ["project-init", "Technical test"], { cwd: root, encoding: "utf8", env });

function runTechnical(fixture, pageType) {
  const stdout = execFileSync(bin, ["technical-seo", "--html-file", resolve(root, fixture), "--page-type", pageType], {
    cwd: root,
    encoding: "utf8",
    env,
  });
  return JSON.parse(stdout);
}

const home = runTechnical("tests/fixtures/technical-seo-home.html", "inicial");
assert.equal(home.page_type, "home");
assert.equal(home.ok, true);
assert.ok(home.score >= 90);
assert.equal(home.browser_prompt.recommended, true);
assert.equal(home.browser_prompt.message, "Posso abrir o Web Companion para você ver a análise?");
assert.ok(home.report_md.endsWith("/report.md"));
assert.ok(home.report_md.startsWith("analises/technical-seo/"));
assert.ok(existsSync(resolve(tmp, "project", home.report_md)));
const totalWeight = home.checks.reduce((sum, check) => sum + check.weight, 0);
const pointsAwarded = home.checks.reduce((sum, check) => sum + check.points_awarded, 0);
assert.equal(home.calculation_memory.formula, "round(sum(points_awarded) / sum(weight) * 100)");
assert.equal(home.calculation_memory.total_weight, totalWeight);
assert.equal(home.calculation_memory.points_awarded, pointsAwarded);
assert.equal(home.calculation_memory.lost_points, totalWeight - pointsAwarded);
assert.equal(home.calculation_memory.checks.length, home.checks.length);
const homeReport = readFileSync(resolve(tmp, "project", home.report_md), "utf8");
assert.match(homeReport, /title: "SEO técnico — Agentic SEO para crescimento orgânico"/);
assert.doesNotMatch(homeReport, /technical-seo-home\.html/);
assert.match(homeReport, /Resumo executivo/);
assert.ok(homeReport.indexOf("## Meta e indexabilidade") > homeReport.indexOf("## Resumo executivo"));
assert.ok(homeReport.indexOf("## Meta e indexabilidade") < homeReport.indexOf("## Prioridades de correção"));
assert.match(homeReport, /Apêndice: memória de cálculo/);
assert.match(homeReport, /```agentic-kpis/);
assert.match(homeReport, /```agentic-chart/);
assert.match(homeReport, /```agentic-table/);
assert.match(homeReport, /version: 1/);
assert.match(homeReport, /role: weight/);
assert.match(homeReport, /role: points/);
assert.match(homeReport, /role: loss/);
assert.doesNotMatch(homeReport, /^# SEO técnico/m);
assert.doesNotMatch(homeReport, /\[\{"level":"h2","text":/);
assert.doesNotMatch(homeReport, /round\(sum\(points_awarded\)/);
assert.doesNotMatch(homeReport, /\{\\?"missing_alt_count\\?":/);
assert.equal(existsSync(resolve(tmp, "project", home.report_md.replace(/report\.md$/, "report.html"))), false);
assert.match(readFileSync(resolve(tmp, "project", "brain", "log.md"), "utf8"), new RegExp(home.report_md.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.equal(home.llm_improvement_context.page_type, "home");
assert.ok(home.checks.every((check) => check.score === 0 || check.score === 100));
const oldScoreField = ["score", "awarded"].join("_");
assert.ok(home.checks.every((check) => !(oldScoreField in check)));
assert.ok(home.checks.every((check) => typeof check.points_awarded === "number"));

const invalid = runTechnical("tests/fixtures/technical-seo-invalid.html", "blog");
assert.equal(invalid.page_type, "blog");
assert.equal(invalid.ok, false);
assert.ok(invalid.score < 70);
assert.ok(invalid.findings.some((finding) => finding.check === "title_present"));
assert.ok(invalid.findings.every((finding) => finding.repair));

const english = execFileSync(bin, ["technical-seo", "--html-file", resolve(root, "tests/fixtures/technical-seo-home.html"), "--page-type", "inicial", "--language", "en"], {
  cwd: root,
  encoding: "utf8",
  env,
});
const englishReportPath = JSON.parse(english).report_md;
const englishReport = readFileSync(resolve(tmp, "project", englishReportPath), "utf8");
assert.match(englishReport, /Executive summary/);
assert.match(englishReport, /Meta and indexability/);
assert.match(englishReport, /Appendix: calculation memory/);
assert.doesNotMatch(englishReport, /The applied formula was/);
assert.doesNotMatch(englishReport, /Resumo executivo/);

const ecommerce = runTechnical("tests/fixtures/technical-seo-ecommerce-product.html", "produto-ecommerce");
assert.equal(ecommerce.page_type, "ecommerce_product");
assert.ok(ecommerce.checks.some((check) => check.id === "product_schema" && check.passed));

const service = runTechnical("tests/fixtures/technical-seo-service.html", "produto-ou-servico");
assert.equal(service.page_type, "service_product");
assert.ok(service.checks.some((check) => check.id === "service_schema" && check.passed));

const about = runTechnical("tests/fixtures/technical-seo-about.html", "quem-somos");
assert.equal(about.page_type, "about");
assert.ok(about.checks.some((check) => check.id === "about_schema" && check.passed));

const technicalSkill = readFileSync(resolve(root, "skills/technical-seo/SKILL.md"), "utf8");
for (const pageType of ["home", "ecommerce_product", "service_product", "blog", "about"]) {
  assert.ok(technicalSkill.includes(pageType), `technical-seo skill missing page type: ${pageType}`);
}
for (const alias of ["inicial", "produto-ecommerce", "produto-ou-servico", "quem-somos"]) {
  assert.ok(technicalSkill.includes(alias), `technical-seo skill missing page alias: ${alias}`);
}

rmSync(tmp, { recursive: true, force: true });
console.log("technical seo ok");
