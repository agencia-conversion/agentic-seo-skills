import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "seo-brain-uc3-"));
process.env.HOME = tmp;
const projectRoot = join(tmp, "project");
mkdirSync(join(projectRoot, "wiki", "log"), { recursive: true });
writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");

const { handleSubmit, processSubmission, buildClusterMarkdown, applyPillarOverrides } = await import(
  "../scripts/lib/companion-types/pick-cluster.mjs"
);

function proposalFor(mode, count = 5) {
  const supporting = Array.from({ length: count }, (_, i) => ({
    slug: `support-${i + 1}`,
    title: `Support ${i + 1}`,
    intent: i % 2 ? "transactional" : "informational",
    judgment: `note ${i + 1}`,
    volume: 100 + i * 10,
    difficulty: 30 + i,
  }));
  return {
    seed: "seo-agentico",
    mode,
    pillar: { slug: "seo-agentico", title: "SEO Agêntico", intent: "informational", judgment: "anchor", volume: 1200, difficulty: 45 },
    supporting,
    data_provenance: { provider: mode === "production" ? "dataforseo" : null, provider_reason: "test fixture" },
  };
}

const supportingInput = (proposal, decisions) =>
  proposal.supporting.map((s, i) => ({
    slug: s.slug,
    kept: decisions[i]?.kept ?? true,
    priority: decisions[i]?.priority ?? i + 1,
    display_title: decisions[i]?.display_title ?? s.title,
    judgment: decisions[i]?.judgment ?? s.judgment,
  }));

// processSubmission preserves slug+intent, captures overrides, sorts by priority
{
  const proposal = proposalFor("production", 4);
  const input = supportingInput(proposal, [
    { kept: true, priority: 3, display_title: "Renamed Support 1", judgment: "primary guide" },
    { kept: false },
    { kept: true, priority: 1 },
    { kept: true, priority: 2 },
  ]);
  const { kept, dropped } = processSubmission(input, proposal);
  assert.equal(kept.length, 3);
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].slug, "support-2");
  assert.deepEqual(kept.map((k) => k.slug), ["support-3", "support-4", "support-1"]);
  assert.deepEqual(kept.map((k) => k.priority), [1, 2, 3]);
  assert.deepEqual(kept[2].user_overrides, {
    display_title: "Renamed Support 1",
    judgment: "primary guide",
  });
  assert.equal(kept[0].user_overrides, undefined, "no overrides if user kept defaults");
}

// hypothesis-only: writes JSON only, never wiki
{
  const proposal = proposalFor("hypothesis-only", 5);
  writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");
  const ctx = { projectRoot, proposal };
  const result = await handleSubmit(
    { approver: "Diego", supporting: supportingInput(proposal, []) },
    ctx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, "hypothesis");
  assert.equal(result.wiki, null, "hypothesis must not touch wiki");
  assert.ok(existsSync(result.report));
  assert.equal(existsSync(join(projectRoot, "wiki", "conteudos", "topic-clusters.md")), false);
  const log = readFileSync(join(projectRoot, "wiki", "log", "index.md"), "utf8");
  assert.ok(log.includes("Type: operational-decision"));
  assert.ok(log.includes("hypothesis"));
}

// production with kept >= 3: writes wiki + JSON
{
  const proposal = proposalFor("production", 5);
  writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");
  const ctx = { projectRoot, proposal };
  const result = await handleSubmit(
    { approver: "Diego Ivo", supporting: supportingInput(proposal, []) },
    ctx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, "draft");
  assert.ok(result.wiki && existsSync(result.wiki));
  const wiki = readFileSync(result.wiki, "utf8");
  assert.ok(wiki.includes("status: draft"));
  assert.ok(wiki.includes("Cluster: SEO Agêntico"));
  assert.ok(wiki.includes("Páginas de apoio"));
}

// production with kept < 3: blocks wiki, writes JSON as needs-supporting
{
  const proposal = proposalFor("production", 5);
  writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");
  rmSync(join(projectRoot, "wiki", "conteudos"), { recursive: true, force: true });
  const ctx = { projectRoot, proposal };
  const decisions = [
    { kept: true }, { kept: false }, { kept: true }, { kept: false }, { kept: false },
  ];
  const result = await handleSubmit(
    { approver: "Diego", supporting: supportingInput(proposal, decisions) },
    ctx,
  );
  assert.equal(result.ok, true);
  assert.equal(result.status, "needs-supporting");
  assert.equal(result.wiki, null);
  assert.equal(existsSync(join(projectRoot, "wiki", "conteudos", "topic-clusters.md")), false);
}

// missing approver
{
  const proposal = proposalFor("production");
  const result = await handleSubmit(
    { approver: " ", supporting: supportingInput(proposal, []) },
    { projectRoot, proposal },
  );
  assert.deepEqual({ ok: result.ok, reason: result.reason }, { ok: false, reason: "missing-approver" });
}

// markdown structure
{
  const proposal = proposalFor("production", 3);
  const { kept } = processSubmission(supportingInput(proposal, []), proposal);
  const md = buildClusterMarkdown(proposal, kept);
  assert.ok(md.startsWith("---\ntitle:"));
  assert.ok(md.includes("status: draft"));
  assert.ok(md.includes("**Pilar:** SEO Agêntico"));
  assert.ok(md.includes("1. **Support 1**"));
}

// applyPillarOverrides preserves slug/intent and captures only changed fields
{
  const original = { slug: "anchor", title: "Original Title", intent: "informational", judgment: "primary" };
  const noEdit = applyPillarOverrides(original, { display_title: "Original Title", judgment: "primary" });
  assert.equal(noEdit.user_overrides, undefined, "no override when values match");

  const withEdit = applyPillarOverrides(original, { display_title: "Renamed", judgment: "primary" });
  assert.deepEqual(withEdit.user_overrides, { display_title: "Renamed" });
  assert.equal(withEdit.slug, "anchor");
  assert.equal(withEdit.intent, "informational");
}

// pillar overrides flow through handleSubmit and into wiki markdown
{
  const proposal = proposalFor("production", 3);
  writeFileSync(join(projectRoot, "wiki", "log", "index.md"), "# Log\n");
  rmSync(join(projectRoot, "wiki", "conteudos"), { recursive: true, force: true });
  const ctx = { projectRoot, proposal };
  const result = await handleSubmit(
    {
      approver: "Diego",
      pillar: { display_title: "SEO Agêntico — guia 2026", judgment: "rota institucional" },
      supporting: supportingInput(proposal, []),
    },
    ctx,
  );
  assert.equal(result.ok, true);
  const wiki = readFileSync(result.wiki, "utf8");
  assert.ok(wiki.includes("Cluster: SEO Agêntico — guia 2026"));
  assert.ok(wiki.includes("rota institucional"));
  const report = JSON.parse(readFileSync(result.report, "utf8"));
  assert.deepEqual(report.pillar.user_overrides, {
    display_title: "SEO Agêntico — guia 2026",
    judgment: "rota institucional",
  });
}

rmSync(tmp, { recursive: true, force: true });
console.log("companion pick-cluster ok");
