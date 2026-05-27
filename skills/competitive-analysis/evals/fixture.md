# Fixture: competitive-analysis end-to-end

Three scenarios stress orchestration, gate handling, and source separation across the 7 modules.

## Scenario A — domain-full with attachments (offline fixtures)

Target `example.com`; competitors `competitor-a.com`, `competitor-b.com`. Brazil, pt-BR, desktop.

Available evidence:

- DataForSEO Labs `domain_rank_overview` and `ranked_keywords` payloads for the 3 players under `project/sources/competitive/example-2026-05-25/dataforseo/m1/`.
- `attach_topic_cluster_ref: seo-agentico` reads `project/clusters/seo-agentico/cluster.json` with 18 keywords (12 with volume, 6 without).
- `attach_backlink_analysis_run: bl-example-2026-05-25` resolves to a complete multi-competitor backlink run.
- Sitemaps for all 3 players reachable (200 OK).
- CTR curves: `fps_2026` resolved as primary (AWR placeholder remains). AIO detected on 4 of 18 keywords (22%); `ahrefs_2025_12_aio_deltas` applied to those rows.
- `project/brain/identity.md` and `project/brain/voice.md` present.

Expected output:

- `mode: domain`, `preset: domain-full`, `run_slug: example-2026-05-25`.
- All 7 modules execute: M1, M2, M3, M5, M4 (referenced), M7. (M6 stays `not_run` because mode is `domain`.)
- M2 SoV table carries `tag: Modelado`, `curve_id: fps_2026`, `aio_adjusted: true` on the 4 AIO rows.
- M3 gap rows reuse M1 packets (no re-fetch).
- M4 reads the attached backlink run and exposes headline KPIs only; depth is linked, not duplicated.
- M5 coverage matrix uses the 18 cluster subtopics; freshness window default 24 months.
- M7 emits `excerpt_literal` + `position` BEFORE any qualitative label; proposes one `type: decision` log entry.
- 6 keywords without volume show up in `keywords_without_volume` with a limitation.
- Companion report renders one H2 per module; no raw JSON in the body.

## Scenario B — URL head-to-head

Target `https://example.com/seo-agentico/`; competitors `https://competitor-a.com/agentic-seo/`, `https://competitor-b.com/seo-com-agentes/`. Brazil, pt-BR, desktop.

Available evidence:

- `attach_serp_extract_run: serp-example-seo-agentico-2026-05-25` exists.
- All 3 URLs fetchable.
- `attach_backlink_analysis_run: bl-example-url-2026-05-25` (multi-competitor URL mode).

Expected output:

- `mode: url`, `preset: url-headtohead`.
- M6 page matrix emitted with 2 pairs (target × competitor-a, target × competitor-b).
- M4 referenced (page-level link gap headline KPIs).
- M7 in URL-contrast mode: hero/CTA/proof per URL with literal excerpts.
- Other modules `not_run` with the reason "url mode does not activate M1/M2/M3/M5".

## Scenario C — blocked DataForSEO, partial run

Target `example.com`; competitors `competitor-a.com`, `competitor-b.com`. DataForSEO credentials missing.

Expected output:

- `status: partial`.
- M1, M2, M3 return `status: blocked` with the DataForSEO gate name and the consequence "not data-backed by DataForSEO".
- M5, M7 continue with sitemap and HTML extraction only.
- M4 returns `not_run` because no backlink run is attached.
- Limitations list every blocked module and the reason.
- Companion report shows a clear "evidence missing" callout in the executive summary and does not present synthesis as data-backed.

## Constraints (all scenarios)

- No fabrication of ranked keyword counts, intersect cardinality, traffic, SoV percentages without curve and universe, content coverage, link counts, anchor diff, mention counts, or any brand/CTA label without `excerpt_literal` + `position`.
- Sources separated: raw provider under `project/sources/competitive/<run-slug>/dataforseo/`, normalized per-module under `project/audits/competitive-<run-slug>/sources/<module-id>/`, run YAML at `project/audits/competitive-<run-slug>/report.yaml`, Companion report at `project/analyses/competitive-analysis/<run-slug>/report.md`.
- M4 never reimplements backlink intersect logic.
- Preserve pt-BR diacritics in human-facing prose.
- Synthesis stays observation + gap + hypothesis + next-investigation; no ranking/traffic/link promises.
