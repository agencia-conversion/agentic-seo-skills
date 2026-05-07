# Fixture: deterministic technical audit interpretation

Interpret a deterministic audit for a blog post page.

Audit facts:

- page type: `blog`
- score: 62
- failed checks: missing canonical, duplicate H1, missing Article schema, images without alt text
- passed checks: title, meta description, indexable robots, one H2

Expected output:

- Human-readable priority list.
- Deterministic JSON result preserved without changing pass/fail.
- Repair suggestions.
- Follow-up checks after fixes.

Constraints:

- The LLM must not change the score or decide pass/fail.
- Do not claim the page is production-ready.
- Preserve technical terms and pt-BR accents where used.
