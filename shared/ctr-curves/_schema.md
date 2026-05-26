# CTR Curves — versioned reference data

This directory stores published, citable CTR distributions used by Agentic SEO modeling (e.g. Share of Voice, Share of Clicks).

## Rules

- One file per published edition. Never overwrite. New edition = new file.
- Filename equals the curve `id`. `id` is lowercase ASCII with the pattern `<source>_<year>[_q<n>]` (e.g. `fps_2026`, `awr_2026_q2`).
- Curves are **modeled**, not observed. Every consumer must label outputs accordingly.
- No fabrication. Positions without a published value carry `ctr_pct: null` (or `delta_pct: null` for delta curves) plus a `note`.

## Schema

```yaml
id: ""                       # stable identifier, equals filename without .yaml
name: ""                     # human-friendly title
type: absolute | delta       # absolute = standalone curve; delta = adjustment over a baseline
source:
  publisher: ""              # organisation
  url: ""                    # primary source URL
  published_at: ""           # ISO date the source was published
  license: free | paywalled | api-only | meta-analysis
methodology:
  summary: ""                # one sentence
  sample_size: null          # integer | null when not disclosed
  coverage:
    locale: ""               # e.g. global, US, UK, BR; "" when unknown
    device: ""               # desktop | mobile | mixed | unknown
    intent: ""               # informational | commercial | transactional | mixed | unknown
    aio_aware: true | false  # whether the curve was measured with or without AI Overview cohorts
captured_at: ""              # ISO date this file was added/refreshed
positions:                   # exactly 10 entries for positions 1..10 (extend later if needed)
  - position: 1
    ctr_pct: null            # absolute curves: 0..100; delta curves omit this field
    delta_pct: null          # delta curves: signed percentage (e.g. -58 means -58%)
    baseline_curve_id: null  # delta curves only; identifier of the curve the delta applies to
    note: null               # short clarification or limitation
caveats: []                  # array of strings shown alongside any consumer report
provenance:
  added_by: ""               # human or "agent"
  evidence_refs: []          # additional citations
```

## Conventions

- Absolute curves omit `delta_pct` and `baseline_curve_id` for every entry.
- Delta curves omit `ctr_pct` for every entry; they require `baseline_curve_id` on each row.
- AWR is paywalled / API-only. Ship `awr_*.placeholder.yaml` only; populate the real file from the AWR API at run time and keep it gitignored if it carries proprietary values.
- When the publisher reports a range without per-position values, set `delta_pct: null` and include the range in `note`.
- Files whose name ends in `.placeholder.yaml` are ignored by `loader.mjs#listCurveFiles` and can never be returned by `selectPrimary`. They exist to document intent (e.g. AWR is the *preferred* primary) without carrying values.
- Placeholder files may set `captured_at: null` and `ctr_pct: null` on every position. Any non-placeholder file must use ISO dates and may set individual `ctr_pct: null` only when paired with a `note`.

## Selection precedence

Consumers should attempt curves in this order unless a command overrides it:

1. `awr_<year>_q<n>` (primary, when populated).
2. `fps_<year>` (FirstPageSage meta-analysis, full curve, free).
3. `backlinko_<year>_<mm>` (legacy sanity check).
4. `sistrix_2020` (pre-AIO historical baseline, comparisons only).

Delta curves (`*_aio_deltas`) are applied on top of an absolute curve when AI Overview presence is detected on a keyword.

## Adding a new curve

1. Create `shared/ctr-curves/<id>.yaml` following the schema.
2. Run `node shared/ctr-curves/loader.mjs --validate <id>` to confirm.
3. Append an entry to `project/brain/log.md` with `tipo: decisao` referencing the new curve, when used in a project run.
