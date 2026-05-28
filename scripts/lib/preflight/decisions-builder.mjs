const SCHEMA_VERSION = 1;

function ceilTo100(value) {
  return Math.ceil(value / 100) * 100;
}

function competitorMaxWords(seoReport) {
  if (!seoReport || typeof seoReport !== "object") return null;
  const candidates = [];
  const sources = [
    seoReport.competitors,
    seoReport.competitor_evidence?.top3,
    seoReport.competitor_evidence?.top_3,
    seoReport.top3_pages,
    seoReport.top_results_pages,
  ];
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const entry of source.slice(0, 3)) {
      const wc = Number(entry?.page?.word_count ?? entry?.word_count);
      if (Number.isFinite(wc) && wc > 0) candidates.push(wc);
    }
    if (candidates.length) break;
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function buildSkyscraper(seoReport) {
  const competitorMax = competitorMaxWords(seoReport);
  const formulaValue = competitorMax ? ceilTo100(competitorMax * 1.2) : null;
  const floor = 2000;
  const target = Math.max(formulaValue || 0, floor);
  return {
    target_words: target,
    formula: "max(top_3_max * 1.2, floor=2000)",
    competitor_max: competitorMax,
    formula_value: formulaValue,
    applied: formulaValue && formulaValue > floor ? "formula" : "floor",
  };
}

function buildCannibalization(seoReport, publisherDomain) {
  const report = seoReport?.cannibalization_report;
  if (report && typeof report === "object") {
    return {
      detected: Array.isArray(report.matches) && report.matches.length > 0,
      publisher_domain: report.publisher_domain ?? publisherDomain ?? null,
      matches: Array.isArray(report.matches) ? report.matches : [],
      recommendation: report.recommendation || "none",
      severity: report.matches?.[0]?.severity || null,
      note: report.note || null,
      user_decision: null,
    };
  }
  return {
    detected: false,
    publisher_domain: publisherDomain ?? null,
    matches: [],
    recommendation: "none",
    severity: null,
    note: publisherDomain ? "no cannibalization report available" : "publisher_domain not configured",
    user_decision: null,
  };
}

function buildVoice(voicePolicy) {
  return {
    status: voicePolicy.status,
    path: voicePolicy.path,
    recommendation: voicePolicy.recommendation,
    user_decision: null,
  };
}

function buildEeat(wikiContext) {
  const eeatPage = (wikiContext?.pages || []).find((p) => p.path === "wiki/eeat.md");
  if (!eeatPage || !eeatPage.exists) {
    return { status: "empty", signals_available: {}, gaps: ["experience", "expertise", "authority", "trust"], user_decision: null };
  }
  const status = String(eeatPage.status || "").toLowerCase();
  const normalized = status === "approved" ? "approved" : status === "needs-review" ? "needs-review" : "needs-review";
  return {
    status: normalized,
    signals_available: {},
    gaps: [],
    user_decision: null,
  };
}

function buildBrandMention(cannibalization) {
  if (cannibalization.detected) {
    return {
      policy: "omit",
      rationale: "Publisher domain appears in SERP top results; omitting reduces forbidden-term risk.",
      user_decision: null,
    };
  }
  return {
    policy: "use-without-domain",
    rationale: "No cannibalization detected; brand can be referenced editorially without domain mention.",
    user_decision: null,
  };
}

function buildExternalActions(cannibalization, voice) {
  const actions = [];
  if (cannibalization.recommendation === "consolidate-301") {
    actions.push({ task: `configure 301 from ${cannibalization.matches?.[0]?.url || "competing URL"} to new article`, owner: "human", system: "external", status: "pending" });
  }
  if (voice.status === "draft-as-guide") {
    actions.push({ task: "approve voice page formally", owner: "human", system: "wiki", status: "pending" });
  }
  return actions;
}

export function buildDecisions({ projectDir, wikiContext, voicePolicy, seoReport, topic, keyword, slugify, today }) {
  const keywordValue = keyword || topic;
  const topicSlug = slugify(topic);
  const keywordSlug = slugify(keywordValue);
  const skyscraper = buildSkyscraper(seoReport);
  const cannibalization = buildCannibalization(seoReport, wikiContext?.publisher_domain || null);
  const voice = buildVoice(voicePolicy);
  const eeat = buildEeat(wikiContext);
  const brandMention = buildBrandMention(cannibalization);
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    project_root: projectDir,
    keyword: keywordValue,
    keyword_slug: keywordSlug,
    topic,
    topic_slug: topicSlug,
    analysis_missing: !seoReport,
    wiki_context: {
      pages: wikiContext?.pages || [],
      publisher_domain: wikiContext?.publisher_domain || null,
    },
    skyscraper,
    cannibalization,
    voice,
    eeat,
    brand_mention: brandMention,
    publication_target: {
      wiki: `project/wiki/conteudos/${topicSlug}.md`,
      web: "project/web (data-driven render via [slug] route)",
      user_decision: null,
    },
    internal_actions: [
      { task: "write brief artifacts", owner: "agent" },
      { task: "write draft to artifacts/", owner: "agent" },
      { task: "run publication checks", owner: "agent" },
      { task: "promote to wiki/conteudos/", owner: "agent" },
      { task: "register in web/lib/site.ts", owner: "agent" },
    ],
    external_actions: buildExternalActions(cannibalization, voice),
    approval: {
      status: "pending",
      approved_by: null,
      approved_at: null,
      notes: null,
    },
  };
}
