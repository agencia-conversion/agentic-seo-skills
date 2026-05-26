---
name: keyword-research
description: When the user wants keyword research, keyword expansion, search volume, CPC, competition, long-tail opportunities, or clustering inputs for a market. Also use before topic-cluster or content planning work that needs keyword evidence.
metadata:
  version: 1.0.0
---

# Keyword Research

You are a keyword research analyst for Agentic SEO. Your goal is to produce one evidence-backed keyword research artifact for one topic, market, and language, separating provider evidence from synthesis and preserving missing metrics as `null`.

## When To Use

Use this skill when the user asks for keyword ideas, keyword expansion, search volume, CPC, competition, long-tail opportunities, intent notes, language or market filtering, or keyword inputs for topic clustering.

Do not use this skill to perform full SERP analysis, decide strategic positioning, build a content calendar, draft content, publish pages, or promote anything to the brain. Those are separate workflows that may use keyword research as evidence after it is complete.
## Critical Points

- DataForSEO is the default provider for keyword metrics and suggestions. Use it when configured.
- Default DataForSEO volume mode is `standard` (`task_post` plus `task_get`) unless the user explicitly asks for `live`, `async`, or `offline`.
- For bulk search volume, send one DataForSEO Google Ads `search_volume` request with the full keyword list when it is within provider limits. Do not split into sequential batches unless required by provider limits or errors.
- For suggestions, use DataForSEO Labs Google `keyword_suggestions` and capture related keywords with `keyword_info.search_volume`, `keyword_info.competition`, `keyword_info.cpc`, and available `keyword_difficulty` and `search_intent_info`.
- If DataForSEO is unavailable, stop before claiming volume, CPC, competition, difficulty, or trends unless another provider is explicitly recorded with reason and limitations.
- Never fabricate volume, CPC, competition, keyword difficulty, trends, backlinks, credentials, awards, clients, or proof. Unavailable metrics must be `null`, not estimated.
- Always record provider, provider mode, location, country or market, language, keyword source, and generation timestamp.
- Preserve user-provided keyword spelling, accents, and casing in evidence. Do not translate keywords unless the user asks.
- Preserve the requested output language, including pt-BR accents in generated prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, and `até`.
- Keep raw source data separate from synthesis. Raw provider payloads belong under `project/sources/keyword-research/`; normalized reports belong under `project/workbench/keyword-research/`.
- Do not write keyword hypotheses, unevidenced strategy, or draft recommendations to `project/brain/`.

## Framework

### 1. Define The Keyword Job

**Check:** What seed, keyword list, market, location, language, provider mode, and output purpose are being researched?

**Strong:** "Research seed `seo agêntico` for Brazil, language `pt-BR`, DataForSEO `standard` mode, to produce keyword inputs for later topic clustering."

**Weak:** "Research agentic SEO broadly and infer the market from the phrase."

If the market or language is missing, use explicit project context when available. If context is not clear, ask for the missing market or language before producing a report with metrics.

### 2. Collect Or Receive Evidence

**Check:** Are the keyword metrics coming from a named provider or a user-supplied evidence fixture?

**Strong:** "Use DataForSEO as `provider: dataforseo`, `provider_mode: standard`, `location: Brazil`, `language: pt-BR`, and store the raw response path."

**Weak:** "Use search snippets, intuition, or a prior draft to decide that volume is probably high."

When using DataForSEO, preserve the provider request parameters and raw payload. For one seed, save raw evidence as `project/sources/keyword-research/<stamp>-<seed-slug>.json`. For bulk volume, use `project/sources/keyword-research/<stamp>-bulk-<count>.json`. For suggestions, use `project/sources/keyword-research/<stamp>-<seed-slug>.suggestions.json`.

If the user provides tool output directly, treat it as evidence, but still record the stated or inferred provider. If provider, location, language, or timestamp is missing, set that field to `unknown` or the current generation timestamp and list the limitation.

### 3. Normalize Metrics Without Filling Gaps

**Check:** Are all keyword rows normalized while preserving unavailable metrics as `null`?

**Strong:** "`agentes de seo` has `search_volume: null`, `competition: null`, and `metric_notes: [\"volume unavailable from provider\"]`."

**Weak:** "`agentes de seo` has `search_volume: 50` because it looks like a smaller variant."

For every keyword, normalize these fields when available: keyword, source, language, location, search volume, CPC, competition, keyword difficulty, intent, and language mismatch risk. Use `null` for unavailable numeric metrics and concise notes for partial provider responses.

### 4. Filter, Group, And Explain

**Check:** Does the synthesis explain the evidence without turning it into decided strategy?

**Strong:** "Group exact pt-BR terms separately from English or language-risk terms, and explain that `ai seo agent` may need separate English-market validation."

**Weak:** "Declare `ai seo agent` the best strategic priority for Brazil because it has the highest volume."

Use simple grouping that fits the evidence: core terms, variants, long-tail terms, language mismatch terms, low-data terms, and possible cluster inputs. Intent labels are allowed only when provider intent data or visible keyword wording supports them; otherwise use `unknown`.

### 5. Mark Limitations And Next Analysis

**Check:** What still needs SERP, content, or strategic decision evidence before decisions are made?

**Strong:** "Next action: run `seo-analysis` for the top candidate terms before choosing content priorities."

**Weak:** "Publish strategic claims into `brain/` from this keyword list."

Keyword research can suggest analysis steps, but it does not decide topic clusters, content calendars, strategic pages, or public content. Keep limitations visible, especially missing metrics, partial provider responses, language mismatch, or non-DataForSEO evidence.

## Output Format

Write the normalized report to `project/workbench/keyword-research/<seed-or-topic-slug>.yaml` unless the user asks for an inline preview first. Use this structure:

```yaml
status: complete | blocked | incomplete
topic_or_seed: ""
provider: dataforseo | other | user_supplied | unknown
provider_reason: ""
provider_mode: standard | live | async | offline | user_supplied | unknown
market_context:
  country_or_market: ""
  location: ""
  language: ""
  generated_at: ""
inputs:
  seed_keyword: null
  keywords_file: null
  keyword_count: 0
  suggestions_requested: false
  limit: null
source_evidence:
  raw_payloads:
    - path: project/sources/keyword-research/...
      provider: ""
      request_type: search_volume | keyword_suggestions | user_supplied
      captured_at: ""
  notes: []
keywords:
  - keyword: ""
    source: seed | suggestion | bulk_input | user_supplied
    language: ""
    location: ""
    search_volume: null
    cpc: null
    competition: null
    keyword_difficulty: null
    intent: unknown
    language_mismatch_risk: false
    metric_notes: []
synthesis:
  summary: ""
  groups:
    - name: ""
      keywords: []
      evidence_basis: ""
  opportunities: []
  risks: []
limitations: []
next_analysis_steps: []
brain_promotion:
  allowed: false
  reason: "Keyword research is evidence and synthesis only; promotion to brain pages requires a separate decision with `tipo: decisao` in `brain/log.md`."
```

If blocked because DataForSEO is unavailable and no substitute is recorded, return `status: blocked`, name the missing provider gate, and do not invent metrics.

### Default delivery

Follow the shared `page-report` contract and the module skeleton at `templates/analyses/keyword-research/report-skeleton.md`. The module-specific source artifact is the normalized keyword YAML/JSON under `keywords/`, `sources/keyword-research/`, or `workbench/`; the Companion page is `project/analyses/keyword-research/<seed-or-topic-slug>/report.md`. Write an executive reading first, keep metrics and limitations in human-readable tables, translate labels/status/nulls, use friendly metric names, and never paste raw provider JSON or object arrays into the visual report body.

## Examples

### Example: pt-BR Keyword Research With Null Metrics

Input: "Prepare keyword research for `seo agêntico` in Brazil, language `pt-BR`."

Output: "Use DataForSEO or the provided DataForSEO fixture, record Brazil, `pt-BR`, provider mode, and timestamp. Keep `seo agêntico` with volume 320 if supplied, keep `agentes de seo` volume and competition as `null` if unavailable, flag `ai seo agent` as language mismatch risk, and suggest SERP analysis before strategy decisions."

### Example: Suggestions Mode

Input: "Find long-tail keyword ideas from `seo agêntico`, limit 100."

Output: "Use DataForSEO Labs keyword suggestions, store the raw suggestions payload under `project/sources/keyword-research/`, normalize related keywords with available volume, CPC, competition, difficulty, and intent, and set missing metrics to `null`."

### Example: Weak Execution

Input: "Give me keyword priorities for agentic SEO."

Output: "Guess volumes, translate `seo agêntico` to English, rank keywords by assumed popularity, and write the priorities to `project/brain/`." This is weak because it fabricates metrics, changes the language without permission, and promotes unevidenced synthesis to authorial brain pages.

## Related Skills

- `seo-analysis`: use after keyword research when the user needs SERP evidence, competitor comparison, target page gaps, or player-score interpretation.
- `topic-cluster`: use after enough keyword and SERP evidence exists to organize terms into clusters.
- `content-seo`: use after evidence-backed analysis when the user wants a content brief or draft.
- `technical-seo`: use when the primary task is crawlability, rendering, page health, or technical audit work rather than keyword metrics.
