# Fixture: internal link opportunities

Review a small site for internal link opportunities.

Pages:

- `/seo-agentico/` target article, status 200.
- `/blog/ia-para-seo/` mentions "SEO agêntico" but has no link.
- `/blog/ferramentas-seo/` already links to `/seo-agentico/`.
- `/blog/post-antigo/` returns 404.

Expected output:

- Proposed links with source URL, target URL, anchor, and before/after text.
- Rejected opportunities with reasons.
- Apply status requiring review before changes.

Constraints:

- Same-site links only.
- No duplicate link insertion.
- Do not propose links from 404 pages.
- Preserve pt-BR accents in anchors.
