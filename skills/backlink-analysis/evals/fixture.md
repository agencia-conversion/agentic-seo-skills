# Fixture: backlink evidence analysis

## Scenario A — single mode

Analyze a mocked DataForSEO backlink packet for `example.com` with no competitors.

The packet includes:

- target: 1,250 backlinks, 120 referring domains, spam score 3, rank 240
- top anchors: brand, "SEO software", naked URLs
- sample links include one directory link, one editorial article, and one suspected spam network page

Expected output:

- Evidence summary with provider and timestamp placeholders.
- Top anchors and referring domains tables.
- Link-quality risks observations.
- Actions that do not fabricate missing metrics.
- `mode: single`, every `multi_competitor.*` collection empty.

## Scenario B — multi-competitor mode (domain)

Analyze a mocked DataForSEO packet for `example.com` with competitors `competitor-a.com` and `competitor-b.com`. The packet includes:

- target: 1,250 backlinks, 120 referring domains, spam score 3
- competitor-a: 2,800 backlinks, 250 referring domains, spam score 8
- competitor-b: 900 backlinks, 95 referring domains, spam score 2
- `domain_intersection` returns 12 RDs shared by competitor-a and competitor-b but not target, 4 RDs shared by all three, and 18 RDs unique to target
- `anchors` packet returns top-10 anchors per player with the brand string `Example` for the target
- `timeseries_new_lost_summary` for the last 180 days: target +14 new / −3 lost; competitor-a +52 new / −9 lost; competitor-b +6 new / −12 lost

Expected output:

- `mode: multi-competitor`.
- Link Gap table with 12 rows, intersect_strength `2` for the rows shared by both competitors, ordered by strength then rank.
- Link Intersect table with 4 rows; `anchors_by_player` filled because the anchors packet was provided.
- Anchor Distribution rows for the three players using the `Example` brand string; competitors without a brand string declared keep `branded: 0%` and add a limitation.
- Quality Mix categories and spam buckets per player.
- Velocity deltas: competitor-a vs target = +38 new RDs; competitor-b vs target = −8 new RDs; window = 180 days.
- No fabricated rows for absent provider fields; any missing surface emits a limitation explaining the gap.
- Recommendations framed as investigation/qualification only; never as link acquisition promises.

## Scenario C — multi-competitor URL mode with page_intersection

Analyze the URL `https://example.com/seo-agentico/` against `https://competitor-a.com/agentic-seo/` and `https://competitor-b.com/seo-com-agentes/`. The packet adds:

- `page_intersection` returning 9 RDs that link to competitor-a's URL and 7 RDs that link to competitor-b's URL, with 3 RDs overlapping both competitor URLs, none of which link to the target URL.

Expected output:

- Page-Level Link Gap table with 13 unique RD rows, target/competitor URL columns, sample backlinks.
- Asset hint emitted only when the anchor or destination URL pattern justifies it; defaults to `unknown`.
- Limitation entry when sample backlinks are missing for any gap row.

## Constraints (all scenarios)

- Do not invent domain authority, traffic, link counts, or intersect cardinality.
- Separate raw source paths from interpretation.
- Mark unavailable metrics as unavailable.
- Preserve pt-BR accents in human-facing prose.
- Recommendations stay framed as investigation, qualification, cleanup review, or planning inputs.
