# M5 — Topical Authority & Content Footprint

Content territory mapping across players: how many URLs cover which subtopic, with what depth, format, and freshness.

## Inputs

- Per-player sitemap URL (default `/sitemap.xml`, accepting nested sitemaps).
- `attach_topic_cluster_ref: <seed-slug>` (optional) — anchors the subtopic taxonomy.
- `subtopics[]` (optional fallback) — when no cluster ref, the user-supplied taxonomy.
- `freshness_window_months`: default 24.

## Compute rules

- **Content Footprint Map**: per player, count URLs per top-level path (`/blog/`, `/guia/`, `/case/`, etc.) using sitemap discovery. Record coverage method (`sitemap | crawl | user-supplied`) and missing sections.
- **Topical Coverage Matrix**: for each subtopic in the cluster (or subtopics input), classify per player as `ausente | tangencial | dedicado | hub`. Rules:
  - `ausente`: no URL slug or `<h1>` matches the subtopic term.
  - `tangencial`: subtopic appears inside a broader URL but is not the main subject.
  - `dedicado`: ≥1 URL has the term in slug or H1 and ≥ N useful words (configurable, default 600).
  - `hub`: ≥3 URLs covering different angles of the same subtopic, with cross-linking observed.
- **Intent Coverage Spread**: distribute the URLs per subtopic by intent (informacional/comparativa/transacional/navegacional/branded-defensiva). Intent comes from URL+title evidence; mark `unknown` when ambiguous.
- **Format & Module Inventory**: per URL, presence of `FAQ`, `tabela`, `vídeo`, `embed YouTube`, `calculadora` (form + script), `glossário interno`, `citação externa`, `schema Article/Review/HowTo/FAQPage`. Aggregate counts per player.
- **Content Freshness**: per URL, `published_at` and `updated_at` from `article:published_time`, `article:modified_time`, schema `datePublished`/`dateModified`, or visible date. Aggregate median age and share updated within `freshness_window_months`.

## Row shapes (YAML)

```yaml
coverage_matrix:
  - subtopic: ""
    by_player:
      - player: ""
        coverage: ausente | tangencial | dedicado | hub
        sample_urls: []
        evidence_path: project/audits/competitive-<run-slug>/sources/m5/<player>/...
format_inventory:
  - player: ""
    counts:
      faq: 0
      tabela: 0
      video: 0
      embed_youtube: 0
      calculadora: 0
      glossario_interno: 0
      citacao_externa: 0
      schema_article: 0
      schema_review: 0
      schema_howto: 0
      schema_faqpage: 0
freshness_table:
  - player: ""
    urls_total: 0
    median_age_days: null
    updated_within_window_pct: null
intent_coverage:
  - subtopic: ""
    by_player:
      - player: ""
        intents:
          informacional: 0
          comparativa: 0
          transacional: 0
          navegacional: 0
          branded_defensiva: 0
          unknown: 0
```

## Edge cases

- Sitemap blocked or fragmented: declare `coverage_method: incomplete` and surface `missing_sections`.
- URL renders without `published_at`/`updated_at` evidence: freshness fields stay `null`; never derive from URL path.
- Subtopic absent from the cluster: skip; do not invent subtopics from competitor URLs.
- Multilingual sites: filter sitemaps to the project language by `hreflang` or URL pattern before counting.

## Anti-patterns

- Inferring intent from URL slug alone.
- Counting word length and calling it "quality".
- Inventing `updated_at` from URL slugs containing dates.
- Mixing apex domain and subdomain footprints without recording the rule.
