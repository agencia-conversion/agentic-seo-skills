# DataForSEO Integration

SEO Brain supports DataForSEO as the first-class SEO data provider.

## Modes

Default mode: `standard`.

- `live`: ultrafast mode. Uses DataForSEO `/live` endpoints and returns data in one request. Use when the user needs results in seconds.
- `standard`: medium mode. Uses `task_post` and polls `task_get` until results are ready. This is the SEO Brain default.
- `async`: asynchronous mode. Uses `task_post` with optional `pingback_url` or `postback_url`. SEO Brain stores the task IDs and callback metadata.
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

- DataForSEO Backlinks API v3 supports live retrieval. SEO Brain maps `standard` to the live summary endpoint and records that limitation.
- endpoint: `POST /v3/backlinks/summary/live`

## CLI Examples

```bash
bin/seo-brain data-setup --check

bin/seo-brain serp-extract \
  --keyword "seo agentico" \
  --mode standard

bin/seo-brain keyword-research \
  --keyword "seo agentico" \
  --mode standard

bin/seo-brain serp-extract \
  --keyword "seo agentico" \
  --mode async \
  --pingback-url 'https://example.com/ping?id=$id&tag=$tag'
```

Provider calls can consume credits unless `--mode offline` or DataForSEO sandbox is used.
