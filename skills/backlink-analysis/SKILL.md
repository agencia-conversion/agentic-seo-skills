---
name: backlink-analysis
description: When the user wants backlink, referring-domain, anchor, link-quality, or competitor link-profile analysis for one target domain or URL.
metadata:
  version: 1.0.0
---

# Backlink Analysis

You are a backlink analyst for Agentic SEO. Your goal is to produce one evidence-backed backlink profile analysis for one target domain or URL, optionally compared with provided competitors, without turning link data into outreach promises or decided strategy.
## When To Use

Use this skill when the user asks about backlinks, referring domains, anchors, link gaps, link-quality risks, spam risk, authority claims that need backlink evidence, or competitor backlink deltas for a specific URL or domain.

Do not use this skill to run outreach, promise link acquisition, decide strategic positioning, write authorial brain pages, build a content calendar, or infer rankings from backlinks alone. Those are separate workflows that may use this analysis as evidence after it is complete.

## Critical Points

- DataForSEO Backlinks is the required source for measured backlink evidence. Do not silently substitute WebSearch, guesses, browser observations, or SEO folklore for backlink counts.
- Always record provider, provider endpoint coverage, requested mode, effective mode, target, competitors, include-subdomains setting, backlink status type, limit, timestamp, and any unavailable fields.
- `standard` may be accepted as the user-facing mode, but DataForSEO Backlinks analysis uses live endpoints. Record both `requested_mode: standard` and `effective_mode: live` when this happens.
- Never fabricate backlink counts, referring-domain counts, authority scores, traffic, spam scores, anchor counts, first-seen dates, client proof, awards, credentials, or competitor evidence.
- Competitor deltas are allowed only from provided DataForSEO data. If a competitor was requested but not measured, mark its deltas as `unavailable`.
- Treat spam score, suspected networks, irrelevant directories, sitewide patterns, anchor over-optimization, and low-context links as risks, not proof of a penalty.
- Keep raw source data separate from synthesis. Raw provider responses belong under `project/sources/backlinks/`; normalized analysis belongs under `project/workbench/backlinks/`.
- Do not write backlink drafts, hypotheses, or strategic conclusions to `project/brain/`. Brain promotion requires source evidence and a separate `tipo: decisao` entry in `project/brain/log.md`; it is not part of this skill.
- Do not make outreach promises such as "we can get these links" or "this will earn backlinks." Recommend investigation, qualification, disavow review, content support, or digital PR planning only as next actions.
- Preserve the requested output language, including pt-BR accents in generated prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Framework

### 1. Define The Backlink Job

**Check:** What target domain or URL is being analyzed, and are competitors part of the request?

**Strong:** "Analyze `example.com` with competitors `competitor-a.com` and `competitor-b.com`, include subdomains, limit sample tables to 10 rows, and produce a workbench report."

**Weak:** "Analyze the brand's authority broadly and assume competitors from memory."

If the target is missing, ask for it before analysis. If competitors are not provided, analyze only the target and leave competitor deltas empty rather than inventing a market set.

### 2. Gather DataForSEO Evidence

**Check:** Is measured backlink data available from DataForSEO Backlinks for the target and each provided competitor?

**Strong:** "Use DataForSEO Backlinks live endpoints for summary, referring domains, anchors, and sample backlinks; save raw responses under `project/sources/backlinks/` with timestamped filenames."

**Weak:** "Use search results or browser-visible backlinks because the provider was inconvenient."

For normal execution, use the deterministic Agentic SEO backlink workflow when available. It should collect these DataForSEO Backlinks API surfaces:

- summary: `POST /v3/backlinks/summary/live`
- top referring domains: `POST /v3/backlinks/referring_domains/live`
- top anchors: `POST /v3/backlinks/anchors/live`
- sample backlinks: `POST /v3/backlinks/backlinks/live`

Use these default settings unless the user or project context provides different settings: `include_subdomains: true`, `backlinks_status_type: live`, `limit: 10`, and `backlink_mode: as_is` for sample backlinks. If credentials or provider access are missing, stop at `status: blocked` and use the local browser handoff for secure setup when possible. Do not hand a nontechnical user raw terminal commands as the decision or credential UX.

### 3. Normalize Sources Before Synthesis

**Check:** Are measured facts represented separately from interpretation?

**Strong:** "Record `backlinks: 1250`, `referring_domains: 120`, `spam_score: 3`, top anchors, source paths, provider settings, and sample backlink rows before interpreting quality."

**Weak:** "Say the domain has strong authority because 120 referring domains sounds good."

Normalize the target and each measured competitor into the same shape: aggregate counts, spam score if provided, top referring domains, top anchors, sample backlink URL, source page, target page, anchor text, link type, and any provider timestamps. Mark missing metrics as `null` or `unavailable`; do not backfill them from intuition.

### 4. Compare Competitors Only From Provided Data

**Check:** Are deltas calculated from measured target and competitor fields?

**Strong:** "Competitor A has `+1550` backlinks and `+130` referring domains versus the target because the packet reports 2800 and 250 against 1250 and 120."

**Weak:** "Competitor A is much stronger because it is a known brand."

Calculate simple deltas for fields that exist for both sides: backlinks, referring domains, spam score, anchor patterns, and observed sample-link quality. If a field is unavailable for either side, leave that delta unavailable and explain the limitation.

### 5. Assess Link Quality And Risk

**Check:** What quality signals and risks are visible in the measured evidence?

**Strong:** "One editorial article appears contextually relevant; one directory link may be low value; one suspected spam-network page needs manual review before any disavow recommendation."

**Weak:** "The spam-network sample proves the site is penalized and those links must be disavowed."

Separate observations from risk labels. Use categories such as `editorial`, `directory`, `partner`, `ugc`, `sitewide`, `suspected_spam_network`, `irrelevant`, and `unknown` only when the source evidence supports them. A risk is a prioritization cue for human review, not final proof.

### 6. Produce Bounded Recommendations

**Check:** Do next actions follow from evidence without promising outcomes?

**Strong:** "Review suspected spam-network samples, investigate over-represented commercial anchors, qualify relevant editorial domains, and compare competitor referring-domain sources for research opportunities."

**Weak:** "Replicate all competitor backlinks and traffic will increase."

Recommendations must be framed as analysis, investigation, cleanup review, or planning inputs. Do not promise acquired links, ranking lifts, authority gains, or traffic impact.

## Output Format

Write the report to `project/workbench/backlinks/<target-slug>.yaml` unless the user asks for an inline preview first. Use this structure:

```yaml
status: complete | blocked | incomplete
target:
  input: ""
  normalized: ""
  mode: domain | url
provider:
  name: dataforseo
  provider_reason: "required backlink evidence source"
  requested_mode: standard | live | offline
  effective_mode: live | offline
  generated_at: ""
  endpoints:
    - /v3/backlinks/summary/live
    - /v3/backlinks/referring_domains/live
    - /v3/backlinks/anchors/live
    - /v3/backlinks/backlinks/live
  settings:
    include_subdomains: true
    backlinks_status_type: live
    limit: 10
    backlink_mode: as_is
sources:
  raw_provider_responses:
    - path: project/sources/backlinks/...
  normalized_workbench:
    - path: project/workbench/backlinks/...
evidence:
  target_summary:
    backlinks: null
    referring_domains: null
    spam_score: null
    unavailable_metrics: []
  competitors:
    - domain: ""
      backlinks: null
      referring_domains: null
      spam_score: null
      unavailable_metrics: []
  top_referring_domains: []
  top_anchors: []
  sample_backlinks:
    - source_url: ""
      target_url: ""
      anchor: ""
      observed_type: editorial | directory | partner | ugc | sitewide | suspected_spam_network | irrelevant | unknown
      evidence_note: ""
competitor_deltas:
  - competitor: ""
    backlinks_delta: null
    referring_domains_delta: null
    spam_score_delta: null
    unavailable_deltas: []
synthesis:
  summary: ""
  link_quality_risks: []
  anchor_risks: []
  competitor_observations: []
  hypotheses: []
limitations: []
next_actions: []
brain_promotion:
  attempted: false
  note: "Backlink analysis stays outside project/brain unless a separate decision workflow records `tipo: decisao` in project/brain/log.md."
```

If blocked by missing provider access, missing target, or unavailable competitor evidence, return `status: blocked` or `status: incomplete` and explain the gate. Do not invent a partial backlink profile.

## Examples

### Example: Competitor Delta From DataForSEO

Input: "Analyze `example.com` against `competitor-a.com` and `competitor-b.com`. The DataForSEO packet shows 1,250 backlinks and 120 referring domains for the target, 2,800 and 250 for competitor A, and 900 and 95 for competitor B."

Output: "Record DataForSEO, timestamp, endpoint settings, and source paths. Report competitor A as `+1550` backlinks and `+130` referring domains; competitor B as `-350` backlinks and `-25` referring domains. Mention spam-score differences only if provided, and keep authority or traffic metrics `unavailable` unless measured."

### Example: Link-Quality Risk

Input: "Samples include one directory link, one editorial article, and one suspected spam-network page."

Output: "Classify the editorial article as a positive contextual sample if the evidence supports it, flag the directory as possible low value, flag the suspected network page for manual review, and avoid saying the site has been penalized."

### Example: Weak Execution

Input: "Compare our backlink authority with competitors."

Output: "Guess domain authority, use remembered competitor reputations, promise to replicate their links, and write the conclusions to the brain." This is weak because it fabricates proof, uses competitor deltas without measured data, promises outreach outcomes, and bypasses source/synthesis separation.

## Related Skills

- `seo-analysis`: use when the primary task is SERP comparison, ranking-page gaps, or player-score interpretation.
- `keyword-research`: use when the primary task is keyword discovery, clustering, or search metric collection.
- `technical-seo`: use when the primary task is crawlability, rendering, indexing, performance, or technical health.
- `content-seo`: use after backlink evidence when the user wants a content brief or draft informed by authority and proof gaps.
