---
name: topic-cluster
description: Create SEO topic clusters from seo-analysis output, business strategy, user intent, and information-completeness gaps. Requires an seo-analysis report unless --hypothesis-only is used.
---

# Topic Cluster

Use this skill when the user asks for clusters, topical authority, content architecture, pillar pages, or SEO roadmap structure.

Read first when needed:

- `skills/seo-analysis/SKILL.md`
- `skills/_shared/references/operating-model.md`
- `projects/[project]/wiki/conteudos/topic-clusters.md` when present.

## Contract

Inputs:

- project slug;
- seed topic, product, service, or keyword set;
- optional market, geography, language, and business goal;
- optional `--hypothesis-only` flag to bypass the seo-analysis precondition.

Writes only:

- `projects/[project]/wiki/conteudos/topic-clusters.md`
- `projects/[project]/reports/topic-cluster/<seed-slug>.json`

## Hard Precondition

`reports/seo-analysis/<seed-slug>.json` must exist before a production-grade cluster is generated. If absent, the only legal alternative is `--hypothesis-only`, which produces a cluster with `status: hypothesis` clearly marked in the JSON and in the Wiki entry.

## Required Behavior

- Read the seo-analysis report (when present) and use its `intent` to label supporting pages.
- Do not cluster only by keyword similarity; include business value, funnel stage, intent, and information completeness.
- Distinguish measured keyword data from strategic hypotheses. When `keyword_metrics` is `null` in the analysis, mark all numeric assumptions as hypothesis.
- Propose missing content needed for topical completeness.
- Record `data_provenance.seo_analysis` in the cluster JSON, with the report path, provider and provider_reason.

## Done Criteria

- Cluster JSON has `status` in `{draft, hypothesis}`.
- Cluster has a pillar page and at least three supporting pages.
- Each supporting page has `intent` and `judgment`.
- Provenance points to the seo-analysis file (or carries a `hypothesis-only run` reason).
- Wiki entry in `conteudos/topic-clusters.md` reflects the same status and intent.
