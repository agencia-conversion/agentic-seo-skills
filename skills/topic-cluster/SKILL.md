---
name: topic-cluster
description: Create SEO topic clusters from keyword data, business strategy, user intent, and information-completeness gaps.
---

# Topic Cluster

Use this skill when the user asks for clusters, topical authority, content architecture, pillar pages, or SEO roadmap structure.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `skills/keyword-research/SKILL.md`
- `wiki/conteudos/topic-clusters.md` in the target project, if present.

## Contract

Inputs:

- project slug;
- seed topic, product, service, or keyword set;
- optional market, geography, language, and business goal.

Writes only:

- `projects/[project]/wiki/conteudos/topic-clusters.md`
- related draft Wiki pages under `projects/[project]/wiki/conteudos/`
- reports under `projects/[project]/reports/`

## Required Behavior

- Use keyword research when credentials/data are available.
- Do not cluster only by keyword similarity.
- Include business value, funnel stage, intent, and information completeness.
- Distinguish measured keyword data from strategic hypotheses.
- Propose missing content needed for topical completeness.

## Done Criteria

- Cluster map has pillar/supporting pages.
- Each cluster has intent and business rationale.
- Data-backed fields identify their source.

