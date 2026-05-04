# SEO Brain Operating Model

Use this reference when a skill needs shared SEO Brain rules.

## Intelligence vs Judgment

- Intelligence: repeatable work with clear procedures, data extraction, deterministic checks, formatting, and routine updates.
- Judgment: strategic positioning, business priority, brand claims, editorial taste, risk, and final approval.

Agents may draft judgment-heavy artifacts, but they must request explicit approval before treating them as approved context.

## Project Paths

Runtime projects use:

```text
projects/[project-slug]/
  wiki/
  web/
  sources/
  reports/
  artifacts/
  .seo-brain/
```

## Wiki Status

Use frontmatter:

```yaml
status: draft
owner: human
judgment_level: strategic
approved_by: null
approved_at: null
sources: []
```

Allowed status values:

- `draft`
- `approved`
- `needs-review`
- `archived`

Allowed `judgment_level` values:

- `strategic`
- `editorial`
- `operational`
- `observational`

## Required Log Format

Append important events to `wiki/log/index.md`:

```md
## [YYYY-MM-DD] event-type | Short title

- Actor: agent|human
- Files: [[path]]
- Summary: what changed
- Approval: not-required|pending|approved|rejected
```

## Anti-Slop Rules for Brazilian Portuguese

- Use Brazilian Portuguese unless the project explicitly says otherwise.
- Do not use American title case. Capitalize only the first word and proper nouns.
- Avoid excessive bullets.
- Avoid a rhythm of many one-line paragraphs.
- Avoid literal translations of English metaphors.
- Avoid generic AI filler and unsupported superlatives.

