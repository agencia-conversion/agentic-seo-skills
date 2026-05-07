# Fixture: backlink evidence analysis

Analyze a mocked DataForSEO backlink packet for `example.com` with competitors `competitor-a.com` and `competitor-b.com`.

The packet includes:

- target: 1,250 backlinks, 120 referring domains, spam score 3
- competitor-a: 2,800 backlinks, 250 referring domains, spam score 8
- competitor-b: 900 backlinks, 95 referring domains, spam score 2
- top anchors: brand, "SEO software", naked URLs
- sample links include one directory link, one editorial article, and one suspected spam network page

Expected output:

- Evidence summary with provider and timestamp placeholders.
- Competitor deltas.
- Link-quality risks.
- Actions that do not fabricate missing metrics.

Constraints:

- Do not invent domain authority, traffic, or link counts.
- Separate raw source paths from interpretation.
- Mark unavailable metrics as unavailable.
