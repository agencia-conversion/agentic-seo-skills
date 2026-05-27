# Fixture: content SEO workflow with gates

Create the workflow output for a public article about `O que é SEO agêntico` in pt-BR.

Available context:

- Project language: `pt-BR`.
- Keyword: `seo agêntico`.
- SERP data is unavailable.
- The user records a DataForSEO bypass reason: `teste editorial sem DataForSEO`.
- `project/brain/voice.md` is empty (no voice principles defined yet).
- `project/brain/review.md` exists with the universal editorial review rules populated (template default), but no project-specific particularities yet.

Expected output:

- A briefing status that is ready for writing with limitations.
- A clear record of skipped data dimensions and consequences.
- The three research artifacts under `project/workbench/content/o-que-e-seo-agentico/`: `market-consensus.md` (web research, no SERP available), `brand-pov.md` (Brain + brand-domain web research), and `outline.md` (analyst synthesis with intent classification, deterministic `target_words_basis`, and per-section differentiation map).
- A blocked or conditional draft step because voice evidence is missing.
- If the workflow reaches `check`, `checks.yaml > review.page_present: true`, `review.review_backed: true` (universal rules count), `principles_checked` lists the universal items applied (lead, attribution, anti-IA-slop, anti-Conversion-explainer, pt-BR accents), and `failures` lists any draft violation. The Output Format YAML reports `brain_overlay.review_backed: true` and `brain_state.review: filled`.
- Correct pt-BR accents in all human-facing prose.

Constraints:

- Do not publish into `project/contents/`.
- Do not claim data-backed search volume or top-3 findings.
- Do not fabricate briefing readiness or missing evidence.
- The DataForSEO bypass forces `evidence_gates.dataforseo: bypassed` and prevents claiming a measured Skyscraper target; record `target_words_basis` as the bypass-aware fallback, never as a fabricated number.
