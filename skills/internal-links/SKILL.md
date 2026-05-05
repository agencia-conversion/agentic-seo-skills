---
name: internal-links
description: Find and validate internal link opportunities using websearch, verified URLs, contextual edits, and approval-ready recommendations.
---

# Internal Links

Use this skill when the user asks for internal links, contextual links, link opportunities, anchor text improvements, or internal linking quality checks.

Read when needed: `skills/_shared/references/operating-model.md`, `skills/content-seo/SKILL.md`, and `projects/[project]/wiki/conteudos/topic-clusters.md`.

## Contract

Inputs: project slug; domain or URL scope; one URL/topic or a batch list; `direction` in `inbound|outbound|both`; optional language, market, max recommendations, and `--apply-approved`.

Writes only:

- `projects/[project]/reports/internal-links/`
- `projects/[project]/artifacts/internal-links/`
- `projects/[project]/wiki/log/index.md`

## Required Behavior

- Use websearch as the primary discovery engine with queries like `site:domain.com "topic"` and record each query.
- Support single and batch runs. For `inbound`, find source pages that should link to the target. For `outbound`, find target destinations that the source page should link to. For `both`, do both and label each recommendation.
- Verify source and target URLs before recommending: final URL must return 200 after redirects and must not be a 404, soft 404, timeout, non-HTML page, or blocked fetch. If a missing page should exist, put it in `missing_pages`.
- Extract existing links from each source page and enforce one source page -> one target URL. If the source already links to the target, suggest improving the existing anchor instead of adding another link.
- Normalize URLs before duplicate checks: resolve redirects, remove fragments, normalize trailing slash, and ignore tracking parameters such as `utm_*`.
- Prefer contextual body links; avoid nav, footer, sidebar, author box, and generic related-post lists unless the user asks for structural links.
- Each recommendation must include source URL, target URL, heading or section, full `before` block, full `after` block with the link, anchor text, reason, query evidence, and checks.
- Preserve the source language, spelling, capitalization, punctuation, and diacritics in `before`, `after`, and anchor text; do not transliterate editorial text during extraction or reporting.
- Anchor text must be descriptive, natural, and informative on its own. Block generic anchors such as "clique aqui", "saiba mais", "aqui", "leia mais", "neste link", and "link".
- Apply the link-removed test: the sentence must remain coherent if the link is removed.
- Separate deterministic evidence from LLM judgment. Do not fabricate search volume, authority, traffic, or business priority.
- `--apply-approved` may only apply recommendations explicitly marked approved by a human.

## Deterministic Checks

- source and target final status are 200;
- source and target are same-site internal URLs;
- source URL is not the target URL;
- recommendation direction is explicit: `inbound` or `outbound`;
- no existing source link already points to the normalized target URL;
- no two new recommendations from the same source point to the same target;
- anchor is non-generic and not over-repeated for the same target;
- recommendation includes exact edit context, full before/after blocks, and websearch provenance.

## LLM Judgment

Use LLM judgment only for semantic fit, reader value, best paragraph, natural anchor wording, and whether a missing page is strategically useful. Mark low-confidence matches as `needs-review`.

## Done Criteria

- JSON report exists with provider, generated_at, mode, direction, queries, verified URLs, recommendations, missing_pages, and blocked_candidates.
- Every recommendation has paragraph-level edit context and all deterministic checks pass.
- Duplicate same-source same-target links are blocked or converted into anchor-improvement suggestions.
- Human-readable artifact includes an approval table with source, where to edit, anchor, before, after, and verification status.
- Project log records the run and approval state.
