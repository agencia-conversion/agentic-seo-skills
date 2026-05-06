---
name: content-seo
description: Create, brief, rewrite, review, or optimize public SEO content through research, Skyscraper briefing, human approval, artifact draft, checks, and publication.
---

# Content SEO

Use this skill for public SEO content: briefings, outlines, articles, blog posts, landing-page copy, editorial pages, refreshes, and ranking-oriented content. The reader is external; the body is never internal Wiki documentation.

## Contract

Inputs: `topic`, optional `keyword`, optional `phase`, and explicit bypass flags only after current-user approval.

Writes are phase-bound: construction in `workbench/content/<slug>/`, delivered drafts/checks in `artifacts/contents/<slug>/`, and published content in `wiki/conteudos/` only with `status: published`.

Any public article, post, blogpost, editorial page, or ranking-oriented content must enter through this skill. Do not write public article bodies directly in another workflow.

## Required Behavior

Follow phases exactly:

1. `brief`: create `project/workbench/content/<slug>/research.yaml`, `competitor-evidence.yaml`, `context-evidence.yaml`, `brief.yaml`, and human-readable `brief.md`, then stop for human approval.
2. approval: record the human decision in chat or Companion; if approved, write `project/artifacts/contents/<slug>/draft.md` immediately, but do not publish.
3. `write`: recovery/retry only; load an approved briefing and write only to artifacts.
4. `review`/`check`: verify public-content identity, source policy, links, claims, pt-BR quality, and deterministic word-count target.
5. `promote`: after checks and final approval, copy content to `project/wiki/conteudos/<slug>.md` with `status: published`.

No autoapproval. If DataForSEO SERP data or Top 3 evidence is missing, stop unless the current user explicitly approved the named bypass and the artifact records the consequence.

Briefing must show evidence that the agent consumed Wiki context and `wiki/tom-de-voz/index.md`: path, status, hash, short excerpts, and limitations. Approval is blocked without `context_evidence`, `voice_evidence`, and an outline capacity check that supports the deterministic word target.

Apply Skyscraper from the Top 3 only: target words = highest valid Top 3 word count +20%, floor 2,000, rounded up to 100. If no Top 3 word count is valid, block instead of using the floor unless a Top 3 bypass is explicit.

## Progressive Discovery

Read shared project rules when needed: `skills/_shared/references/operating-model.md`.

Open only the reference for the current phase:

- Contract and phases: `references/00-contract.md`.
- Research packet: `references/01-research-packet.md`.
- Briefing: `references/02-briefing.md`.
- Approval: `references/03-approval.md`.
- Public draft: `references/04-public-draft.md`.
- Source links: `references/05-source-link-policy.md`.
- Review and checks: `references/06-review-and-checks.md`.

Examples live in `references/examples/`.

## Done Criteria

- The current phase produced only its allowed artifact.
- SEO analysis exists, or a current-run bypass is visible in the artifact.
- Brief approval is human-recorded; approved briefings create the artifact draft automatically.
- Delivered drafts live in `artifacts/contents`; workbench holds only construction files.
- Wiki content exists only after final approval, passed checks, and `status: published`.
- `competitor-evidence.yaml`, `context-evidence.yaml`, `brief.yaml`, checks, review, and word-count outputs are YAML; `brief.md` is the primary human review artifact.
- Public prose has no internal process language, local source links, generic anchors, forbidden competitor terms, fabricated proof, or stripped pt-BR accents.
