# Contract and phases

Content SEO creates public SEO content for publication. The body is written for an external reader, not for SEO Brain operators.

## Inputs

- `topic` and optional `keyword`.
- Existing DataForSEO-backed `project/workbench/seo-analysis/<keyword-slug>.yaml`, unless the current user explicitly approves a named bypass.
- Optional `phase`: `brief`, `approve`, `write`, `review`, `check`, or `promote`.

## Writes by phase

- `brief`: `project/workbench/content/<slug>/research.yaml`, `competitor-evidence.yaml`, `context-evidence.yaml`, `brief.yaml`, `brief.md`, log entry.
- `approve`: update the same `brief.yaml`; when approved, write `project/artifacts/contents/<slug>/draft.md`, log entry.
- `write`: recovery/retry to `project/artifacts/contents/<slug>/draft.md`, update `brief.yaml`, log entry.
- `review`/`check`: `project/artifacts/contents/<slug>/publication-check.yaml`, `word-count.yaml`, `review.yaml`.
- `promote`: `project/wiki/conteudos/<slug>.md` with `status: published`, update `brief.yaml`, log entry.

## Hard stops

- Do not write during `brief`.
- Approval writes the artifact draft automatically but never publishes.
- Do not write if briefing is pending, rejected, stale, missing provenance, or missing visible bypass.
- Do not approve without visible Wiki and tom de voz evidence.
- Do not brief without Top 3 competitor evidence: headings, meta/title, HTTP/fetch status, word count, and sub-agent review.
- Do not approve when `brief.outline_capacity.can_support_target` is not `true`.
- Do not pass checks if the draft is below the deterministic word-count target.
- Do not promote without passed checks and final human approval.
- Do not show raw Companion commands as the user experience; ask whether you may open a local browser window.
