import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const bin = join(root, "bin", "seo-brain");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-process-"));
const projectDir = join(tmp, "project");

function run(args) {
  return spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, SEO_BRAIN_PROJECT_DIR: projectDir, DATAFORSEO_LOGIN: "fixture-login", DATAFORSEO_PASSWORD: "fixture-password" },
  });
}

function runNoCreds(args) {
  return spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HOME: join(tmp, "home-no-creds"), SEO_BRAIN_PROJECT_DIR: projectDir, DATAFORSEO_LOGIN: "", DATAFORSEO_PASSWORD: "", CLAUDE_PLUGIN_OPTION_dataforseo_login: "", CLAUDE_PLUGIN_OPTION_dataforseo_password: "" },
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

function competitorPage(title, h1, words) {
  const sentence = "Conteúdo público com análise, página, evidência e orientação técnica para o leitor brasileiro. ";
  return `<!doctype html><html lang="pt-BR"><head><title>${title}</title><meta name="description" content="Descrição pública para teste de concorrente SEO."><link rel="canonical" href="https://example.com/${title}"></head><body><main><h1>${h1}</h1><h2>Primeira seção</h2><p>${sentence.repeat(Math.ceil(words / 12))}</p><h2>Segunda seção</h2><p>${sentence.repeat(20)}</p></main></body></html>`;
}

function longBody(title) {
  const sentence = "Esta seção aprofunda a orientação pública com critérios verificáveis, exemplos proporcionais e limites claros para evitar promessa sem evidência. ";
  return `# ${title}\n\nA página explica o tema com uma referência pública em [anchor descritivo](https://example.com/referencia-publica).\n\n## O que significa\n\n${sentence.repeat(140)}\n\n## Como aplicar na prática\n\n${sentence.repeat(140)}\n\n## Erros comuns\n\n${sentence.repeat(140)}\n\n## Como avançar\n\n${sentence.repeat(140)}\n`;
}

run(["project-init", "Process Test"]);

{
  const res = runNoCreds(["seo-analysis", "--keyword", "sem credencial"]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /DataForSEO credentials missing/);
}

{
  const blocked = runNoCreds(["seo-analysis", "--keyword", "websearch sem confirmação", "--provider", "websearch"]);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /WebSearch is secondary/);
  const missingWrittenApproval = runNoCreds(["seo-analysis", "--keyword", "websearch confirmado", "--provider", "websearch", "--websearch-confirmed", "--websearch-reason", "teste explícito"]);
  assert.notEqual(missingWrittenApproval.status, 0);
  assert.match(missingWrittenApproval.stderr, /requires written approval/);
  const allowed = runNoCreds(["seo-analysis", "--keyword", "websearch confirmado", "--provider", "websearch", "--websearch-confirmed", "--websearch-reason", "teste explícito", ...dataforseoBypassArgs("teste explícito")]);
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(JSON.parse(allowed.stdout).provider, "websearch");
}

{
  const res = run(["content-seo", "--topic", "SEO sem SERP", "--skip-data", "--skip-data-reason", "homepage only"]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /--skip-data-confirmed/);
}

{
  const res = run(["content-seo", "--topic", "SEO sem SERP", "--skip-data", "--skip-data-confirmed", "--skip-data-reason", "usuário pediu sem SERP", ...dataforseoBypassArgs("usuário pediu sem SERP"), "--top3-bypass-confirmed", "--top3-bypass-reason", "usuário aprovou briefing sem Top 3"]);
  assert.equal(res.status, 0, res.stderr);
  const json = JSON.parse(res.stdout);
  assert.equal(json.status, "approval_required");
  assert.equal(json.brief.approval.status, "pending");
  assert.equal(json.brief.draft_status, "briefing");
  assert.equal(json.brief.process_bypass[0].approved_by, "Diego Ivo");
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
  assert.equal(json.brief_markdown_path.endsWith(join("workbench", "content", "seo-sem-serp", "brief.md")), true);

  const writePending = run(["content-seo", "--phase", "write", "--topic", "SEO sem SERP"]);
  assert.notEqual(writePending.status, 0);
  assert.match(writePending.stderr, /not approved/i);

  const blockedApproval = run(["content-seo", "--phase", "approve", "--topic", "SEO sem SERP", "--approved-by", "Diego Ivo"]);
  assert.notEqual(blockedApproval.status, 0);
  assert.match(blockedApproval.stderr, /voice-context-not-acknowledged/);

  const approved = run(["content-seo", "--phase", "approve", "--topic", "SEO sem SERP", "--approved-by", "Diego Ivo", "--approval-notes", "Tom de voz em draft reconhecido."]);
  assert.equal(approved.status, 0, approved.stderr);
  assert.equal(JSON.parse(approved.stdout).status, "draft_created");
  assert.equal(existsSync(join(artifactDir, "draft.md")), true);
  assert.equal(existsSync(join(workDir, "draft.md")), false);
  let brief = YAML.parse(readFileSync(join(workDir, "brief.yaml"), "utf8"));
  assert.equal(brief.draft_status, "draft");
  assert.equal(brief.draft_path, "artifacts/contents/seo-sem-serp/draft.md");
  assert.ok(brief.context_evidence?.voice_evidence?.content_hash_sha256);

  writeFileSync(join(artifactDir, "draft.md"), `${readFileSync(join(artifactDir, "draft.md"), "utf8")}\n\n[clique aqui](../../sources/web/source.html)\n`, "utf8");
  const badCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.notEqual(badCheck.status, 0);
  assert.match(badCheck.stdout, /generic Markdown anchor|non-public link target|word-count below target/);
  assert.equal(existsSync(join(artifactDir, "publication-check.yaml")), true);
  assert.equal(existsSync(join(artifactDir, "word-count.yaml")), true);
  assert.equal(existsSync(join(artifactDir, "review.yaml")), true);
  assert.equal(existsSync(join(projectDir, "artifacts", "content", "seo-sem-serp.publication-check.json")), false);

  const draft = readFileSync(join(artifactDir, "draft.md"), "utf8");
  const frontmatter = draft.slice(0, draft.indexOf("\n---", 4) + 4);
  writeFileSync(join(artifactDir, "draft.md"), `${frontmatter}\n\n${longBody("SEO sem SERP")}`, "utf8");
  const goodCheck = run(["content-seo", "--phase", "check", "--topic", "SEO sem SERP"]);
  assert.equal(goodCheck.status, 0, goodCheck.stderr);
  assert.equal(JSON.parse(goodCheck.stdout).ok, true);
  assert.equal(YAML.parse(readFileSync(join(artifactDir, "word-count.yaml"), "utf8")).ok, true);

  const promoteMissingApproval = run(["content-seo", "--phase", "promote", "--topic", "SEO sem SERP"]);
  assert.notEqual(promoteMissingApproval.status, 0);
  assert.match(promoteMissingApproval.stderr, /--approved-by/);

  const promoted = run(["content-seo", "--phase", "promote", "--topic", "SEO sem SERP", "--approved-by", "Diego Ivo"]);
  assert.equal(promoted.status, 0, promoted.stderr);
  const published = readFileSync(join(projectDir, "wiki", "conteudos", "seo-sem-serp.md"), "utf8");
  assert.match(published, /status: published/);
  assert.match(published, /approval_status: published/);
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

  const approved = run(["content-seo", "--phase", "approve", "--topic", "Conteúdo Longo", "--approved-by", "Diego Ivo", "--approval-notes", "Tom de voz em draft reconhecido."]);
  assert.equal(approved.status, 0, approved.stderr);
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
  const blocked = run(["content-seo", "--topic", "Conteúdo WebSearch", "--keyword", "conteúdo websearch"]);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /requires written approval/);
  const missingWrittenApproval = run(["content-seo", "--topic", "Conteúdo WebSearch", "--keyword", "conteúdo websearch", "--provider-bypass-confirmed", "--provider-bypass-reason", "usuário aceitou WebSearch"]);
  assert.notEqual(missingWrittenApproval.status, 0);
  assert.match(missingWrittenApproval.stderr, /requires written approval/);
  const allowed = run(["content-seo", "--topic", "Conteúdo WebSearch", "--keyword", "conteúdo websearch", "--provider-bypass-confirmed", "--provider-bypass-reason", "usuário aceitou WebSearch", ...dataforseoBypassArgs("usuário aceitou WebSearch")]);
  assert.equal(allowed.status, 0, allowed.stderr);
  const brief = YAML.parse(readFileSync(join(projectDir, "workbench", "content", "conteudo-websearch", "brief.yaml"), "utf8"));
  assert.equal(brief.process_bypass[0].approved_by, "Diego Ivo");
  assert.equal(brief.process_bypass[0].reason, "usuário aceitou WebSearch");
  assert.match(brief.process_bypass[0].consequence, /not DataForSEO-backed/);
  assert.match(brief.process_bypass[0].confirmation_text, /sem DataForSEO/);
  const log = readFileSync(join(projectDir, "wiki", "log", "index.md"), "utf8");
  assert.match(log, /dataforseo-bypass \| Conteúdo WebSearch/);
}

rmSync(tmp, { recursive: true, force: true });
console.log("content seo process ok");
