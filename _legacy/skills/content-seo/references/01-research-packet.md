# Research packet

The research packet converts SEO analysis into writing inputs without becoming public prose.

## Required fields

- `data_provenance.seo_analysis`: local report path, provider, generated date.
- `process_bypass`: null or explicit step, reason, consequence, approver, confirmation text, timestamp, and confirmation.
- `evidence_sources`: local paths only.
- `competitor-evidence.yaml`: Top 3 heading/meta/word-count evidence.
- `public_citations`: canonical public URLs only.
- `serp_competitor_domains`: competitor domains from SERP.
- `forbidden_prose_terms`: terms/domains that cannot appear in public prose.
- `synthesis`: intent, reader need, and gaps.
- `hypotheses` and `limitations`: never promoted to fact.
- `skyscraper.word_count`: competitor counts, failures, formula, and final target.

## Rules

- SERP competitors inform intent and gaps; they are not citations by default.
- Missing volume, difficulty, traffic, backlinks, clients, credentials, awards, or proof stays missing.
- Homepage-only context is not SEO analysis unless the user explicitly approved that bypass.
- Word count is deterministic. Use the highest valid Top 3 count +20% with a 2,000-word floor. If no valid Top 3 count exists, block unless the user explicitly approves the Top 3 bypass.
