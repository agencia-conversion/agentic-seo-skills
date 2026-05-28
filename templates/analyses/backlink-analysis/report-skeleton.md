---
title: "{{title}}"
slug: "{{run_slug}}"
report_type: "backlink-analysis"
generated_at: "{{generated_at}}"
status: "ready"
source_artifact: "audits/backlinks-{{run_slug}}/report.yaml"
summary: "{{summary}}"
---

## Executive summary

{{executive_summary}}

```agentic-kpis
version: 1
items:
  - label: Backlinks
    value: "{{backlinks}}"
  - label: Ref. domains
    value: "{{referring_domains}}"
  - label: Rank
    value: "{{rank}}"
  - label: Spam
    value: "{{spam}}"
```

## Comparison

```agentic-table
version: 1
columns:
  - key: target
    label: Target
  - key: backlinks
    label: Backlinks
  - key: referring_domains
    label: Ref. domains
  - key: rank
    label: Rank
  - key: spam
    label: Spam
rows:
  - target: "{{target}}"
    backlinks: "{{backlinks}}"
    referring_domains: "{{referring_domains}}"
    rank: "{{rank}}"
    spam: "{{spam}}"
```

## Backlink sample

{{backlink_sample}}

<!-- The sections below are emitted only when mode == multi-competitor. Drop them entirely on single-mode reports. -->

## Link Gap

```agentic-table
version: 1
columns:
  - key: referring_domain
    label: Referring domain
  - key: intersect_strength
    label: Overlap strength
  - key: rank
    label: Rank
  - key: observed_on
    label: Observed on
  - key: first_seen
    label: First seen
  - key: sample
    label: Sample backlink
rows: []
```

## Link Intersect

```agentic-table
version: 1
columns:
  - key: referring_domain
    label: Referring domain
  - key: anchors_target
    label: Anchors (target)
  - key: anchors_competitors
    label: Anchors (competitors)
  - key: backlinks_target
    label: Backlinks (target)
  - key: backlinks_competitors
    label: Backlinks (competitors)
rows: []
```

## Anchor Distribution

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: branded
    label: Branded (%)
  - key: exact_match
    label: Exact match (%)
  - key: partial_match
    label: Partial match (%)
  - key: naked
    label: Naked URL (%)
  - key: generic
    label: Generic (%)
  - key: image_or_empty
    label: Image/empty (%)
rows: []
```

## Quality Mix

```agentic-table
version: 1
columns:
  - key: player
    label: Player
  - key: editorial
    label: Editorial
  - key: directory
    label: Directory
  - key: ugc
    label: UGC
  - key: news
    label: Press
  - key: suspected_spam_network
    label: Suspected spam
  - key: unknown
    label: Unknown
rows: []
```

## Acquisition velocity

```agentic-kpis
version: 1
items:
  - label: Window
    value: "{{time_window_days}} days"
  - label: New RDs (target)
    value: "{{target_new_rds}}"
  - label: Lost RDs (target)
    value: "{{target_lost_rds}}"
```

```agentic-chart
version: 1
type: bar
x_label: Player
y_label: RDs (new vs lost)
series:
  - name: New
    data: []
  - name: Lost
    data: []
```

## Page-Level Link Gap

<!-- URL mode only. Drop on domain mode. -->

```agentic-table
version: 1
columns:
  - key: target_url
    label: Target URL
  - key: competitor_url
    label: Competitor URL
  - key: rds_only_competitor
    label: RDs only on competitor
  - key: sample
    label: Sample backlink
rows: []
```

## Brand Mention Gap

<!-- Optional. Drop if --with-brand-mentions was not active. -->

```agentic-table
version: 1
columns:
  - key: domain
    label: Domain
  - key: page_url
    label: Page
  - key: mentions_competitor
    label: Mentions competitor
  - key: excerpt
    label: Excerpt
rows: []
```

## Risks and next steps

{{risks_and_next_actions}}
