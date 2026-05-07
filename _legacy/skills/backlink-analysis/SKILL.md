---
name: backlink-analysis
description: Analyze backlinks and referring domains for URLs or domains using available providers, with clear freshness and confidence notes.
---

# Backlink Analysis

Use this skill when the user asks about backlinks, referring domains, authority comparison, link gaps, or competitor link profiles.

This skill is self-contained for normal execution. Read extra context only when changing the workflow:

- `skills/_shared/references/operating-model.md`
- `skills/data-setup/SKILL.md`
- `docs/skill-quality-criteria.md`

## Contract

Inputs:

- URL or domain;
- optional competitor URLs or domains;
- optional `mode`: `standard` default, `live`, or `offline`;
- optional `limit`: top rows to collect for domains, anchors, and sample backlinks.

Writes only:

- `project/sources/backlinks/`
- `project/workbench/backlinks/`

## Required Behavior

- Prefer the CLI; it already carries the DataForSEO payloads, endpoint map, artifact paths, and offline mode:

```bash
bin/seo-brain backlink-analysis --target <domain-or-url> --mode standard --limit 10
```

- If credentials are missing, ask whether you may open a local browser window for secure setup, then invoke setup before retrying. Do not present raw companion commands as the primary UX.

- For competitors, use one comma-separated argument:

```bash
bin/seo-brain backlink-analysis --target <domain> --competitors "competitor-a.com,competitor-b.com" --mode standard
```

- Use DataForSEO Backlinks live endpoints. `standard` is accepted as the SEO Brain default UX, but this skill maps it to `live` and records `requested_mode`.
- Do not use `async`; DataForSEO Backlinks API v3 is live-only for this flow.
- Endpoint coverage:
  - summary: `POST /v3/backlinks/summary/live`
  - top referring domains: `POST /v3/backlinks/referring_domains/live`
  - top anchors: `POST /v3/backlinks/anchors/live`
  - sample backlinks: `POST /v3/backlinks/backlinks/live`
- Payload defaults:
  - `target`: domain/subdomain without protocol, or full URL for a page;
  - `include_subdomains`: `true`;
  - `backlinks_status_type`: `live`;
  - `limit`: `10`;
  - `backlink_mode`: `as_is` for sample backlinks.
- Identify provider, effective mode, requested mode, endpoint list, timestamp, and data freshness.
- Report aggregates, top referring domains, top anchors, sample backlinks, and competitor deltas when available.
- Avoid false precision.
- Mark unavailable data explicitly.
- Never fabricate backlink counts, domains, anchors, rank, spam score, dates, or competitors.

## Done Criteria

- Report separates measured data from interpretation.
- Provider and timestamp are recorded.
- Competitor comparison is explicit when requested.
- Raw provider responses are saved under `project/sources/backlinks/`.
- Normalized report is saved under `project/workbench/backlinks/`.
