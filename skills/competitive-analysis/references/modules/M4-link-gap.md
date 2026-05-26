# M4 — Link Gap & Linkable Assets (referenced)

Off-page link surfaces (Link Gap, Link Intersect, Anchor Distribution Comparison, Quality Mix, Velocity Delta, Page-Level Link Gap, Brand Mention Gap) are owned by `backlink-analysis` v2 `multi-competitor` mode.

This module consumes the backlink run and presents only the headline KPIs in the competitive report; it does not re-fetch or recompute.

## Inputs

- `attach_backlink_analysis_run: <slug>` (required) — path resolves to `project/audits/backlinks-<slug>/report.yaml`.
- Optional `bl_sections: []` to limit which backlink surfaces appear in the competitive headline KPIs.

## Behavior

1. Read the backlink run YAML.
2. Validate `mode == multi-competitor` and `status in {complete, partial}`. If `single` or `blocked`, return `m4_link_gap.status: not_run` with a limitation pointing to the missing run.
3. Extract headline KPIs:

```yaml
headline_kpis:
  total_link_gap_rows: 0
  total_link_intersect_rows: 0
  top_anchor_diff_signal: ""
  velocity_delta_largest_player: ""
  velocity_delta_value: null
  brand_mention_gap_rows: null
  page_link_gap_rows: null
backlink_run_slug: ""
backlink_run_status: complete | partial
backlink_run_path: project/audits/backlinks-<slug>/report.yaml
```

4. The Companion report shows these KPIs and links to the backlink module's own report (`project/analyses/backlink-analysis/<slug>/report.md`).

## Sub-run policy

When the user did not pass `attach_backlink_analysis_run`, this skill may **schedule** a sub-run of `backlink-analysis` in `multi-competitor` mode using the same target and competitors. The sub-run produces its own report; M4 then attaches to that slug. Never inline backlink computation here.

## Anti-patterns

- Re-implementing `domain_intersection`, `page_intersection`, anchor diff, quality mix, velocity, or brand mention in this module.
- Showing more than a one-screen KPI summary in the competitive report; depth lives in the backlink module's own report.
- Treating an attached `single` run as multi-competitor. Reject and ask for the multi-competitor run.
