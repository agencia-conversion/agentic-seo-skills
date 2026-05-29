# DataForSEO

DataForSEO is Agentic SEO's first deterministic provider for SERP evidence, keyword metrics, backlink data, and selected on-page/labs endpoints.

This guide is adapted from `coreyhaines31/marketingskills` at commit `906c2fb28e471c5b1d149d4159ec5ddb40b7c364`.

## Authentication

- Type: Basic Auth
- Environment variables: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- Standalone credential file: `~/.agentic-seo/credentials.json`
- Expected JSON keys: `dataforseo_login`, `dataforseo_password`

The API password is generated in the DataForSEO API Access screen and is not the normal account password.

## CLI

```bash
node tools/clis/dataforseo.js help
node tools/clis/dataforseo.js status
node tools/clis/dataforseo.js serp google --keyword "seo agêntico" --location Brazil --language Portuguese --dry-run
node tools/clis/dataforseo.js keywords volume --keywords "seo agêntico,seo com agentes" --location-code 2076 --language-code pt --offline
node tools/clis/dataforseo.js backlinks summary --target example.com --dry-run
```

## Agentic SEO Rules

- `status`, `help`, `--offline`, and `--dry-run` must never require credentials or consume credits.
- Live calls must return provider responses as JSON without storing raw client data in the repository.
- Skills interpret tool output; the CLI does not write wiki pages or approve strategic context.
- Missing metrics remain `null`; agents must not infer keyword volume, backlink counts, or rankings.

## Endpoint Coverage

| Area | Command | Endpoint |
|---|---|---|
| SERP | `serp google` | `/v3/serp/google/organic/live/advanced` |
| Keyword volume | `keywords volume` | `/v3/keywords_data/google_ads/search_volume/live` |
| Keyword suggestions | `keywords suggestions` | `/v3/dataforseo_labs/google/keyword_suggestions/live` |
| Backlink summary | `backlinks summary` | `/v3/backlinks/summary/live` |
| Backlink list | `backlinks list` | `/v3/backlinks/backlinks/live` |
| Referring domains | `backlinks refdomains` | `/v3/backlinks/referring_domains/live` |
| Anchors | `backlinks anchors` | `/v3/backlinks/anchors/live` |
| Instant on-page | `onpage audit` | `/v3/on_page/instant_pages` |
| Labs competitors | `labs competitors` | `/v3/dataforseo_labs/google/competitors_domain/live` |
| Labs ranked keywords | `labs ranked-keywords` | `/v3/dataforseo_labs/google/ranked_keywords/live` |

## Attribution

See `tools/ATTRIBUTIONS.md` and `THIRD_PARTY_NOTICES.md`.
