# DataForSEO Live Test

Date: 2026-05-04

Project used: `projects/dataforseo-live-test`

## Credential Check

Command:

```bash
bin/seo-brain data-setup --check
```

Result:

- credentials present: yes
- DataForSEO status: `Ok.`
- balance was returned and secrets were masked

## Keyword Research

Command:

```bash
bin/seo-brain keyword-research --project dataforseo-live-test --keyword "seo agentico" --mode standard --timeout 180 --poll-interval 10
```

Result:

- mode: `standard`
- task created and collected through `task_get`
- task id was stored in project sources
- DataForSEO returned no volume/CPC metrics for this keyword, which SEO Brain records as `null` instead of fabricating data

The first live attempt exposed a polling bug: `40602 Task In Queue` was incorrectly treated as terminal. This was fixed and covered by `tests/test_dataforseo_modes.mjs`.

## SERP

Standard command:

```bash
bin/seo-brain serp-extract --project dataforseo-live-test --keyword "seo agentico" --mode standard --timeout 180 --poll-interval 10 --depth 10
```

Live command:

```bash
bin/seo-brain serp-extract --project dataforseo-live-test --keyword "seo agentico" --mode live --depth 10
```

Result:

- both `standard` and `live` returned organic results
- top organic result: `https://www.conversion.com.br/blog/seo-agentico/`
- SERP features included `ai_overview`, `people_also_ask`, and `video`

## Async

Command:

```bash
bin/seo-brain serp-extract --project dataforseo-live-test --keyword "seo agentico" --mode async --sandbox --pingback-url 'https://example.com/ping?id=$id&tag=$tag' --depth 10
```

Result:

- async task was created
- task id was stored
- callback metadata was masked in CLI output

## Backlinks

Command:

```bash
bin/seo-brain backlink-analysis --project dataforseo-live-test --target conversion.com.br --mode standard
```

Result:

- DataForSEO Backlinks API returned live summary data
- backlinks: `9724`
- referring domains: `2382`
- referring main domains: `2115`
- rank: `326`
- spam score: `16`

Note: DataForSEO Backlinks API v3 supports live retrieval, so SEO Brain maps `standard` to live for backlink analysis and records that limitation.
