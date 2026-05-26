# Backlink Analysis — Multi-Competitor Reference

Detailed decision rules, edge cases, and naming for the `multi-competitor` mode of `backlink-analysis`. Loaded by the skill on demand, never required for `single` mode runs.

## Surface inventory

| Surface | Endpoint | What it represents |
|---|---|---|
| Link Gap | `domain_intersection` filtered to `target absent` | RDs linking to ≥1 competitor but not the target |
| Link Intersect | `domain_intersection` filtered to `target present AND every competitor present` | RDs linking to target and every measured competitor |
| Anchor Distribution Comparison | `anchors` per player | Per-bucket percentages and top-N anchor rows per player + competitor-only set |
| Referring-Domain Quality Mix | `referring_domains` per player | Per-category and per-spam-bucket distribution per player |
| Link Velocity Delta | `timeseries_new_lost_summary` | New vs lost RDs per player inside `time_window_days`; deltas vs target |
| Page-Level Link Gap | `page_intersection` | URL mode only; RDs that point to competitor URL set without pointing to the target URL |
| Brand Mention Gap | external mention evidence + SERP | Domains mentioning competitor textually without linking to target |

## Inputs

- `target`: required, domain or URL.
- `competitors[]`: 1-4 items, same type (domain or URL) as the target.
- `time_window_days`: default 180 for velocity. Accepted values: 30, 90, 180, 365.
- `intersection_limit`: default 100 rows per intersect query.
- `intersect_strength_threshold`: default 1 (a single competitor sharing the RD is enough to emit a Link Gap row).
- `--with-brand-mentions`: requires explicit user-supplied or `serp-extract`-sourced mention evidence.
- `--with-history`: enables `history/live` for longitudinal series alongside the summary deltas.

## Computation rules

### Link Gap intersect strength

```
strength(rd) = | { c in competitors : rd ∈ RDs(c) } |
emit Link Gap when strength(rd) >= intersect_strength_threshold AND rd ∉ RDs(target)
```

Sort emitted rows by `strength` descending, then `rank` ascending, then alphabetical. Never sort by perceived authority.

### Link Intersect

```
emit Link Intersect when rd ∈ RDs(target) AND ∀ c in competitors : rd ∈ RDs(c)
```

When `anchors` packet is available, attach `anchors_by_player`; otherwise leave empty and add a limitation.

### Anchor Distribution Comparison

Buckets (case insensitive, first-match wins):

- `branded`: anchor contains the brand string supplied (`target.brand` or user-supplied list); never auto-infer brand.
- `exact_match`: anchor matches the focus keyword string when supplied.
- `partial_match`: anchor contains substrings of the focus keyword.
- `naked`: anchor is the literal URL or domain.
- `generic`: anchor is one of `click here`, `read more`, `learn more`, `here`, `link`, `website`, `site`, `clique aqui`, `saiba mais`, `leia mais`, `aqui`, `neste link`.
- `image_or_empty`: anchor missing or alt-text only.

Brand string and focus keywords must come from user input or project context. When unavailable, emit only `naked`, `generic`, and `image_or_empty` buckets and add a limitation; do not invent brand variants.

### Quality Mix categories

When `referring_domains` returns `category`, map to one of the canonical labels. Otherwise `unknown`. Spam buckets are computed strictly from the provider `spam_score` (`0-15`, `16-30`, `31+`); rows lacking a score live in `unknown_spam`.

### Velocity deltas

For each player and time window:

```
new_rds = sum of newly-discovered RDs inside the window
lost_rds = sum of RDs lost inside the window
```

Deltas vs target:

```
delta(competitor) = competitor.new_rds - target.new_rds
```

Mark a delta `unavailable` when either side is null. Never extrapolate a missing window.

### Page-Level Link Gap

Activated when the target is a URL and at least one competitor URL is provided or sourced from a `serp-extract` run via `attach_serp_extract_run`.

```
emit when rd ∈ ⋃ RDs(competitor_url) AND rd ∉ RDs(target_url)
```

Asset hint is **only** emitted when the sample backlink anchor or the destination URL pattern unambiguously matches `study | dataset | tool | listicle | comparison`. Default to `unknown`.

### Brand Mention Gap

`--with-brand-mentions` requires:

1. `brand` string (target).
2. `competitor_brands[]` strings (one per competitor).
3. Mention evidence rows: each row has `domain`, `page_url`, `mentions_competitor: <name>`, `mentions_target: true|false`, `excerpt`.

Emit one row per domain where `mentions_competitor` is set and `mentions_target` is false. Sentiment is never inferred.

## Edge cases

- Empty intersect packets: emit zero rows and surface a limitation; do not back-compute from per-player RD lists.
- Single-competitor multi mode: intersect strength can only be 1; Link Intersect still works, but Anchor Diff "exclusive to competitors" devolves to that single competitor.
- URL with no measured competitor URLs: skip `page_link_gap`, surface a limitation, keep other surfaces.
- Time window not supplied: default to 180 days; record the default in the report.
- Cross-language brands: do not normalize accents in the brand string; record the user-supplied form verbatim.

## Anti-patterns

- Computing Link Gap by subtracting per-player RD lists when the provider already exposes `domain_intersection`. Use the provider field.
- Inferring asset type from the destination URL slug alone. The anchor or surrounding context is required.
- Reporting velocity as a rate per day when the provider only returns totals. Surface the window, not a derived rate.
- Adding brand-mention rows when the user did not pass mention evidence and `serp-extract` was not run with mention capture.
- Treating intersect strength as authority. Strength is structural overlap, nothing more.
