# M6 — Head-to-Head Page Comparison

URL-mode matrix comparing a target page against 1-N competitor pages disputing the same query or intent.

## Inputs

- `target_urls[]`: 1+ target URLs.
- `competitor_urls[]`: 1-N competitor URLs aligned with each target URL.
- `attach_serp_extract_run: <slug>` (optional) — feeds SERP features per query.
- `intent_focus`: optional string for grouping pairs.

## Provider/extractor surfaces

- Deterministic HTML extraction (reuse `technical-seo` extractor subset): title, meta description, H1-H4 tree, word count (useful body, excluding nav/footer/sidebar), schema types, image alt coverage, internal link count, external link count, last-modified observed.
- `serp-extract` evidence: SERP features owned per URL for the matching query.

## Compute rules

Emit one row per `target_url × competitor_url` pair. Each row records both URLs and their observable values; the report renders the matrix.

```yaml
page_matrix:
  - pair_id: ""
    intent_focus: ""
    target_url: ""
    competitor_url: ""
    target:
      title: ""
      title_length: 0
      meta_description: ""
      meta_description_length: 0
      h1: ""
      h_tree_counts:
        h1: 0
        h2: 0
        h3: 0
        h4: 0
      word_count_useful: 0
      schema_types: []
      image_alt_pct: 0
      internal_links: 0
      external_links: 0
      last_modified: null
      serp_features_owned: []
    competitor:
      <same shape as target>
    diffs:
      word_count_delta: 0
      h2_delta: 0
      schema_types_only_competitor: []
      schema_types_only_target: []
      serp_features_only_competitor: []
      serp_features_only_target: []
```

## Edge cases

- Page fetch blocked or 4xx/5xx: skip the row, add a limitation with the URL and status.
- Multiple H1 on a page: keep both, surface as `h_tree_counts.h1: 2` and note in synthesis.
- Word count outliers (>10000 words): keep but tag with `word_count_outlier: true`.
- Schema detection: rely on JSON-LD parsing; microdata/RDFa not required for v1.

## Anti-patterns

- Re-running the full `technical-seo` audit; only the comparable subset.
- Counting nav/footer/sidebar text in word count.
- Inferring "better content" from word count alone.
- Mixing pairs from different intents into the same matrix without `intent_focus`.
