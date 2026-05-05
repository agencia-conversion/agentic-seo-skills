import assert from "node:assert/strict";

const { buildClusterPage, mergeClusterPage, mergeClusterPages, renderTopicClustersMarkdown } = await import("../dist/seo-brain.js");

// buildClusterPage with SERP evidence
{
  const serp = {
    provider: "dataforseo",
    organic_results: Array.from({ length: 8 }, (_, i) => ({ rank_absolute: i + 1, title: `R${i}`, url: `https://x/${i}`, domain: `x${i}.com`, snippet: `snippet ${i}` })),
    serp_features: ["people_also_ask", "video"],
  };
  const page = buildClusterPage("pillar", { keyword: "agentic seo", volume: 320 }, serp);
  assert.equal(page.role, "pillar");
  assert.equal(page.slug, "agentic-seo");
  assert.equal(page.keyword_principal.keyword, "agentic seo");
  assert.equal(page.keyword_principal.volume, 320);
  assert.equal(page.entity, null);
  assert.equal(page.serp_intent, null, "agent fills serp_intent");
  assert.equal(page.serp_evidence.organic_top.length, 5, "evidence cap at 5");
  assert.deepEqual(page.serp_evidence.serp_features, ["people_also_ask", "video"]);
}

// buildClusterPage without SERP (hypothesis-only path)
{
  const page = buildClusterPage("support", { keyword: "x", volume: null }, undefined);
  assert.equal(page.serp_evidence, null);
  assert.equal(page.keyword_principal.volume, null);
}

// mergeClusterPage preserves curation fields and uses existing legacy `intent` as serp_intent fallback
{
  const existing = {
    title: "SEO tradicional vs Agentic SEO",
    entity: "Agentic SEO",
    keywords_secondary: [{ keyword: "vs seo classico", volume: 50 }],
    funnel_stage: "MOFU",
    intent: "comparative",
    judgment: "captura buscas comparativas",
  };
  const fresh = buildClusterPage("support", { keyword: "seo tradicional vs agentic seo", volume: 90 }, undefined);
  const merged = mergeClusterPage(existing, fresh);
  assert.equal(merged.title, "SEO tradicional vs Agentic SEO");
  assert.equal(merged.entity, "Agentic SEO");
  assert.equal(merged.funnel_stage, "MOFU");
  assert.equal(merged.serp_intent, "comparative", "legacy intent migrates to serp_intent");
  assert.equal(merged.judgment, "captura buscas comparativas");
  assert.deepEqual(merged.keywords_secondary, [{ keyword: "vs seo classico", volume: 50 }]);
  assert.equal(merged.keyword_principal.keyword, "seo tradicional vs agentic seo", "fresh data wins for keyword/volume");
  assert.equal(merged.keyword_principal.volume, 90);
}

// mergeClusterPages by slug + carry-over of agent-added pages
{
  const existing = [
    { role: "support", slug: "alpha", title: "Alpha title", keyword_principal: { keyword: "alpha", volume: 100 } },
    { role: "support", slug: "deprecated", title: "Old support", keyword_principal: { keyword: "deprecated kw", volume: 5 }, judgment: "agent-added" },
  ];
  const fresh = [
    buildClusterPage("support", { keyword: "alpha", volume: 200 }, undefined),
    buildClusterPage("support", { keyword: "beta", volume: 90 }, undefined),
  ];
  const merged = mergeClusterPages(existing, fresh);
  assert.equal(merged.length, 3, "carry over deprecated since slug not in fresh");
  assert.equal(merged[0].slug, "alpha");
  assert.equal(merged[0].title, "Alpha title");
  assert.equal(merged[0].keyword_principal.volume, 200, "fresh volume wins");
  assert.equal(merged[1].slug, "beta");
  assert.equal(merged[2].slug, "deprecated");
  assert.equal(merged[2].judgment, "agent-added");
}

// renderTopicClustersMarkdown produces the 7-column table with the expected headers
{
  const cluster = {
    seed: "Agentic SEO",
    seed_slug: "agentic-seo",
    status: "draft",
    language: "pt-BR",
    location: "Brazil",
    generated_at: "2026-05-05T10:00:00+00:00",
    data_provenance: { suggestions: { provider: "dataforseo", count: 32 }, serp: { provider: "dataforseo", keyword_count: 8 } },
    pillar: {
      role: "pillar",
      title: "Agentic SEO: o operating system",
      slug: "agentic-seo",
      entity: "Agentic SEO",
      keyword_principal: { keyword: "agentic seo", volume: 320 },
      keywords_secondary: [{ keyword: "seo com agentes", volume: 90 }, { keyword: "ai seo agent", volume: 1100 }],
      funnel_stage: "TOFU-MOFU",
      serp_intent: "informational",
      judgment: "Pagina-mae da categoria",
    },
    supporting_pages: [
      {
        role: "support",
        slug: "seo-tradicional-vs-agentic-seo",
        title: "SEO tradicional vs Agentic SEO",
        entity: "Agentic SEO",
        keyword_principal: { keyword: "seo tradicional vs agentic seo", volume: 90 },
        keywords_secondary: [],
        funnel_stage: "MOFU",
        serp_intent: "comparative",
        judgment: "captura buscas comparativas",
      },
      {
        role: "support",
        slug: "niveis-de-maturidade",
        title: null,
        entity: null,
        keyword_principal: { keyword: "niveis de maturidade agentic seo", volume: null },
        keywords_secondary: null,
        funnel_stage: null,
        serp_intent: null,
        judgment: null,
      },
    ],
    completeness_gaps: ["Glossario Agentic SEO"],
    open_questions: ["Validar atribuicao dos numeros publicos"],
  };
  const md = renderTopicClustersMarkdown([cluster]);
  assert.match(md, /^---/);
  assert.match(md, /auto_generated: true/);
  assert.match(md, /# Topic clusters/);
  assert.match(md, /## Visao geral/);
  assert.match(md, /## Cluster: Agentic SEO/);
  assert.match(md, /\| Papel \| Entidade \| KW principal \| Volume \| KW Secundarias \| Funil \| Intencao de Busca \|/);
  // Pillar row
  assert.match(md, /\| Pillar \| Agentic SEO \| agentic seo \| 320 \| seo com agentes \(90\), ai seo agent \(1100\) \| TOFU-MOFU \| informational \|/);
  // Support 1 with values
  assert.match(md, /\| Suporte \| Agentic SEO \| seo tradicional vs agentic seo \| 90 \| — \| MOFU \| comparative \|/);
  // Support 2 with mostly nulls renders as em-dashes
  assert.match(md, /\| Suporte \| — \| niveis de maturidade agentic seo \| — \| — \| — \| — \|/);
  // Sections
  assert.match(md, /### Lacunas de completude/);
  assert.match(md, /Glossario Agentic SEO/);
  assert.match(md, /### Questoes abertas/);
}

// renderTopicClustersMarkdown with no clusters
{
  const md = renderTopicClustersMarkdown([]);
  assert.match(md, /Nenhum cluster registrado\./);
}

console.log("topic cluster ok");
