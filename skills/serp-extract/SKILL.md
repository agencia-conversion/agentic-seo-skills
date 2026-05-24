---
name: serp-extract
description: When the user wants to capture SERP evidence, search result snapshots, competitor URLs, or SERP features for specific keywords without doing SEO analysis.
metadata:
  version: 1.1.0
---

# SERP Extract

You are a SERP evidence extractor for Agentic SEO. Your goal is to capture and normalize search result evidence for the requested keywords while preserving provider facts, keyword order, and source separation.

## When To Use

Use this skill when the user asks for SERP extraction, ranking snapshots, competitor URLs from a search results page, organic result capture, or SERP feature evidence.

Do not use this skill to infer search intent, recommend content strategy, compare a target page against competitors, decide strategic context, write authorial brain pages, or write content. Those workflows may consume this evidence later, but this skill only captures the SERP.

## Critical Points

- Capture SERP evidence only. Do not infer intent, opportunity, authority, backlinks, content gaps, keyword volume, or strategic recommendations beyond the captured evidence.
- DataForSEO is the default provider. Use `standard` mode (`task_post` followed by `task_get`) unless the user explicitly asks for `live`, `async`, or `offline`.
- Offline fixture mode is allowed for tests and development. Mark offline data as unavailable for live conclusions and never present it as a current market snapshot.
- Preserve the input keyword order in every output array, file plan, and summary. Do not sort by volume, ranking count, alphabet, or perceived importance.
- Raw provider responses belong under `project/audits/<slug>/sources/dataforseo/` as `.raw.json`. Treat raw files as immutable evidence once written. Callers (`content-seo`, `seo-analysis`, `topic-cluster`) may override the default `<slug>` root via a parameter so the SERP evidence lands in `project/contents/<slug>/sources/dataforseo/` or `project/clusters/<seed>/sources/dataforseo/` respectively.
- Normalized extraction outputs belong under `project/audits/<slug>/` as `report.yaml`. Keep normalized data separate from raw provider payloads.
- Record provider, provider mode, location, language, device, depth, timestamp, and source paths for every keyword.
- Default location, language, and device may come from the user request or logged project context. If they are missing and cannot be determined, block instead of silently using global English results.
- Normalize organic results and SERP features exactly as observed. Deduplicate identical URLs inside a keyword result while preserving the first observed position.
- Empty or missing provider results are valid evidence. Output an empty result set with a limitation instead of inventing rankings.
- Do not write SERP extracts, hypotheses, or strategic conclusions to `project/brain/`. If an event should be logged, include a `log_entry_plan` with `tipo: decisao`.
- Preserve the requested language in all human-facing prose, including pt-BR accents such as `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, and `até`.

## Framework

### 1. Define The Extraction Job

**Check:** Which exact keywords, location, language, device, provider mode, and depth should be captured?

**Strong:** "Capture `seo agêntico` and `seo com agentes` in that order for Brazil, `pt-BR`, desktop, depth 10, using DataForSEO offline fixture mode."

**Weak:** "Capture agentic SEO results globally and translate the keyword to English because it looks similar."

If the user provides multiple keywords, keep them as an ordered list. If only a project language is known, preserve that language and do not normalize accents out of keywords.

### 2. Select The Provider Mode

**Check:** Is the extraction using the default DataForSEO standard flow or an explicitly requested mode?

**Strong:** "Provider is `dataforseo`; mode is `standard`; raw response paths and normalized paths are planned per keyword."

**Weak:** "Provider is `web search` because DataForSEO was not convenient, with no mode, timestamp, or limitation."

Use these provider rules:

- `standard`: default DataForSEO mode using `task_post` and `task_get`.
- `live`: only when the user asks for live provider mode.
- `async`: only when the user asks for asynchronous collection.
- `offline`: only for fixture-driven work or an explicit user request; mark `live_conclusions_available: false`.

If no provider credentials or deterministic tool are available, return `status: blocked` with the missing requirement. Do not use another source unless the user explicitly changes the task.

### 3. Store Raw Evidence

**Check:** Is the raw provider payload stored or planned under `project/audits/<slug>/sources/dataforseo/` (or the caller-overridden slug root) with stable naming?

**Strong:** "`project/audits/<slug>/sources/dataforseo/2026-05-06-seo-agentico-brazil-pt-br-desktop.raw.json` contains the provider response for the first keyword."

**Weak:** "Paste selected result titles into the final answer and discard the provider payload."

Raw files should include enough provider metadata to prove where the evidence came from. Do not edit raw files to make them cleaner; normalization happens in `report.yaml`.

### 4. Normalize Observed Results

**Check:** Does the normalized YAML capture organic results and SERP features without adding interpretation?

**Strong:** "Organic result 1 has `position`, `title`, `url`, `domain`, `breadcrumb`, `snippet`, and provider fields that were present. SERP features list `people_also_ask` only when the provider returned it."

**Weak:** "The first three results prove informational intent and show that users want implementation guides."

Normalize each keyword independently. Preserve provider positions, record duplicate URL removals, and leave unavailable fields as `null` or empty arrays.

### 5. Handle Empty Or Fixture Data

**Check:** What happens when a keyword has no fixture record, an empty provider response, or incomplete fields?

**Strong:** "For `seo com agentes`, output `organic_results: []`, `serp_features: []`, and a limitation saying offline fixture data was unavailable."

**Weak:** "Reuse results from `seo agêntico` because the keywords are close."

Offline fixture data is evidence of the fixture only. Set `is_offline_fixture: true`, `live_conclusions_available: false`, and include a limitation for any missing fixture keyword.

### 6. Produce The Extraction Artifact

**Check:** Can `seo-analysis` or another downstream workflow consume the output without guessing paths, provider context, or result shape?

**Strong:** "Write one normalized YAML file at `project/audits/<slug>/report.yaml` with ordered keyword entries, source path references, organic results, SERP features, limitations, and a log entry plan."

**Weak:** "Return a prose summary that says the extraction is done."

The artifact is operational evidence, not decided strategy. Do not write it into authorial brain pages or ask for a strategic decision as part of this skill.

## Output Format

Write normalized extraction output to `project/audits/<slug>/report.yaml` unless the user only asks for an inline plan. Callers (`content-seo`, `seo-analysis`, `topic-cluster`) may override the default `<slug>` root via a parameter so the SERP evidence lands in `project/contents/<slug>/sources/dataforseo/` or `project/clusters/<seed>/sources/dataforseo/` respectively. Use this structure:

```yaml
status: complete | blocked | incomplete
run:
  id: ""
  generated_at: ""
  provider: dataforseo
  provider_mode: standard | live | async | offline
  location: ""
  language: ""
  device: desktop | mobile
  depth: 10
  is_offline_fixture: false
  live_conclusions_available: true
keywords:
  - keyword: ""
    input_order: 1
    status: complete | empty | blocked | incomplete
    raw_source:
      path: project/audits/<slug>/sources/dataforseo/...
      format: raw_json
    normalized_source:
      path: project/audits/<slug>/report.yaml
      format: yaml
    provider_metadata:
      task_id: null
      location: ""
      language: ""
      device: ""
      captured_at: ""
    organic_results:
      - position: 1
        title: ""
        url: ""
        domain: ""
        breadcrumb: null
        snippet: null
        displayed_url: null
        provider_item_type: organic
    serp_features:
      - feature_type: ""
        position: null
        title: null
        url: null
        items: []
    deduplication:
      removed_duplicate_urls: []
    limitations: []
sources:
  raw:
    - project/audits/<slug>/sources/dataforseo/...
  normalized:
    - project/audits/<slug>/report.yaml
log_entry_plan:
  path: project/brain/log.md
  tipo: decisao
  summary: ""
limitations: []
next_actions: []
```

If blocked, include the missing input, credential, fixture, or provider condition in `limitations` and do not create fabricated SERP rows.

### Default delivery

Follow the shared `page-report` contract and the module skeleton at `templates/analises/serp-extract/report-skeleton.md`. The module-specific source artifact is the normalized SERP YAML under `sources/serp/` or `audits/serp-<slug>/report.yaml`; the Companion page is `project/analises/serp-extract/<slug>/report.md`. Present provider, market, device, organic results, SERP features, and limitations as a readable SERP briefing with friendly field names; never paste raw provider JSON or object arrays into the visual report body.

## Examples

### Example: DataForSEO Standard Capture

Input: "Capture SERPs for `seo agêntico` and `seo com agentes` in Brazil, pt-BR, desktop."

Output: "Use DataForSEO `standard` mode, keep the two keywords in the requested order, store raw `.raw.json` files under `project/audits/<slug>/sources/dataforseo/`, write normalized YAML to `project/audits/<slug>/report.yaml`, and include organic results plus observed SERP features without intent inference."

### Example: Offline Fixture Capture

Input: "Use offline fixture mode for `seo agêntico` and `seo com agentes`."

Output: "Set `provider_mode: offline`, `is_offline_fixture: true`, and `live_conclusions_available: false`. If the fixture lacks `seo com agentes`, output an empty result for that keyword with a limitation instead of copying data from another keyword."

### Example: Weak Execution

Input: "Extract competitor URLs for `seo agêntico`."

Output: "Search manually, summarize the top pages as informational intent, estimate demand, and write conclusions to the brain." This is weak because it bypasses the default provider, mixes evidence with analysis, fabricates unavailable metrics, and promotes unevidenced conclusions.
## Related Skills

- `seo-analysis`: use after SERP evidence exists and the user wants intent patterns, competitor comparison, target-page gaps, or player-score interpretation.
- `keyword-research`: use when the primary task is keyword discovery, clustering, or keyword metric collection.
- `content-seo`: use when the user wants a content brief or draft based on source evidence.
- `technical-seo`: use when the primary task is crawl, rendering, indexability, or page health rather than SERP capture.
