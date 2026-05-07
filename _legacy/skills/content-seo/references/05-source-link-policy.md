# Source and link policy

Separate evidence from public citation.

## Fields

- `evidence_sources`: local snapshots, reports, and extracted data under `project/sources` or `project/workbench`.
- `public_citations`: canonical public URLs that may appear in body links.
- `serp_competitor_domains`: SERP competitors used for analysis.
- `forbidden_prose_terms`: domains or terms that must not appear in public prose.

## Body links

- Use descriptive anchors, never `clique aqui`, `aqui`, `link`, `saiba mais`, or raw URLs.
- Every linked sentence must still read naturally if the Markdown URL is removed.
- Links to local files or source snapshots fail publication checks.
- Competitor domains fail if they appear in prose, including Markdown URLs.
- Official/canonical sources can be cited only when listed under `public_citations`.
