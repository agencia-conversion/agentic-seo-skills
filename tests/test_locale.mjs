import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  asciiFold,
  slugify,
  normalizeLanguage,
  getProjectLanguage,
  canonicalKeyword,
  formatNumber,
  formatPercent,
  formatCompactNumber,
  SUPPORTED_LANGUAGES,
} from "../shared/locale.mjs";

// asciiFold: diacritics → ASCII; non-letters untouched
assert.equal(asciiFold("Análise técnica"), "Analise tecnica");
assert.equal(asciiFold("Coração"), "Coracao");
assert.equal(asciiFold(""), "");
assert.equal(asciiFold(null), "");
assert.equal(asciiFold("ABC 123 á!"), "ABC 123 a!");

// slugify reuses asciiFold + kebab
assert.equal(slugify("Análise Técnica"), "analise-tecnica");
assert.equal(slugify("SEO Agêntico!"), "seo-agentico");

// normalizeLanguage canonicalises common forms
assert.equal(normalizeLanguage("pt-BR"), "pt-BR");
assert.equal(normalizeLanguage("pt-br"), "pt-BR");
assert.equal(normalizeLanguage("PT"), "pt-BR");
assert.equal(normalizeLanguage("en"), "en");
assert.equal(normalizeLanguage("en-US"), "en");
assert.equal(normalizeLanguage(null), "pt-BR");
assert.equal(normalizeLanguage(""), "pt-BR");
assert.equal(normalizeLanguage("xx"), "pt-BR");
assert.equal(normalizeLanguage("xx", "en"), "en");
assert.ok(SUPPORTED_LANGUAGES.includes("pt-BR"));
assert.ok(SUPPORTED_LANGUAGES.includes("en"));

// getProjectLanguage reads project.json; falls back when missing
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-locale-"));
const projectDir = join(tmp, "project");
mkdirSync(join(projectDir, ".agentic-seo"), { recursive: true });
writeFileSync(join(projectDir, ".agentic-seo", "project.json"), JSON.stringify({ language: "en" }), "utf8");
assert.equal(getProjectLanguage(projectDir), "en");
writeFileSync(join(projectDir, ".agentic-seo", "project.json"), JSON.stringify({ language: "pt-BR" }), "utf8");
assert.equal(getProjectLanguage(projectDir), "pt-BR");
writeFileSync(join(projectDir, ".agentic-seo", "project.json"), JSON.stringify({ language: "xx" }), "utf8");
assert.equal(getProjectLanguage(projectDir), "pt-BR");
writeFileSync(join(projectDir, ".agentic-seo", "project.json"), "not json", "utf8");
assert.equal(getProjectLanguage(projectDir), "pt-BR");
rmSync(tmp, { recursive: true, force: true });
assert.equal(getProjectLanguage(join(tmp, "doesnt-exist")), "pt-BR");

// canonicalKeyword: 4 "landing page" variants collapse to the same key
const landingVariants = [
  "o'que é landing page",
  "o que e landing page",
  "o'que e landing pages",
  "o que é landing page",
];
const canonicalKeys = new Set(landingVariants.map(canonicalKeyword));
assert.equal(canonicalKeys.size, 1, "the four landing-page variants must share one canonical key");

// canonicalKeyword: short tokens (length <= 3) are NOT stripped of trailing s
assert.equal(canonicalKeyword("os carros"), "os carro");
assert.equal(canonicalKeyword("as casas"), "as casa");
// Empty/null safe
assert.equal(canonicalKeyword(""), "");
assert.equal(canonicalKeyword(null), "");

// Distinct keywords stay distinct
assert.notEqual(canonicalKeyword("seo agêntico"), canonicalKeyword("seo técnico"));

// formatNumber: pt-BR uses dot for thousands, comma for decimals
assert.equal(formatNumber(1234.5, "pt-BR"), "1.234,5");
assert.equal(formatNumber(10792, "pt-BR"), "10.792");
assert.equal(formatNumber(1234.5, "en"), "1,234.5");
assert.equal(formatNumber(10792, "en"), "10,792");
assert.equal(formatNumber(null), "—");
assert.equal(formatNumber(undefined), "—");
assert.equal(formatNumber(NaN), "—");
assert.equal(formatNumber("not a number"), "—");
// String coercion
assert.equal(formatNumber("1234", "pt-BR"), "1.234");

// formatPercent: input on the 0..100 scale (consistent with sov_pct)
assert.equal(formatPercent(18, "pt-BR"), "18%");
assert.equal(formatPercent(18.5, "pt-BR"), "18,5%");
assert.equal(formatPercent(94.5, "pt-BR"), "94,5%");
assert.equal(formatPercent(18, "en"), "18%");
assert.equal(formatPercent(null), "—");
assert.equal(formatPercent(0, "pt-BR"), "0%");

// formatCompactNumber: useful for KPI tiles
assert.match(formatCompactNumber(1500, "pt-BR"), /1,?5\s?mil/i);
assert.equal(formatCompactNumber(null), "—");

console.log("locale ok");
