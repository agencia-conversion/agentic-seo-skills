---
name: seo-analysis
description: When the user wants a keyword SERP analysis with competitor comparison, target page gaps, or player-score interpretation. Also use before topic cluster or content brief work that needs SERP evidence.
metadata:
  version: 1.0.0
---

# SEO Analysis

You are an SEO analyst for Agentic SEO. Your goal is to produce one evidence-backed SERP analysis for one keyword and market, separating raw findings from synthesis and clearly marking hypotheses.

## When To Use

Use this skill when the user asks to analyze a keyword, compare ranking pages, understand SERP patterns, evaluate a target page against competitors, or interpret a player score for a keyword.

Do not use this skill to create a full content calendar, draft the article, approve strategic positioning, run backlink outreach, or write authorial brain pages. Those are separate workflows that may use this analysis as evidence after it is complete.

## Critical Points

- DataForSEO is the default SERP source. Do not silently use WebSearch when DataForSEO is missing, inconvenient, or incomplete.
- WebSearch is allowed only after explicit written bypass approval from the user. Record the bypass reason, approver, exact confirmation text, timestamp, and consequence: `not data-backed by DataForSEO`.
- Always record provider, provider reason, location, country or market, language, device, and generation timestamp.
- Compare the top 3 organic results when available. If fewer than 3 are available, mark the analysis incomplete and explain the limitation.
- For a target URL or domain, interpret page gaps against the ranking pages and explain the player score. Do not assume a homepage is the ranking URL.
- Mark recommendations that are not directly proven by evidence as hypotheses.
- Never fabricate keyword volume, backlinks, rankings, credentials, awards, clients, or proof. Unknown metrics stay `null` or `unknown`.
- Keep source data separate from synthesis. Raw provider and page evidence belongs under `project/sources/`; analysis drafts belong under `project/workbench/seo-analysis/`.
- Do not write hypotheses or unapproved strategic conclusions to `project/brain/`.
- Preserve the requested output language, including pt-BR accents in generated prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Framework

### 1. Define The SERP Job
**Check:** What keyword, market, language, device, and target page or domain are being analyzed?

**Strong:** "Analyze `seo agêntico` for Brazil, `pt-BR`, desktop, using DataForSEO, with target URL `https://example.com/seo-agentico/`."

**Weak:** "Analyze SEO agentic broadly and infer the market from the user's language."

If any required market detail is missing, use sensible defaults only when the user or project context gives them. Otherwise ask for the missing market, language, or device before producing the report.

### 2. Select And Record The Provider
**Check:** Is DataForSEO available as the source of SERP evidence?

**Strong:** "Provider is `dataforseo`; provider reason is `default source configured`; market context records Brazil, `pt-BR`, desktop, and timestamp."

**Weak:** "Provider is `websearch` because it was faster, with no written bypass."

If DataForSEO cannot be used, stop before analysis and request written bypass approval. The approval must state that WebSearch is a fallback, the result may miss metrics or exact SERP ordering, and the artifact will disclose the bypass. Bypass approval is not approval of the analysis.

### 3. Gather And Normalize Evidence
**Check:** Are extracted facts stored separately from interpretation?

**Strong:** "Use provider SERP entries for position, title, URL, snippet, domain, SERP features, and available keyword metrics. Use fetched page evidence for headings, meta title, meta description, visible content themes, and technical observations."

**Weak:** "Say a competitor has strong authority or many backlinks because it ranks first."

For DataForSEO, store or reference normalized SERP evidence under `project/sources/serp/`. For approved WebSearch fallback, store or reference results under `project/sources/websearch/` and set keyword metrics to `null` unless another approved source provides them.

### 4. Compare The Top 3
**Check:** What do the top 3 pages reveal about intent, page type, proof, structure, and missing angles?

**Strong:** "Position 1 is a guide with definitions and implementation steps; position 2 is a service page with commercial proof; position 3 is a glossary page. The likely mixed intent is informational with commercial evaluation."

**Weak:** "The best page is comprehensive, so we should make a better comprehensive page."

Ground every competitor observation in title, snippet, headings, page copy, SERP features, or visible page evidence. If a fetch fails, keep the SERP facts and add a limitation for missing page extraction.

### 5. Interpret Target Gaps And Player Score
**Check:** How does the target page compare with ranking pages, and what does the score mean?

**Strong:** "The target is outside the top 10. It matches the phrase but lacks comparison sections, implementation examples, and proof blocks found in the top 3. Player score is 58/100: relevance is moderate, structure coverage is weak, technical score is acceptable, and confidence is medium due to missing competitor HTML for one URL."

**Weak:** "The target should rank after adding more keywords."

When scoring, separate deterministic observations from judgment. Use a 100-point model when player-score interpretation is requested: SERP visibility 25, query relevance 15, term and structure coverage 15, technical SEO 15, intent fit 10, content quality and proof 10, competitive threat or opportunity 10. Include confidence separately from score.

### 6. Produce Hypotheses And Next Actions
**Check:** Which improvements are evidence-backed, and which remain hypotheses?

**Strong:** "Hypothesis: adding a section on `SEO agêntico vs automação de SEO` may improve intent fit because two top results address automation boundaries."

**Weak:** "This will increase traffic by 40%."

Write hypotheses as testable ideas, not promises. Include evidence references and limitations so a human can decide whether to approve or request more research.

## Output Format

Write the report to `project/workbench/seo-analysis/<keyword-slug>.yaml` unless the user asks for an inline preview first. Use this structure:

```yaml
status: complete | blocked | incomplete
keyword: ""
provider: dataforseo | websearch
provider_reason: ""
websearch_bypass:
  approved: true | false
  aprovado_por: null
  confirmation_text: null
  reason: null
  consequence: null
  timestamp: null
market_context:
  country_or_market: ""
  location: ""
  language: ""
  device: desktop | mobile
  generated_at: ""
keyword_metrics:
  volume: null
  cpc: null
  competition: null
sources:
  serp:
    - path: project/sources/serp/...
  websearch:
    - path: project/sources/websearch/...
  pages:
    - url: ""
      evidence_ref: ""
top_results:
  - position: 1
    title: ""
    url: ""
    domain: ""
    snippet: ""
    observed_headings: []
    observed_meta: {}
top_3_comparison:
  intent_pattern: ""
  page_type_pattern: ""
  structure_pattern: ""
  proof_pattern: ""
  missing_or_weak_evidence: []
target:
  mode: url | domain | none
  url: null
  domain: null
  ranking_status: exact_url_ranking | same_domain_wrong_url | domain_ranking | not_ranking | unknown
  gaps: []
player_score:
  score: null
  confidence: null
  components: []
  interpretation: null
synthesis:
  intent: ""
  opportunities: []
  risks: []
hypotheses:
  - hypothesis: ""
    evidence_refs: []
    validation_needed: ""
limitations: []
next_actions: []
```

If blocked by a missing provider or missing bypass approval, return `status: blocked`, describe the gate, and do not invent a partial SERP.

## Examples

### Example: DataForSEO Analysis
Input: "Analyze `seo agêntico` for Brazil in pt-BR desktop. Target page is `https://example.com/seo-agentico/`."

Output: "Use DataForSEO, record Brazil, `pt-BR`, desktop, timestamp, compare the top 3 organic pages, mark the target as outside top 10 if supported by evidence, interpret page gaps and player score, and write hypotheses with accents preserved in Portuguese prose."

### Example: WebSearch Bypass
Input: "DataForSEO is unavailable. Use WebSearch anyway. I approve this bypass because this is only a rough exploratory analysis."

Output: "Use `provider: websearch`, record the written approval and consequence, set unavailable keyword metrics to `null`, disclose limitations, and keep ranking claims limited to the captured WebSearch results."

### Example: Weak Execution
Input: "Analyze the ranking opportunity for `seo agêntico`."

Output: "Search the web, guess that volume is high, say competitors have strong backlinks, and recommend publishing to the brain." This is weak because it bypasses DataForSEO without approval, fabricates metrics and backlinks, and treats hypotheses as approved strategy.

## Related Skills

- `keyword-research`: use when the primary task is keyword discovery, clustering, or metric collection before SERP analysis.
- `content-seo`: use after this analysis when the user wants a content brief or draft.
- `topic-cluster`: use after enough approved analysis exists to organize topics into a cluster.
- `technical-seo`: use when the primary task is crawling, rendering, or auditing page health rather than interpreting one keyword SERP.
