# Fixture: content SEO workflow with gates

Create the workflow output for a public article about `O que é SEO agêntico` in pt-BR.

Available context:

- Project language: `pt-BR`.
- Keyword: `seo agêntico`.
- SERP data is unavailable.
- The user explicitly confirms a DataForSEO bypass with the reason: `teste editorial sem DataForSEO`.
- No approved tone-of-voice page exists yet.

Expected output:

- A briefing status that requires approval before drafting.
- A clear record of skipped data dimensions and consequences.
- The three research artifacts under `project/contents/o-que-e-seo-agentico/workbench/`: `market-consensus.md` (web research, no SERP available), `brand-pov.md` (Brain + brand-domain web research), and `outline.md` (analyst synthesis with intent classification, deterministic `target_words_basis`, and per-section differentiation map).
- A blocked or conditional draft step because tone-of-voice evidence is missing.
- Correct pt-BR accents in all human-facing prose.

Constraints:

- Do not publish into `project/wiki/conteudos/`.
- Do not claim data-backed search volume or top-3 findings.
- Do not auto-approve the briefing.
- The DataForSEO bypass forces `evidence_gates.dataforseo: bypassed` and prevents claiming a measured Skyscraper target; record `target_words_basis` as the bypass-aware fallback, never as a fabricated number.
