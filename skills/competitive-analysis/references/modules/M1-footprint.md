# M1 — Footprint Overview

Side-by-side organic footprint of the target and 1-4 competitor domains. The cheapest, broadest module; it informs M2 and M3.

## Inputs

- `target`, `competitors[]`: domains.
- `location`, `language`, `device`: required.
- `time_range`: optional; provider defaults when absent.

## Provider surfaces

- `POST /v3/dataforseo_labs/google/domain_rank_overview/live` — per-domain rank score, organic_keywords, organic_etv (estimated traffic value), traffic_cost, position buckets when returned.
- `POST /v3/dataforseo_labs/google/ranked_keywords/live` — full keyword list per domain when needed for downstream M2/M3 reuse. Cap at `keyword_limit` (default 1000) per player.

## Compute rules

- Emit one row per player with `domain_rank`, `organic_keywords`, `organic_etv`, `traffic_cost`, `position_buckets`, and `serp_features_owned_count` when present in the packet.
- Position buckets: 1-3, 4-10, 11-20, 21-50, 51-100. Use the provider's bucket field when available; otherwise compute from `ranked_keywords` positions.
- Estimated traffic uses `organic_etv` strictly; never invent.
- When a player returns 0 ranked keywords, keep the row with `null` values and a limitation; do not drop the player.

## Row shape (YAML)

```yaml
- player: ""
  role: target | competitor
  domain_rank: null
  organic_keywords: null
  organic_etv: null
  traffic_cost: null
  position_buckets:
    1_3: null
    4_10: null
    11_20: null
    21_50: null
    51_100: null
  serp_features_owned_count: null
  evidence_path: project/sources/competitive/<run-slug>/dataforseo/m1/<player>.raw.json
```

## Edge cases

- Provider returns 0 keywords for a competitor: keep the row, mark `organic_keywords: 0`, add limitation noting the location/language/device used.
- Subdomain ambiguity: `include_subdomains` defaults to `true`; the report must echo the setting and show one row per `players[*].normalized` value.
- New domain (no historical data): every metric `null`; flag as "new or thin presence" in synthesis, not as "low authority".

## Anti-patterns

- Inferring traffic from rank alone. Use `organic_etv` or mark `unavailable`.
- Computing percentages over `organic_etv` to claim market share. ETV is provider-modeled; do not chain it into a share-of-market claim without a separate SoV (M2).
- Aggregating subdomains and apex into one bucket without echoing `include_subdomains` setting.
