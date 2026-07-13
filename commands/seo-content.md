---
description: Route to the `content-seo` skill to brief, write, review, optimize, or publish public SEO content.
argument-hint: "[optional context — slug, URL, tema, fase desejada (brief/approve/write/check/promote)]"
---

Invoke the `content-seo` skill for public SEO content work.

Request:

$ARGUMENTS

If `$ARGUMENTS` is empty, use the previous user message in the conversation as the request.

Follow the `content-seo` skill contract exactly:

1. Run the phases in order by default: `brief` → optional review/decision (`approve` compatibility alias) → `write` → `check` → `promote`. Record bypasses and limitations in the artifact.
2. Use DataForSEO (`node tools/clis/dataforseo.js status`) as the default source for SERP and keyword evidence. If not configured, invoke the `data-setup` skill.
3. Measure Top 3 competitor pages via `node tools/clis/extract.js --url <url> --format json`.
4. Write artifacts under `project/contents/<slug>/` only — `workbench/`, `sources/`, `draft.md`, `checks.yaml`, `published.md`.
5. Treat `project/brain/` as evidence overlay, not a precondition. Mirror public content only on explicit user request and after checks pass.
6. Separate raw evidence, synthesis, and human judgment. Never fabricate volume, rankings, backlinks, credentials, or proof.
7. Mark the briefing ready for writing when evidence and limitations are explicit; writing does not require an approver.

Preserve pt-BR diacritics in all human-facing prose.
