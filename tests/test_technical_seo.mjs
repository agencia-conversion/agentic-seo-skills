import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "seo-brain");

function runTechnical(fixture, pageType) {
  const stdout = execFileSync(bin, ["technical-seo", "--html-file", resolve(root, fixture), "--page-type", pageType], {
    cwd: root,
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

const home = runTechnical("tests/fixtures/technical-seo-home.html", "inicial");
assert.equal(home.page_type, "home");
assert.equal(home.ok, true);
assert.ok(home.score >= 90);
assert.equal(home.llm_improvement_context.page_type, "home");

const invalid = runTechnical("tests/fixtures/technical-seo-invalid.html", "blog");
assert.equal(invalid.page_type, "blog");
assert.equal(invalid.ok, false);
assert.ok(invalid.score < 70);
assert.ok(invalid.findings.some((finding) => finding.check === "title_present"));
assert.ok(invalid.findings.every((finding) => finding.repair));

const ecommerce = runTechnical("tests/fixtures/technical-seo-ecommerce-product.html", "produto-ecommerce");
assert.equal(ecommerce.page_type, "ecommerce_product");
assert.ok(ecommerce.checks.some((check) => check.id === "product_schema" && check.passed));

const service = runTechnical("tests/fixtures/technical-seo-service.html", "produto-ou-servico");
assert.equal(service.page_type, "service_product");
assert.ok(service.checks.some((check) => check.id === "service_schema" && check.passed));

const about = runTechnical("tests/fixtures/technical-seo-about.html", "quem-somos");
assert.equal(about.page_type, "about");
assert.ok(about.checks.some((check) => check.id === "about_schema" && check.passed));

assert.ok(readFileSync(resolve(root, "skills/technical-seo/SKILL.md"), "utf8").includes("home, ecommerce_product, service_product, blog, about"));

console.log("technical seo ok");
