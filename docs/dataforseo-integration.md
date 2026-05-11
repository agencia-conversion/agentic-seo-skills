# DataForSEO Integration

Agentic SEO supports DataForSEO as the first-class SEO data provider.

## Modes

Default mode: `standard`.

- `live`: ultrafast mode. Uses DataForSEO `/live` endpoints and returns data in one request. Use when the user needs results in seconds.
- `standard`: medium mode. Uses `task_post` and polls `task_get` until results are ready. This is the Agentic SEO default.
- `async`: asynchronous mode. Uses `task_post` with optional `pingback_url` or `postback_url`. Agentic SEO stores the task IDs and callback metadata.
- `offline`: test mode. Does not call DataForSEO and does not consume credits.

## API Coverage

SERP:

- live: `POST /v3/serp/google/organic/live/advanced`
- standard: `POST /v3/serp/google/organic/task_post` then `GET /v3/serp/google/organic/task_get/advanced/$id`
- async: `POST /v3/serp/google/organic/task_post` with callback fields

Keyword search volume:

- live: `POST /v3/keywords_data/google_ads/search_volume/live`
- standard: `POST /v3/keywords_data/google_ads/search_volume/task_post` then `GET /v3/keywords_data/google_ads/search_volume/task_get/$id`
- async: `POST /v3/keywords_data/google_ads/search_volume/task_post` with callback fields

Backlinks:

- DataForSEO Backlinks API v3 supports live retrieval for this workflow. Agentic SEO maps `standard` to live endpoints and records `requested_mode`.
- summary: `POST /v3/backlinks/summary/live`
- top referring domains: `POST /v3/backlinks/referring_domains/live`
- top anchors: `POST /v3/backlinks/anchors/live`
- sample backlinks: `POST /v3/backlinks/backlinks/live`
- optional competitor summaries are batched into the summary request.
- official docs: [summary](https://docs.dataforseo.com/v3/backlinks-summary-live/), [referring domains](https://docs.dataforseo.com/v3/backlinks-referring_domains-live/), [anchors](https://docs.dataforseo.com/v3/backlinks-anchors-live/), [backlinks](https://docs.dataforseo.com/v3/backlinks-backlinks-live/).

## CLI Examples

```bash
bin/agentic-seo data-setup --check

bin/agentic-seo serp-extract \
  --keyword "seo agentico" \
  --mode standard

bin/agentic-seo keyword-research \
  --keyword "seo agentico" \
  --mode standard

bin/agentic-seo serp-extract \
  --keyword "seo agentico" \
  --mode async \
  --pingback-url 'https://example.com/ping?id=$id&tag=$tag'

bin/agentic-seo backlink-analysis \
  --target conversion.com.br \
  --competitors "concorrente-a.com.br,concorrente-b.com.br" \
  --mode standard \
  --limit 10
```

Provider calls can consume credits unless `--mode offline` or DataForSEO sandbox is used.
