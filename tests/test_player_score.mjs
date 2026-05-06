import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "seo-brain");
const tmp = mkdtempSync(resolve(tmpdir(), "seo-brain-player-score-"));
const project = resolve(tmp, "project");
const env = { ...process.env, SEO_BRAIN_PROJECT_DIR: project };
const keyword = "seo player score";
const sourceDir = resolve(project, "sources", "websearch");

execFileSync(bin, ["project-init", "Player score test"], { cwd: root, encoding: "utf8", env });
mkdirSync(sourceDir, { recursive: true });

const fixtures = JSON.stringify({
  "https://competitor.example/seo-player-score": "tests/fixtures/player-score-strong.html",
  "https://target.example/seo-player-score": "tests/fixtures/player-score-target.html",
  "https://target.example/other": "tests/fixtures/player-score-weak.html",
  "https://target.example/wanted": "tests/fixtures/player-score-target.html",
  "https://weak.example/page": "tests/fixtures/player-score-weak.html",
});

function writeSerp(results) {
  writeFileSync(resolve(sourceDir, "seo-player-score.json"), JSON.stringify({ keyword, results }, null, 2), "utf8");
}

function run(targetUrl) {
  const stdout = execFileSync(
    bin,
    [
      "seo-analysis",
      "--keyword",
      keyword,
      "--provider",
      "websearch",
      "--player-score",
      "--target-url",
      targetUrl,
      "--page-type",
      "blog",
      "--players-limit",
      "3",
      "--page-fixtures",
      fixtures,
    ],
    { cwd: root, encoding: "utf8", env },
  );
  return JSON.parse(stdout);
}

function runDomain(targetDomain) {
  const stdout = execFileSync(
    bin,
    [
      "seo-analysis",
      "--keyword",
      keyword,
      "--provider",
      "websearch",
      "--player-score",
      "--target-domain",
      targetDomain,
      "--page-type",
      "blog",
      "--players-limit",
      "3",
      "--page-fixtures",
      fixtures,
    ],
    { cwd: root, encoding: "utf8", env },
  );
  return JSON.parse(stdout);
}

function assertNamedScores0To100(value, path = "report") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key === "score" && typeof child === "number") {
      assert.ok(child >= 0 && child <= 100, `${childPath} must be 0-100`);
    }
    assertNamedScores0To100(child, childPath);
  }
}

function assertScoreBounds(report) {
  assert.equal(report.score_model.version, "player-score-v1");
  assert.ok(report.serp_terms.length > 0);
  assertNamedScores0To100(report);
  for (const player of report.player_scores) {
    assert.ok(player.score.deterministic.score <= 100);
    assert.ok(player.score.deterministic.weighted_points <= 70);
    assert.ok(player.score.judgment.score <= 100);
    assert.ok(player.score.judgment.weighted_points <= 30);
    assert.ok(player.score.overall <= 100);
    assert.ok(player.confidence.score <= 100);
    const sourceScore = player.technical_seo?.score ?? 0;
    assert.equal(player.score.deterministic.components.technical_seo.score, sourceScore);
    assert.equal(player.score.deterministic.components.technical_seo.weighted_points, Math.round(sourceScore * 0.15 * 10) / 10);
  }
}

writeSerp([
  { position: 1, title: "SEO player score guia completo", url: "https://competitor.example/seo-player-score", snippet: "Compare players da SERP com dados, técnica e julgamento.", domain: "competitor.example" },
  { position: 2, title: "SEO player score para URL alvo", url: "https://target.example/seo-player-score", snippet: "Analise uma URL alvo por palavra-chave.", domain: "target.example" },
  { position: 3, title: "Página curta", url: "https://weak.example/page", snippet: "Resultado fraco e pouco relevante.", domain: "weak.example" },
]);
const exact = run("https://target.example/seo-player-score?utm=1");
assert.equal(exact.target_status, "exact_url_ranking");
assert.ok(exact.player_scores.some((player) => player.is_target && player.position === 2));
assertScoreBounds(exact);

writeSerp([
  { position: 1, title: "SEO player score guia completo", url: "https://competitor.example/seo-player-score", snippet: "Compare players da SERP com dados, técnica e julgamento.", domain: "competitor.example" },
  { position: 2, title: "Outro resultado do domínio", url: "https://target.example/other", snippet: "O domínio aparece, mas a URL desejada não.", domain: "target.example" },
  { position: 3, title: "Página curta", url: "https://weak.example/page", snippet: "Resultado fraco e pouco relevante.", domain: "weak.example" },
]);
const wrongUrl = run("https://target.example/wanted");
assert.equal(wrongUrl.target_status, "same_domain_wrong_url");
assert.ok(wrongUrl.player_scores.some((player) => player.is_target && player.position === null));
assertScoreBounds(wrongUrl);

const domain = runDomain("target.example");
assert.equal(domain.target_mode, "domain");
assert.equal(domain.target_domain, "target.example");
assert.equal(domain.target_status, "domain_ranking");
assert.equal(domain.target_url, "https://target.example/other");
assert.ok(domain.player_scores.some((player) => player.is_target && player.position === 2));
assertScoreBounds(domain);

writeSerp([
  { position: 1, title: "SEO player score guia completo", url: "https://competitor.example/seo-player-score", snippet: "Compare players da SERP com dados, técnica e julgamento.", domain: "competitor.example" },
  { position: 2, title: "Página curta", url: "https://weak.example/page", snippet: "Resultado fraco e pouco relevante.", domain: "weak.example" },
]);
const absent = run("https://target.example/wanted");
assert.equal(absent.target_status, "not_ranking");
assert.ok(absent.player_scores.some((player) => player.is_target && player.position === null));
assertScoreBounds(absent);

rmSync(tmp, { recursive: true, force: true });
console.log("player score ok");
