---
name: backlink-analysis
description: When the user wants backlink, referring-domain, anchor, link-quality, link-gap, link-intersect, anchor-diff, link-velocity, brand-mention, or competitor link-profile analysis for one target domain or URL.
metadata:
  version: 2.0.0
---

# Backlink Analysis

You are a backlink analyst for Agentic SEO. Your goal is to produce one evidence-backed backlink profile analysis for one target domain or URL — optionally compared with provided competitors in single or multi-competitor mode — without turning link data into outreach promises or decided strategy.

## When To Use

Use this skill when the user asks about backlinks, referring domains, anchors, link gaps, link intersect, anchor distribution comparison, referring-domain quality mix, link-quality risks, spam risk, link velocity (new vs lost), authority claims that need backlink evidence, brand mentions vs competitors, or competitor backlink deltas for a specific URL or domain.

Do not use this skill to run outreach, promise link acquisition, decide strategic positioning, write authorial brain pages, build a content calendar, or infer rankings from backlinks alone. Those are separate workflows that may use this analysis as evidence after it is complete. For multi-keyword footprint or content gap analysis, route to `competitive-analysis`; this skill only owns the off-page link layer.

## Critical Points

- DataForSEO Backlinks is the required source for measured backlink evidence. Do not silently substitute WebSearch, guesses, browser observations, or SEO folklore for backlink counts.
- Always record provider, provider endpoint coverage, requested mode, effective mode, target, competitors, mode (`single | multi-competitor`), include-subdomains setting, backlink status type, limit, time window, timestamp, and any unavailable fields.
- `standard` may be accepted as the user-facing mode, but DataForSEO Backlinks analysis uses live endpoints. Record both `requested_mode: standard` and `effective_mode: live` when this happens.
- Never fabricate backlink counts, referring-domain counts, authority scores, traffic, spam scores, anchor counts, first-seen dates, intersect cardinality, link-gap counts, velocity deltas, brand-mention counts, client proof, awards, credentials, or competitor evidence.
- Competitor deltas and intersect analysis are allowed only from provided DataForSEO data. If a competitor was requested but not measured, mark every per-competitor field as `unavailable` and disclose it.
- Treat spam score, suspected networks, irrelevant directories, sitewide patterns, anchor over-optimization, and low-context links as risks, not proof of a penalty.
- Keep raw source data separate from synthesis. Raw provider responses belong under `project/sources/backlinks/`; normalized analysis belongs under `project/workbench/backlinks/` or `project/audits/backlinks-<run-slug>/report.yaml`.
- Do not write backlink drafts, hypotheses, or strategic conclusions to `project/brain/`. Brain promotion requires source evidence and a separate `type: decision` entry in `project/brain/log.md`; it is not part of this skill.
- Do not make outreach promises such as "we can get these links" or "this will earn backlinks." Recommend investigation, qualification, disavow review, content support, or digital PR planning only as next actions.
- Preserve the requested output language, including pt-BR accents in generated prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Modes

- `single`: one target (domain or URL), no competitors. Produces summary, top referring domains, top anchors, sample backlinks, and link-quality observations.
- `multi-competitor`: one target plus 1-4 competitors (domains or URLs). Adds **Link Gap**, **Link Intersect**, **Anchor Distribution Comparison**, **Referring-Domain Quality Mix**, **Link Velocity Delta**, and — when the target/competitors are URLs — **Page-Level Link Gap**. `--with-brand-mentions` adds the optional Brand Mention Gap surface when SERP and keyword-mention evidence is provided.

Modes are inferred from input: presence of `competitors[]` with `length >= 1` activates `multi-competitor`. The skill never invents competitors.

## Framework

### 1. Define The Backlink Job

**Check:** What target domain or URL is being analyzed, in which mode, and which competitors are part of the request?

**Strong:** "Analyze `example.com` in `multi-competitor` mode against `competitor-a.com` and `competitor-b.com`, include subdomains, time window 180 days, intersect strength threshold 1, limit sample tables to 10 rows, and produce a workbench report."

**Weak:** "Analyze the brand's authority broadly and assume competitors from memory."

If the target is missing, ask for it before analysis. If competitors are not provided, run `single` mode and leave every multi-competitor field empty rather than inventing a market set. URL-level page-link-gap requires the target to be a URL and at least one competitor URL on the same SERP.

### 2. Gather DataForSEO Evidence

**Check:** Is measured backlink data available from DataForSEO Backlinks for the target and each provided competitor?

**Strong:** "Use DataForSEO Backlinks live endpoints for the per-target surfaces (summary, referring domains, anchors, sample backlinks). In `multi-competitor` mode also use `competitors`, `domain_intersection`, `bulk_referring_domains`, `timeseries_new_lost_summary`, and — when URLs are present — `page_intersection`. Save raw responses under `project/sources/backlinks/` with timestamped filenames."

**Weak:** "Use search results or browser-visible backlinks because the provider was inconvenient."

Endpoint coverage:

| Surface | Endpoint | Activation |
|---|---|---|
| Per-target summary | `POST /v3/backlinks/summary/live` | always |
| Top referring domains | `POST /v3/backlinks/referring_domains/live` | always |
| Top anchors | `POST /v3/backlinks/anchors/live` | always |
| Sample backlinks | `POST /v3/backlinks/backlinks/live` | always |
| Competitor discovery validation | `POST /v3/backlinks/competitors/live` | `multi-competitor` |
| Domain intersection | `POST /v3/backlinks/domain_intersection/live` | `multi-competitor` |
| Bulk referring-domain totals | `POST /v3/backlinks/bulk_referring_domains/live` | `multi-competitor` |
| Velocity (new vs lost) | `POST /v3/backlinks/timeseries_new_lost_summary/live` | `multi-competitor` |
| History (raw timeseries) | `POST /v3/backlinks/history/live` | when `--with-history` |
| Page intersection | `POST /v3/backlinks/page_intersection/live` | `multi-competitor` + URL inputs |

Use these default settings unless the user or project context overrides them: `include_subdomains: true`, `backlinks_status_type: live`, `limit: 10` for per-target surfaces, `limit: 100` for intersection tables, `backlink_mode: as_is` for sample backlinks, `time_window: 180` days for velocity. If credentials are missing, stop at `status: blocked` and use the local browser handoff for secure setup. Never hand a nontechnical user raw terminal commands as the decision or credential UX.

### 3. Normalize Sources Before Synthesis

**Check:** Are measured facts represented separately from interpretation, and is the per-player shape identical across target and competitors?

**Strong:** "Record per-player `backlinks`, `referring_domains`, `spam_score`, `rank`, top anchors, top referring domains, sample backlinks, plus per-pair intersect counts, gap counts, and velocity windows."

**Weak:** "Say the domain has strong authority because 120 referring domains sounds good."

Normalize every measured player into the same row schema. Mark missing metrics as `null` or `unavailable`; do not backfill from intuition. Intersect, gap, and velocity tables must reference the provider response paths that produced them.

### 4. Compute Multi-Competitor Surfaces Only From Measured Data

**Check:** Are gap/intersect/anchor-diff/quality-mix/velocity tables grounded in DataForSEO rows for every cell?

**Strong:** "Link Gap row for `editor.example.org`: rank 720, observed on competitor-a and competitor-b, not observed on target; intersect strength 2; first seen 2025-08-12; sample anchors `agentic seo guide`, `automated seo`."

**Weak:** "Competitor A is much stronger because it is a known brand."

Per surface (full pseudo-code and edge cases in `references/multi-competitor.md`):

- **Link Gap** / **Link Intersect**: derived strictly from `domain_intersection` rows; never fabricated by subtracting RD lists. Link Gap emits when `strength(rd) >= intersect_strength_threshold AND rd ∉ RDs(target)`; Link Intersect emits when `rd ∈ RDs(target) AND ∀ c ∈ competitors : rd ∈ RDs(c)`.
- **Anchor Distribution Comparison**: bucketize per player into `branded | exact_match | partial_match | naked | generic | image_or_empty`. `branded` requires a user-supplied brand string; without it, the bucket stays 0% with a limitation.
- **Referring-Domain Quality Mix**: categorize RDs per player by `editorial | news | directory | partner | ugc | sitewide | suspected_spam_network | irrelevant | unknown` and by spam-score buckets `0-15 | 16-30 | 31+`. Use the provider category when present; otherwise `unknown`.
- **Link Velocity Delta**: per player, sum new and lost RDs inside `time_window_days`. Gap = competitor_new − target_new. Never extrapolate a missing window.
- **Page-Level Link Gap** (URL mode): per competitor URL identified by the user or via `attach_serp_extract_run`, emit RDs that link to the competitor URL set but not the target URL. Asset hint defaults to `unknown` and is upgraded only when the anchor or destination URL pattern justifies it.
- **Brand Mention Gap** (optional, `--with-brand-mentions`): requires `brand`, `competitor_brands[]`, and mention evidence rows. Sentiment is never inferred.

### 5. Assess Link Quality And Risk

**Check:** What quality signals and risks are visible in the measured evidence, per player?

**Strong:** "One editorial article appears contextually relevant on the target; competitor A's quality mix has 38% `suspected_spam_network` and an anchor distribution skewed to exact-match commercial terms, both noted as risks for further human review."

**Weak:** "The spam-network sample proves the site is penalized and those links must be disavowed."

Spam score and over-optimized anchor signals are prioritization cues for human review, not proof. Risk labels must point to the provider field that triggered them.

### 6. Produce Bounded Recommendations

**Check:** Do next actions follow from evidence without promising outcomes?

**Strong:** "Review suspected spam-network samples, investigate over-represented commercial anchors, qualify relevant editorial domains in Link Gap rows, and compare velocity deltas to inform a digital PR research plan."

**Weak:** "Replicate all competitor backlinks and traffic will increase."

Recommendations must be framed as analysis, investigation, cleanup review, or planning inputs. Do not promise acquired links, ranking lifts, authority gains, or traffic impact. Multi-competitor outputs feed `competitive-analysis` and digital PR planning but never auto-promote to `brain/`.

## Output Format

Write the report to `project/audits/backlinks-<run-slug>/report.yaml` for new runs (legacy `project/workbench/backlinks/<target-slug>.yaml` remains accepted on read). Use this structure:

```yaml
status: complete | blocked | incomplete
mode: single | multi-competitor
run_slug: ""
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
  endpoints: []
  settings:
    include_subdomains: true
    backlinks_status_type: live
    limit: 10
    intersection_limit: 100
    backlink_mode: as_is
    time_window_days: 180
    intersect_strength_threshold: 1
sources:
  raw_provider_responses:
    - path: project/sources/backlinks/...
  normalized_workbench:
    - path: project/audits/backlinks-<run-slug>/report.yaml
players:
  - role: target | competitor
    domain_or_url: ""
    backlinks: null
    referring_domains: null
    spam_score: null
    rank: null
    unavailable_metrics: []
    top_referring_domains: []
    top_anchors: []
    sample_backlinks: []
multi_competitor:
  link_gap:
    - referring_domain: ""
      rank: null
      intersect_strength: 0
      observed_on: []
      first_seen: null
      sample_backlink: null
  link_intersect:
    - referring_domain: ""
      anchors_by_player: []
      backlinks_by_player: []
  anchor_diff:
    by_player:
      - player: ""
        distribution: {}
    exclusive_to_competitors: []
  quality_mix:
    by_player:
      - player: ""
        categories: {}
        spam_buckets: {}
  velocity:
    time_window_days: 180
    by_player:
      - player: ""
        new_rds: null
        lost_rds: null
    deltas: []
  page_link_gap:
    - target_url: ""
      competitor_url: ""
      referring_domains_only_on_competitor: 0
      sample_rows: []
  brand_mentions:
    enabled: false
    domains_mentioning_competitor_not_target: []
synthesis:
  summary: ""
  link_quality_risks: []
  anchor_risks: []
  velocity_observations: []
  competitor_observations: []
  hypotheses: []
limitations: []
next_actions: []
brain_promotion:
  attempted: false
  note: "Backlink analysis stays outside project/brain unless a separate decision workflow records `type: decision` in project/brain/log.md."
```

In `single` mode, every `multi_competitor.*` collection stays empty. In `multi-competitor` mode, every empty collection must carry a `limitations` entry explaining why (no provider rows, time window too short, URLs missing, etc.).

If blocked by missing provider access, missing target, or unavailable competitor evidence, return `status: blocked` or `status: incomplete` and explain the gate. Do not invent a partial backlink profile.

### Default delivery

Follow the shared `page-report` contract and the module skeleton at `templates/analyses/backlink-analysis/report-skeleton.md`. The module-specific source artifact is the normalized YAML under `audits/backlinks-<run-slug>/`, `sources/backlinks/`, or `workbench/`; the Companion page is `project/analyses/backlink-analysis/<run-slug>/report.md`. Single-mode reports show the executive reading, KPI strip, comparison table, sample backlinks, and risks. Multi-competitor reports add Link Gap, Link Intersect, Anchor Distribution Comparison, Quality Mix, Velocity, optional Page-Level Link Gap, and optional Brand Mention Gap as readable tables. Never paste raw provider JSON or object arrays into the visual report body. See `references/multi-competitor.md` for the detailed multi-competitor decision rules, edge cases, and naming.

## Examples

### Example: Competitor Delta From DataForSEO (single)

Input: "Analyze `example.com` against `competitor-a.com` and `competitor-b.com`. The DataForSEO packet shows 1,250 backlinks and 120 referring domains for the target, 2,800 and 250 for competitor A, and 900 and 95 for competitor B."

Output: "Activate `multi-competitor` because two competitors were provided. Record provider, timestamp, endpoint settings, source paths. Per-player counts ship as observed. Skip Link Gap and Intersect if the packet only included summary fields; mark the multi-competitor section `incomplete` and explain the missing endpoints rather than inventing rows."

### Example: Link Gap And Intersect

Input: "Use the DataForSEO domain_intersection packet for target `example.com` vs `competitor-a.com` and `competitor-b.com`."

Output: "For every RD that the packet flags as linking to both competitors and not target, emit one Link Gap row with intersect strength 2, the provider-reported rank, and a sample backlink URL when available. For every RD present in all three lists, emit one Link Intersect row. Leave anchors_by_player empty when the packet did not include anchor breakdowns and add a limitation."

### Example: Weak Execution

Input: "Compare our backlink authority with competitors."

Output: "Guess domain authority, use remembered competitor reputations, promise to replicate their links, and write the conclusions to the brain." This is weak because it fabricates proof, uses competitor deltas without measured data, promises outreach outcomes, and bypasses source/synthesis separation.

## Related Skills

- `seo-analysis`: use when the primary task is SERP comparison, ranking-page gaps, or player-score interpretation.
- `competitive-analysis`: use when the user wants multi-keyword footprint, Share of Voice, content gap, head-to-head URL comparison, or brand positioning surfaces; it consumes this skill's `multi-competitor` output via `attach_backlink_analysis_run: <slug>`.
- `keyword-research`: use when the primary task is keyword discovery, clustering, or search metric collection.
- `technical-seo`: use when the primary task is crawlability, rendering, indexing, performance, or technical health.
- `content-seo`: use after backlink evidence when the user wants a content brief or draft informed by authority and proof gaps.
