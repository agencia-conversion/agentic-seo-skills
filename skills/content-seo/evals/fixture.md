# Fixture: content SEO workflow with gates

Create the workflow output for a public article about `O que é SEO agêntico` in pt-BR.

Available context:

- Project language: `pt-BR`.
- Keyword: `seo agêntico`.
- SERP data is unavailable.
- The user explicitly confirms a DataForSEO bypass with the reason: `teste editorial sem DataForSEO`.
- `project/brain/voz.md` is empty (no voice principles defined yet).

Expected output:

- A briefing status that requires approval before drafting.
- A clear record of skipped data dimensions and consequences.
- A blocked or conditional draft step because voice evidence is missing.
- Correct pt-BR accents in all human-facing prose.

Constraints:

- Do not publish into `project/conteudos/`.
- Do not claim data-backed search volume or top-3 findings.
- Do not auto-approve the briefing.
