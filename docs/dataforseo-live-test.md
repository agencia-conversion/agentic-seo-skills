# DataForSEO Live Test

Date: 2026-05-04

Project used: `project/`

## Credential Check

Command:

```bash
bin/agentic-seo data-setup --check
```

Result:

- credentials present: yes
- DataForSEO status: `Ok.`
- balance was returned and secrets were masked

## Keyword Research

Command:

```bash
bin/agentic-seo keyword-research --keyword "seo agentico" --mode standard --timeout 180 --poll-interval 10
```

Result:

- mode: `standard`
- task created and collected through `task_get`
- task id was stored in project sources
- DataForSEO returned no volume/CPC metrics for this keyword, which Agentic SEO records as `null` instead of fabricating data

The first live attempt exposed a polling bug: `40602 Task In Queue` was incorrectly treated as terminal. This was fixed and covered by `tests/test_dataforseo_modes.mjs`.

## SERP

Standard command:

```bash
bin/agentic-seo serp-extract --keyword "seo agentico" --mode standard --timeout 180 --poll-interval 10 --depth 10
```

Live command:

```bash
bin/agentic-seo serp-extract --keyword "seo agentico" --mode live --depth 10
```

Result:

- both `standard` and `live` returned organic results
- top organic result: `https://www.conversion.com.br/blog/seo-agentico/`
- SERP features included `ai_overview`, `people_also_ask`, and `video`

## Async

Command:

```bash
bin/agentic-seo serp-extract --keyword "seo agentico" --mode async --sandbox --pingback-url 'https://example.com/ping?id=$id&tag=$tag' --depth 10
```

Result:

- async task was created
- task id was stored
- callback metadata was masked in CLI output

## Backlinks

Command:

```bash
bin/agentic-seo backlink-analysis --target conversion.com.br --mode standard
```

Result:

- DataForSEO Backlinks API returned live summary data
- backlinks: `9724`
- referring domains: `2382`
- referring main domains: `2115`
- rank: `326`
- spam score: `16`

Note: DataForSEO Backlinks API v3 supports live retrieval, so Agentic SEO maps `standard` to live for backlink analysis and records that limitation.
