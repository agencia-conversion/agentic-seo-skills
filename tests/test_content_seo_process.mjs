import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const bin = join(root, "bin", "agentic-seo");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-process-"));
const projectDir = join(tmp, "project");

function run(args) {
  return spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, AGENTIC_SEO_PROJECT_DIR: projectDir, DATAFORSEO_LOGIN: "fixture-login", DATAFORSEO_PASSWORD: "fixture-password" },
  });
}

function runNoCreds(args) {
  return spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HOME: join(tmp, "home-no-creds"), AGENTIC_SEO_PROJECT_DIR: projectDir, DATAFORSEO_LOGIN: "", DATAFORSEO_PASSWORD: "", CLAUDE_PLUGIN_OPTION_dataforseo_login: "", CLAUDE_PLUGIN_OPTION_dataforseo_password: "" },
  });
}

function dataforseoBypassArgs(reason = "teste explícito sem DataForSEO") {
  return [
    "--dataforseo-bypass-confirmed",
    "--dataforseo-bypass-reason",
    reason,
    "--dataforseo-bypass-approved-by",
    "Diego Ivo",
    "--dataforseo-bypass-confirmation-text",
    "Confirmo seguir sem DataForSEO neste teste.",
    "--dataforseo-bypass-confirmed-at",
    "2026-05-06T00:00:00+00:00",
  ];
}

function assertArtifactPrompt(json, artifactSuffix) {
  assert.equal(json.browser_prompt?.recommended, true);
  assert.equal(json.browser_prompt.message, "Posso abrir o Web Companion para você revisar esta entrega?");
  assert.equal(json.browser_prompt.open_with, "project-browser");
  assert.equal(json.browser_prompt.artifact_path.endsWith(artifactSuffix), true);
  assert.ok(json.companion_path);
  assert.ok(json.companion_slug);
}

function competitorPage(title, h1, words) {
  const sentence = "Conteúdo público com análise, página, evidência e orientação técnica para o leitor brasileiro. ";
  return `<!doctype html><html lang="pt-BR"><head><title>${title}</title><meta name="description" content="Descrição pública para teste de concorrente SEO."><link rel="canonical" href="https://example.com/${title}"></head><body><main><h1>${h1}</h1><h2>Primeira seção</h2><p>${sentence.repeat(Math.ceil(words / 12))}</p><h2>Segunda seção</h2><p>${sentence.repeat(20)}</p></main></body></html>`;
}

function longBody(title) {
  const sentence = "Esta seção aprofunda a orientação pública com critérios verificáveis, exemplos proporcionais e limites claros para evitar promessa sem evidência. ";
  return `# ${title}\n\nA página explica o tema com uma referência pública consultada somente no frontmatter.\n\n## O que significa\n\n${sentence.repeat(140)}\n\n## Como aplicar na prática\n\n${sentence.repeat(140)}\n\n## Erros comuns\n\n${sentence.repeat(140)}\n\n## Como avançar\n\n${sentence.repeat(140)}\n`;
}

run(["project-init", "Process Test"]);

{
  const res = runNoCreds(["seo-analysis", "--keyword", "sem credencial"]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /DataForSEO credentials missing/);
}

{
  const allowed = runNoCreds(["seo-analysis", "--keyword", "websearch confirmado", "--provider", "websearch", "--websearch-reason", "teste explícito"]);
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(JSON.parse(allowed.stdout).provider, "websearch");
}

{
  const res = run(["content-seo", "--topic", "SEO sem SERP", "--skip-data", "--skip-data-reason", "homepage only"]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Top 3 competitor evidence/);
}

{
  const res = run(["content-seo", "--topic", "SEO sem SERP", "--skip-data", "--skip-data-confirmed", "--skip-data-reason", "usuário pediu sem SERP", ...dataforseoBypassArgs("usuário pediu sem SERP"), "--top3-bypass-confirmed", "--top3-bypass-reason", "usuário aprovou briefing sem Top 3"]);
  assert.equal(res.status, 0, res.stderr);
  const json = JSON.parse(res.stdout);
  assert.equal(json.status, "ready_for_writing");
  assert.equal(json.brief.approval.status, "not_required");
  assert.equal(json.brief.draft_status, "ready-for-writing");
  assert.equal(json.brief.process_bypass[0].approver, "Diego Ivo");
  assert.match(json.brief.process_bypass[0].confirmation_text, /DataForSEO/);
  assert.equal("next_handoff_command" in json, false);
  const workDir = join(projectDir, "workbench", "content", "seo-sem-serp");
  const artifactDir = join(projectDir, "artifacts", "contents", "seo-sem-serp");
  assert.equal(existsSync(join(workDir, "research.yaml")), true);
  assert.equal(existsSync(join(workDir, "competitor-evidence.yaml")), true);
  assert.equal(existsSync(join(workDir, "context-evidence.yaml")), true);
  assert.equal(existsSync(join(workDir, "brief.yaml")), true);
  assert.equal(existsSync(join(workDir, "brief.md")), true);
  assert.equal(existsSync(join(workDir, "draft.md")), false);
  assert.equal(existsSync(join(artifactDir, "draft.md")), false);
  assert.equal(json.web_companion?.recommended, true);
  assertArtifactPrompt(json, "workbench/content/seo-sem-serp/brief.md");
  assert.equal(json.brief_markdown_path.endsWith(join("workbench", "content", "seo-sem-serp", "brief.md")), true);

  const written = run(["content-seo", "--phase", "write", "--topic", "SEO sem SERP", "--cluster", "seo-sem-serp"]);
  assert.equal(written.status, 0, written.stderr);
  assertArtifactPrompt(JSON.parse(written.stdout), "artifacts/contents/seo-sem-serp/draft.md");
  assert.equal(existsSync(join(artifactDir, "draft.md")), true);
  assert.equal(existsSync(join(workDir, "draft.md")), false);
  const initialDraft = readFileSync(join(artifactDir, "draft.md"), "utf8");
  assert.match(initialDraft, /contract_version: 1/);
  assert.match(initialDraft, /clusters:\n  - seo-sem-serp/);
  let brief = YAML.parse(readFileSync(join(workDir, "brief.yaml"), "utf8"));
  assert.equal(brief.draft_status, "draft");
  assert.equal(brief.draft_path, "artifacts/contents/seo-sem-serp/draft.md");
  assert.ok(brief.context_evidence?.voice_evidence?.content_hash_sha256);

  writeFileSync(join(artifactDir, "draft.md"), `${readFileSync(join(artifactDir, "draft.md"), "utf8")}\n\n[clique aqui](../../sources/web/source.html)\n`, "utf8");
  const badCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.notEqual(badCheck.status, 0);
  assert.match(badCheck.stdout, /generic Markdown anchor|non-public link target|word-count below target/);
  assertArtifactPrompt(JSON.parse(badCheck.stdout), "artifacts/contents/seo-sem-serp/draft.md");
  assert.equal(existsSync(join(artifactDir, "checks.yaml")), true);
  assert.equal(existsSync(join(artifactDir, "publication-check.yaml")), true);
  assert.equal(existsSync(join(artifactDir, "word-count.yaml")), true);
  assert.equal(existsSync(join(artifactDir, "review.yaml")), true);
  assert.equal(existsSync(join(projectDir, "artifacts", "content", "seo-sem-serp.publication-check.json")), false);

  const draft = readFileSync(join(artifactDir, "draft.md"), "utf8");
  const frontmatter = draft.slice(0, draft.indexOf("\n---", 4) + 4);
  const sourceFrontmatter = frontmatter.replace(/sources:\n(?:  - .+\n)+/, 'sources:\n  - "https://example.com/referencia-publica"\n');

  writeFileSync(join(artifactDir, "draft.md"), `${frontmatter}\n\n# SEO sem SERP\n\n## O que significa\n\nTexto curto com heading empilhado.\n`, "utf8");
  const badHeadingCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.notEqual(badHeadingCheck.status, 0);
  assert.match(badHeadingCheck.stdout, /heading missing preceding paragraph/);

  writeFileSync(join(artifactDir, "draft.md"), `${frontmatter}\n\n# SEO sem SERP\n\nEste parágrafo antecede a lista, mas há itens demais para um post público.\n\n- Um\n- Dois\n- Três\n- Quatro\n`, "utf8");
  const badBulletsCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.notEqual(badBulletsCheck.status, 0);
  assert.match(badBulletsCheck.stdout, /too many unordered bullet items in public body: 4\/3/);

  writeFileSync(join(artifactDir, "draft.md"), `${sourceFrontmatter}\n\n# SEO sem SERP\n\nEste parágrafo introduz a seção de fontes, que não deve aparecer no corpo.\n\n## Fontes públicas consultadas\n\nVeja a [referência pública](https://example.com/referencia-publica).\n`, "utf8");
  const badSourcesCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.notEqual(badSourcesCheck.status, 0);
  assert.match(badSourcesCheck.stdout, /consulted source section in public body/);
  assert.match(badSourcesCheck.stdout, /consulted public source link in public body/);

  writeFileSync(join(artifactDir, "draft.md"), `${sourceFrontmatter}\n\n${longBody("SEO sem SERP")}`, "utf8");
  const missingClusterCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.notEqual(missingClusterCheck.status, 0);
  assert.match(missingClusterCheck.stdout, /cluster not found: seo-sem-serp/);

  mkdirSync(join(projectDir, "clusters", "seo-sem-serp"), { recursive: true });
  writeFileSync(join(projectDir, "clusters", "seo-sem-serp", "cluster.yaml"), YAML.stringify({
    contract_version: 1,
    slug: "seo-sem-serp",
    name: "SEO sem SERP",
    area: "Estratégia editorial",
    status: "active",
    pillar: { slug: "seo-sem-serp", keyword: "SEO sem SERP", intent: "informational", volume: null },
    planned_satellites: [],
    satellite_overrides: {},
    stats: { published: 0, planned: 0, updated: "2026-05-06" },
    provenance: { created_at: "2026-05-06", created_by: "test" },
    evidence: [],
  }, { lineWidth: 0 }));

  const goodCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.equal(goodCheck.status, 0, goodCheck.stderr);
  const goodCheckJson = JSON.parse(goodCheck.stdout);
  assert.equal(goodCheckJson.ok, true);
  assertArtifactPrompt(goodCheckJson, "artifacts/contents/seo-sem-serp/draft.md");
  assert.equal(YAML.parse(readFileSync(join(artifactDir, "checks.yaml"), "utf8")).review.review_backed, true);
  assert.equal(YAML.parse(readFileSync(join(artifactDir, "word-count.yaml"), "utf8")).ok, true);

  const publishableDraft = readFileSync(join(artifactDir, "draft.md"), "utf8");
  writeFileSync(join(artifactDir, "draft.md"), publishableDraft.replace(/clusters:\n  - seo-sem-serp/, "clusters: []"), "utf8");
  const noClusterPromote = run(["content-seo", "--phase", "promote", "--topic", "SEO sem SERP"]);
  assert.notEqual(noClusterPromote.status, 0);
  assert.match(noClusterPromote.stdout, /"reason": "missing-cluster"/);
  assert.match(noClusterPromote.stdout, /"companion_path": "artifacts-contents-seo-sem-serp-draft"/);
  assertArtifactPrompt(JSON.parse(noClusterPromote.stdout), "artifacts/contents/seo-sem-serp/draft.md");
  writeFileSync(join(artifactDir, "draft.md"), publishableDraft, "utf8");

  const promoted = run(["content-seo", "--phase", "promote", "--topic", "SEO sem SERP"]);
  assert.equal(promoted.status, 0, promoted.stderr);
  assertArtifactPrompt(JSON.parse(promoted.stdout), "contents/blog/seo-sem-serp.md");
  const published = readFileSync(join(projectDir, "contents", "blog", "seo-sem-serp.md"), "utf8");
  assert.match(published, /origin: "blog"/);
  assert.match(published, /published_at:/);
}

{
  mkdirSync(join(projectDir, "workbench", "seo-analysis"), { recursive: true });
  writeFileSync(join(projectDir, "workbench", "seo-analysis", "conteudo-sem-top3.yaml"), YAML.stringify({
    keyword: "conteúdo sem top3",
    provider: "dataforseo",
    provider_reason: "fixture",
    generated_at: "2026-05-05T00:00:00+00:00",
    intent: "informational",
    top_results: [{ position: 1, domain: "one.example", url: "https://one.example/page", title: "Um" }],
    competitors: [],
    gaps: [],
    improvement_hypotheses: [],
    limitations: [],
    incomplete: true,
  }, { lineWidth: 0 }));
  const missingTop3 = run(["content-seo", "--topic", "Conteúdo sem Top3", "--keyword", "conteúdo sem top3"]);
  assert.notEqual(missingTop3.status, 0);
  assert.match(missingTop3.stderr, /Top 3 competitor evidence requires 3 organic results/);
}

{
  mkdirSync(join(projectDir, "workbench", "seo-analysis"), { recursive: true });
  writeFileSync(join(projectDir, "workbench", "seo-analysis", "conteudo-com-serp.yaml"), YAML.stringify({
    keyword: "conteúdo com serp",
    provider: "dataforseo",
    provider_reason: "fixture",
    data_provenance: { serp_extract: { path: "sources/serp/fixture-conteudo-com-serp.normalized.yaml", provider: "dataforseo" } },
    generated_at: "2026-05-05T00:00:00+00:00",
    intent: { primary: "informational", description: "entender o tema" },
    top_results: [
      { position: 1, domain: "competitor-a.example", url: "https://competitor-a.example/page", title: "Concorrente A" },
      { position: 2, domain: "competitor-b.example", url: "https://competitor-b.example/page", title: "Concorrente B" },
      { position: 3, domain: "competitor-c.example", url: "https://competitor-c.example/page", title: "Concorrente C" },
    ],
    competitors: [
      { serp: { url: "https://competitor-a.example/page" }, http_status: 200, page: { title: "Concorrente A", meta_description: "A", headings: [{ level: "h1", text: "A" }, { level: "h2", text: "A seção" }], h2_count: 1, word_count: 1500 } },
      { serp: { url: "https://competitor-b.example/page" }, http_status: 200, page: { title: "Concorrente B", meta_description: "B", headings: [{ level: "h1", text: "B" }, { level: "h2", text: "B seção" }], h2_count: 1, word_count: 2600 } },
      { serp: { url: "https://competitor-c.example/page" }, http_status: 200, page: { title: "Concorrente C", meta_description: "C", headings: [{ level: "h1", text: "C" }, { level: "h2", text: "C seção" }], h2_count: 1, word_count: 900 } },
    ],
    gaps: ["lacuna de aplicação prática"],
    improvement_hypotheses: ["hipótese editorial"],
    limitations: [],
    incomplete: false,
  }, { lineWidth: 0 }));
  const res = run(["content-seo", "--topic", "Conteúdo com SERP", "--keyword", "conteúdo com serp"]);
  assert.equal(res.status, 0, res.stderr);
  const brief = YAML.parse(readFileSync(join(projectDir, "workbench", "content", "conteudo-com-serp", "brief.yaml"), "utf8"));
  const competitorEvidence = YAML.parse(readFileSync(join(projectDir, "workbench", "content", "conteudo-com-serp", "competitor-evidence.yaml"), "utf8"));
  assert.deepEqual(brief.serp_competitor_domains, ["competitor-a.example", "competitor-b.example", "competitor-c.example"]);
  assert.equal(competitorEvidence.valid.length, 3);
  assert.equal(competitorEvidence.competitors[0].sub_agent_review.status, "complete");
  assert.equal(brief.skyscraper.word_count.max_competitor_words, 2600);
  assert.equal(brief.skyscraper.word_count.target_words, 3200);
  assert.equal(brief.brief.outline_capacity.can_support_target, true);
  assert.equal(brief.brief.outline_capacity.min_h2_sections, 7);
  assert.equal(brief.brief.outline.filter((item) => item.level === 2).length >= 7, true);
  assert.equal(existsSync(join(projectDir, "workbench", "content", "conteudo-com-serp", "brief.md")), true);
}

{
  mkdirSync(join(projectDir, "workbench", "seo-analysis"), { recursive: true });
  writeFileSync(join(projectDir, "workbench", "seo-analysis", "conteudo-longo.yaml"), YAML.stringify({
    keyword: "conteúdo longo",
    provider: "dataforseo",
    provider_reason: "fixture",
    data_provenance: { serp_extract: { path: "sources/serp/fixture-conteudo-longo.normalized.yaml", provider: "dataforseo" } },
    generated_at: "2026-05-05T00:00:00+00:00",
    intent: { primary: "informational", description: "entender e aplicar o tema" },
    top_results: [
      { position: 1, domain: "long-a.example", url: "https://long-a.example/page", title: "Longo A" },
      { position: 2, domain: "long-b.example", url: "https://long-b.example/page", title: "Longo B" },
      { position: 3, domain: "long-c.example", url: "https://long-c.example/page", title: "Longo C" },
    ],
    competitors: [
      { serp: { url: "https://long-a.example/page" }, http_status: 200, page: { title: "Longo A", meta_description: "A", headings: [{ level: "h1", text: "A" }, { level: "h2", text: "O que é" }, { level: "h2", text: "Como criar uma estratégia" }, { level: "h2", text: "Como medir resultados" }], h2_count: 3, word_count: 4744 } },
      { serp: { url: "https://long-b.example/page" }, http_status: 200, page: { title: "Longo B", meta_description: "B", headings: [{ level: "h1", text: "B" }, { level: "h2", text: "Tipos e fontes" }, { level: "h2", text: "SEO técnico" }], h2_count: 2, word_count: 3453 } },
      { serp: { url: "https://long-c.example/page" }, http_status: 200, page: { title: "Longo C", meta_description: "C", headings: [{ level: "h1", text: "C" }, { level: "h2", text: "Benefícios" }, { level: "h2", text: "Erros comuns" }], h2_count: 2, word_count: 3298 } },
    ],
    gaps: ["faltam exemplos de aplicação e mensuração"],
    improvement_hypotheses: ["aprofundar diagnóstico, plano e revisão"],
    limitations: [],
    incomplete: false,
  }, { lineWidth: 0 }));
  const res = run(["content-seo", "--topic", "Conteúdo Longo", "--keyword", "conteúdo longo"]);
  assert.equal(res.status, 0, res.stderr);
  const brief = YAML.parse(readFileSync(join(projectDir, "workbench", "content", "conteudo-longo", "brief.yaml"), "utf8"));
  const briefMd = readFileSync(join(projectDir, "workbench", "content", "conteudo-longo", "brief.md"), "utf8");
  assert.equal(brief.skyscraper.word_count.target_words, 5700);
  assert.equal(brief.brief.outline_capacity.min_h2_sections, 12);
  assert.equal(brief.brief.outline_capacity.planned_h2_sections >= 12, true);
  assert.equal(brief.brief.outline_capacity.planned_words >= 5700, true);
  assert.equal(brief.brief.outline_capacity.can_support_target, true);
  assert.match(briefMd, /Web Companion/);
  assert.match(briefMd, /Outline publicável/);

  const written = run(["content-seo", "--phase", "write", "--topic", "Conteúdo Longo"]);
  assert.equal(written.status, 0, written.stderr);
  const check = run(["content-seo", "--phase", "check", "--topic", "Conteúdo Longo"]);
  assert.notEqual(check.status, 0);
  const wordCount = YAML.parse(readFileSync(join(projectDir, "artifacts", "contents", "conteudo-longo", "word-count.yaml"), "utf8"));
  assert.equal(wordCount.route, "return_to_writer");
  assert.equal(wordCount.actual_h2_sections >= 12, true);
}

{
  writeFileSync(join(projectDir, "workbench", "seo-analysis", "conteudo-websearch.yaml"), YAML.stringify({
    keyword: "conteúdo websearch",
    provider: "websearch",
    provider_reason: "fixture",
    generated_at: "2026-05-05T00:00:00+00:00",
    intent: "informational",
    top_results: [
      { position: 1, domain: "a.example", url: "https://a.example/page", title: "A" },
      { position: 2, domain: "b.example", url: "https://b.example/page", title: "B" },
      { position: 3, domain: "c.example", url: "https://c.example/page", title: "C" },
    ],
    competitors: [
      { serp: { url: "https://a.example/page" }, http_status: 200, page: { title: "A", meta_description: "A", headings: [{ level: "h1", text: "A" }], h2_count: 0, word_count: 1200 } },
      { serp: { url: "https://b.example/page" }, http_status: 200, page: { title: "B", meta_description: "B", headings: [{ level: "h1", text: "B" }], h2_count: 0, word_count: 1300 } },
      { serp: { url: "https://c.example/page" }, http_status: 200, page: { title: "C", meta_description: "C", headings: [{ level: "h1", text: "C" }], h2_count: 0, word_count: 1400 } },
    ],
    gaps: [],
    improvement_hypotheses: [],
    limitations: [],
    incomplete: false,
  }, { lineWidth: 0 }));
  const allowed = run(["content-seo", "--topic", "Conteúdo WebSearch", "--keyword", "conteúdo websearch", "--provider-bypass-reason", "usuário aceitou WebSearch"]);
  assert.equal(allowed.status, 0, allowed.stderr);
  const brief = YAML.parse(readFileSync(join(projectDir, "workbench", "content", "conteudo-websearch", "brief.yaml"), "utf8"));
  assert.equal(brief.process_bypass[0].approver, "agent");
  assert.equal(brief.process_bypass[0].reason, "usuário aceitou WebSearch");
  assert.match(brief.process_bypass[0].consequence, /not DataForSEO-backed/);
  assert.match(brief.process_bypass[0].confirmation_text, /sem DataForSEO/);
  const log = readFileSync(join(projectDir, "brain", "log.md"), "utf8");
  assert.match(log, /Conteúdo WebSearch/);
}

rmSync(tmp, { recursive: true, force: true });
console.log("content seo process ok");
