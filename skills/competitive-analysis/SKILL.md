---
name: competitive-analysis
description: When the user wants to compare domains or URLs against competitors across SEO footprint, share of voice, keyword/content gap, head-to-head pages, off-page link gap (via backlink-analysis), and brand positioning. Orchestrates evidence from serp-extract, keyword-research, backlink-analysis, and topic-cluster without duplicating their work.
metadata:
  version: 1.0.0
---

# Competitive Analysis

You are the competitive analysis orchestrator for Agentic SEO. Your goal is to produce one evidence-backed competitive report for one target and 1-4 competitors, composing modules from other Agentic SEO skills without duplicating their evidence work and without inventing data.

## When To Use

Use this skill when the user asks to compare domains or URLs, audit competitors, measure share of voice, map keyword or content gaps, compare ranking pages head-to-head, read brand positioning, or assemble a multi-surface competitive briefing. The skill is the entry point for any "compare us against competitor X (and Y, Z)" question that touches more than one SEO dimension.

Do not use this skill to run single-keyword SERP analysis (`seo-analysis`), capture raw SERP for one keyword (`serp-extract`), produce a backlink profile audit (`backlink-analysis` `single` mode), build the project's own topic cluster (`topic-cluster`), write a content brief (`content-seo`), or audit the project's own E-E-A-T (`eeat`). Route to those skills first, then this skill consumes their outputs.

## Critical Points

- DataForSEO is the default provider for SoV, SERP universe, and keyword evidence. Bypass requires actor, timestamp, reason, missing dimension, and the consequence `not data-backed by DataForSEO`.
- Competitors must be supplied by the user (1-4). The skill never invents the market set; competitor discovery via `dataforseo_labs/competitors_domain/live` only confirms or extends a user-provided list, and any added competitor is shown with the evidence row that justified it.
- Never fabricate `ranked_keywords` counts, position buckets, intersect cardinality, SoV percentages, content footprint counts, freshness dates, link counts, anchor distributions, brand mentions, or any "estimated traffic" without a provider field. Unknown values stay `null` or `unknown`; never an empty string. When the provider returns 0, keep `0`, not `null`.
- SoV/SoC outputs are modeled, not observed. Every KPI derived from a CTR curve must carry the `Modelado` tag and reference the curve `id` and `captured_at`. **Convention**: in `agentic-kpis`, the tag appears in a sibling `tag: Modelado` field; in `agentic-table`, columns derived from the curve use the suffix `[Modelado]` in the `label` and never mix the tag into the `value`. Numeric cells in the Companion stay numbers (provider-native or formatted at render time); never embed locale formatting inside the YAML payload.
- Off-page link surfaces are owned by `backlink-analysis` v2 `multi-competitor` mode. This skill never re-implements `domain_intersection`, `page_intersection`, anchor diff, quality mix, velocity, or brand mention gap; it consumes the backlink run via `attach_backlink_analysis_run` and summarizes it in the report.
- Keep raw provider evidence under `project/sources/competitive/<run-slug>/dataforseo/`, normalized module evidence under `project/audits/competitive-<run-slug>/sources/<module-id>/`, the run-level YAML at `project/audits/competitive-<run-slug>/report.yaml`, and the Companion page at `project/analyses/competitive-analysis/<run-slug>/report.md`.
- Do not write competitive drafts, hypotheses, or strategic conclusions to `project/brain/`. The brand module (M7) proposes a `tipo: decisao` entry in `project/brain/log.md`; it does not edit brain pages.
- Do not promise ranking lifts, traffic outcomes, link acquisition, mention placements, or revenue impact. Synthesize observations, gaps, hypotheses, and next-investigation steps only.
- Preserve the requested output language and pt-BR diacritics: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.

## Modes

- `domain`: target and competitors are domains. Activates M1 (Footprint), M2 (SoV), M3 (Keyword Gap), M4 (Link Gap via attach), M5 (Content Footprint), M7 (Brand Positioning).
- `url`: target and competitors are URLs disputing the same intent. Activates M6 (Head-to-Head Page), M4 (Page-Level Link Gap via attach), M7 (Conversion Surface contrast).
- `mixed`: both. Runs the domain set and the URL set under the same `run-slug`.

The mode is inferred from input: every player is a domain → `domain`; every player is a URL → `url`; mixed input → `mixed`. If players are inconsistent and the user did not declare the mode, block with `status: blocked` and ask.

## Module catalog

| ID | Module | Mode | Primary evidence |
|---|---|---|---|
| M1 | Footprint Overview | domain | `dataforseo_labs/domain_rank_overview/live`, `ranked_keywords/live` |
| M2 | Share of Voice & SERP Universe | domain | `ranked_keywords/live` + CTR curve (`shared/ctr-curves/`) + SERP features via `serp-extract` |
| M3 | Keyword Gap & Striking Distance | domain | diff of `ranked_keywords/live` between players |
| M4 | Link Gap & Linkable Assets | both | `backlink-analysis` `multi-competitor` run, attached |
| M5 | Topical Authority & Content Footprint | domain | sitemap, HTML structural extraction, optional `topic-cluster` reference |
| M6 | Head-to-Head Page Comparison | url | HTML structural extraction + `serp-extract` + `technical-seo` subset |
| M7 | Brand Positioning & Conversion Surface | domain primary | observable hero/CTA/proof/pricing extraction; brain identidade/voz reference |

Per-module compute rules, edge cases, anti-patterns, and YAML row shapes live in `references/modules/<module-id>.md`. Load on demand; never required for the orchestration framework.

## Presets

- `quick`: M1 + M3 (domain footprint + keyword gap).
- `domain-full`: M1 + M2 + M3 + M4 + M5 + M7.
- `url-headtohead`: M6 + M4 + M7-url-contrast.
- `content-only`: M5 + M2 (requires `cluster_ref` or `keyword_set`).
- `brand-only`: M7.
- `full`: all seven modules (cost-heavy; budget gate fires).

Presets are convenience bundles. `modules[]` in input overrides the preset when both are present.

## Gates

- **DataForSEO gate**: M1/M2/M3 require provider credentials. Without them, return `status: blocked` for those modules and continue M5/M6/M7 which can run on HTML extraction.
- **CTR curve gate** (M2 only): a curve must be selected before SoV runs. `selectPrimary({ prefer: ctr_curve_id })` from `shared/ctr-curves/loader.mjs` returns the chosen curve and logs the selection in `provider.ctr_curve` of the output. If no usable curve exists, block M2 and surface the gate.
- **Backlink attach gate** (M4): the user must either pass `attach_backlink_analysis_run: <slug>` or accept a sub-run of `backlink-analysis` in `multi-competitor` mode. Never reimplement off-page surfaces here.
- **Budget gate**: when `players × keyword_universe > 500`, alert with a one-line message and require explicit confirmation or activation of the `sample` flag (top-50 by volume).
- **Brain decision gate** (M7 synthesis): the brand differentiation block proposes a `tipo: decisao` log entry; never writes to `brain/`.
- **Source separation gate**: raw provider JSON under `project/sources/competitive/<run-slug>/dataforseo/`; normalized per-module under `project/audits/competitive-<run-slug>/sources/<module-id>/`; run-level YAML at `project/audits/competitive-<run-slug>/report.yaml`; human report at `project/analyses/competitive-analysis/<run-slug>/report.md`. No raw JSON in the visual body.

## Framework

### 1. Classify The Job

**Strong:** "Target `example.com`; competitors `competitor-a.com`, `competitor-b.com`; mode `domain` (all three are domains); preset `domain-full`; locale `pt-BR`, location `Brazil`, device `desktop`; CTR curve `awr_2026_q2` preferred, fallback `fps_2026`; backlink attach via existing run `bl-example-2026-05-25`."

**Weak:** "Compare example.com to its market."

If `competitors[]` is empty or the player set is inconsistent for a single mode, block and ask. Never invent competitors from memory.

### 2. Resolve Inputs And Gates

For each module selected by the preset or by `modules[]`:

- M1/M2/M3: confirm DataForSEO credentials, time window, location, language, device, keyword universe (cluster_ref OR keyword_set OR `ranked_keywords` top-N by volume).
- M2: resolve CTR curve via `selectPrimary({ prefer: ctr_curve_id })`. Record `id`, `captured_at`, and any AIO-delta curve to apply.
- M4: confirm `attach_backlink_analysis_run` exists at `project/audits/backlinks-<slug>/report.yaml`; if missing, schedule a sub-run.
- M5: confirm sitemap accessibility per player; declare the discovery method.
- M6: confirm at least one target URL and one competitor URL per intent; reuse `serp-extract` runs when available via `attach_serp_extract_run`.
- M7: read `project/brain/identidade.md` and `project/brain/voz.md` for the project's own positioning context. If missing, run M7 with `brain_context: absent` and surface the limitation.

Apply the budget gate before any costly provider call.

### 3. Collect And Store Evidence

Run modules in dependency order:

1. M1 (cheap; informs M2/M3 universe).
2. M3 (reuses M1's `ranked_keywords` packets).
3. M2 (combines M1's ranks + CTR curve + optional AIO-delta).
4. M5 (independent; can run in parallel with above).
5. M4 (attaches existing backlink run or schedules sub-run).
6. M6 (URL-mode only; independent).
7. M7 (last; depends on M1/M5/M6 evidence when available).

Each module writes raw provider payloads under `project/sources/competitive/<run-slug>/dataforseo/<module-id>/`, normalized facts under `project/audits/competitive-<run-slug>/sources/<module-id>/`, and a per-module YAML fragment inside the run-level `report.yaml`.

### 4. Compose The Report YAML

The run-level YAML must declare every module's status (`complete | partial | blocked | not_run`), the evidence paths it produced, and the limitations it surfaced. Modules that did not run leave their section empty and explain why.

### 5. Render The Companion Page

Follow `page-report`. Start with the executive reading (one paragraph: who outperforms us, where the largest gaps are, and which two next investigations move the needle). Then one H2 per active module using friendly labels in the project language. Every KPI tagged `Observado` or `Modelado`. Every table uses stable `key` columns; labels are translated. Never paste raw provider JSON or YAML into the visual body.

### 6. Surface Limitations And Next Actions

End the report with:

- Limitations (per-module, named, with evidence reference).
- Next actions framed as research/investigation (never as promises).
- A proposed `tipo: decisao` log entry for the run (which surfaces the agent observed, which gaps remain, which curve was used).

## Output Format

Write the run-level YAML to `project/audits/competitive-<run-slug>/report.yaml`. Use this structure (omit module sections that did not run):

```yaml
status: complete | partial | blocked
run_slug: ""
mode: domain | url | mixed
preset: quick | domain-full | url-headtohead | content-only | brand-only | full | custom
players:
  target:
    input: ""
    normalized: ""
    type: domain | url
  competitors:
    - input: ""
      normalized: ""
      type: domain | url
      source: user | dataforseo_competitors_domain
      evidence_row: null
market_context:
  location: ""
  language: ""
  device: ""
  generated_at: ""
provider:
  dataforseo:
    available: true | false | bypass_recorded
    bypass: null
  ctr_curve:
    primary_id: ""
    primary_captured_at: ""
    aio_delta_id: null
budgets:
  players: 0
  keywords: 0
  alerted: false
  sample_mode: false
attachments:
  backlink_analysis_run: null
  serp_extract_run: null
  topic_cluster_ref: null
modules:
  m1_footprint:
    status: complete | partial | blocked | not_run
    evidence_paths: []
    summary: {}
  m2_share_of_voice:
    status: complete | partial | blocked | not_run
    evidence_paths: []
    sov_table: []
    serp_features_table: []
  m3_keyword_gap:
    status: complete | partial | blocked | not_run
    evidence_paths: []
    gap_table: []
    striking_distance: []
  m4_link_gap:
    status: referenced | blocked | not_run
    backlink_run_slug: null
    headline_kpis: {}
  m5_content_footprint:
    status: complete | partial | blocked | not_run
    evidence_paths: []
    coverage_matrix: []
    format_inventory: []
    freshness_table: []
  m6_head_to_head:
    status: complete | partial | blocked | not_run
    evidence_paths: []
    page_matrix: []
  m7_brand:
    status: complete | partial | blocked | not_run
    evidence_paths: []
    positioning_table: []
    cta_table: []
    proof_inventory: []
    differentiation_synthesis: []
synthesis:
  executive_summary: ""
  top_gaps: []
  hypotheses: []
limitations: []
next_actions: []
log_entry_plan:
  path: project/brain/log.md
  tipo: decisao
  summary: ""
```

If the run is fully blocked (no provider, no fixture), return `status: blocked`, name the gate, and do not invent any module output.

### Default delivery and runtime

Follow the shared `page-report` contract and the module skeleton at `templates/analyses/competitive-analysis/report-skeleton.md`. The run YAML lives at `audits/competitive-<run-slug>/report.yaml`; the Companion page at `project/analyses/competitive-analysis/<run-slug>/report.md`. Each module renders as one H2 with `agentic-kpis` and `agentic-table` blocks; modules that did not run are dropped. The skill is exposed as `node dist/agentic-seo.js competitive-analysis`, dispatched by `src/commands/runtime.ts` to the orchestrator `scripts/competitive-analysis.mjs`, which calls DataForSEO Labs + Backlinks, the sitemap, and homepage HTML extraction, reads `shared/ctr-curves/` for the modeled curve, writes the YAML + Markdown, appends one `tipo: decisao` entry to `project/brain/log.md`, and returns the standard `{ report_md, source_artifact, modules_run, browser_prompt }` JSON.

## Examples

### Example: domain-full preset, pt-BR

Input: "Compara `example.com` com `competitor-a.com` e `competitor-b.com` no Brasil, pt-BR, desktop. Cluster `seo-agentico` já existe e o backlink run mais recente é `bl-example-2026-05-25`."

Output: "Mode `domain`, preset `domain-full`. Resolver CTR curve via `selectPrimary` (AWR preferida, fallback `fps_2026`). Atachar `bl-example-2026-05-25` para M4. Carregar `project/clusters/seo-agentico/cluster.json` como universo da SoV (M2). Rodar M1 → M3 → M2 → M5 → M4(ref) → M7. Sem provider DataForSEO, retornar `status: blocked` para M1/M2/M3 e continuar com M5/M7 marcando o gate."

### Example: URL head-to-head

Input: "Compare `https://example.com/seo-agentico/` com `https://competitor-a.com/agentic-seo/` para a mesma intenção."

Output: "Mode `url`, preset `url-headtohead`. Ativar M6 (matriz HTML estrutural por URL), M4 (Page-Level Link Gap via attach), M7-url-contrast (mensagem hero/CTA/prova). Reusar `attach_serp_extract_run` se existir; senão capturar via `serp-extract` antes de M6 começar."

### Example: Weak execution

Input: "Faça uma análise competitiva completa de mercado."

Output: "Inventar três concorrentes plausíveis, estimar tráfego, escrever recomendações de outreach e publicar no brain." This is weak because it fabricates the market set, fabricates traffic, promises outreach outcomes, and bypasses every evidence and decision gate.

## Related Skills

- `backlink-analysis`: required for M4. Consume the `multi-competitor` run via `attach_backlink_analysis_run: <slug>`. Do not reimplement off-page surfaces here.
- `serp-extract`: source for SERP features in M2, competitor URLs in M6, and brand mention evidence in M7.
- `keyword-research`: source for the keyword universe used by M2/M3 when no cluster reference is provided.
- `topic-cluster`: consumed by M2/M5 via `attach_topic_cluster_ref: <seed-slug>`.
- `seo-analysis`: use when the user wants single-keyword + top-3 + player-score analysis on one specific keyword.
- `technical-seo`: the URL-matrix in M6 reuses the deterministic extraction subset (headings, schema, alt %, link counts) without re-auditing.
- `eeat`: M7 references the project's own E-E-A-T run via `attach_eeat_run: <slug>` when comparing proof surfaces; never overwrites it.
- `content-seo`: downstream consumer; M5's gaps feed content briefs without auto-promotion.
