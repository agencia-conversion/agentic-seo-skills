# Review and checks

Review removes AI slop and blocks unsafe publication.

## Editorial review

- Keep pt-BR accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Use natural pt-BR heading capitalization.
- Remove unsupported superlatives, vague adjectives, literal English metaphors, and long bullet runs.
- Mark hypotheses as hypotheses; do not promote them to fact.

## Blocking checks

- Forbidden competitor terms in prose.
- Internal process language or paths.
- Local links in public body.
- Empty source metadata.
- Generic anchors.
- Link-removed test failures.
- `actual_words < target_words` in `word-count.yaml`.
- Pending or failed publication check before promotion.
- Draft in `wiki/conteudos` before promotion.

## Routing short content

- Briefing approval is invalid if the approved outline cannot support the target word count.
- If the draft is short and H2 sections are below `ceil(target_words / 500)`, return to briefing.
- If the draft is short but the outline has enough H2 sections, return to writing.
- Checks write YAML only: `publication-check.yaml`, `word-count.yaml`, and `review.yaml`.
