---
description: Route to the `content-seo` skill to brief, write, review, optimize, or publish public SEO content.
argument-hint: [optional context — slug, URL, tema, fase desejada (brief/approve/write/check/promote)]
---

Invoke the `content-seo` skill for public SEO content work.

Request:

$ARGUMENTS

If `$ARGUMENTS` is empty, use the previous user message in the conversation as the request.

Follow the `content-seo` skill contract exactly:

1. Run the phases in order by default: `brief` → `approve` → `write` → `check` → `promote`. Only bypass on explicit user request, recording the bypass in the artifact.
2. Use DataForSEO (`node tools/clis/dataforseo.js status`) as the default source for SERP and keyword evidence. If not configured, invoke the `data-setup` skill.
3. Measure Top 3 competitor pages via `node tools/clis/extract.js --url <url> --format json`.
4. Write artifacts under `project/contents/<slug>/` only — `workbench/`, `sources/`, `draft.md`, `checks.yaml`, `published.md`.
5. Treat `project/brain/` as authorial context, not a publication target. Promote public content only through the approved content workflow.
6. Separate raw evidence, synthesis, and human judgment. Never fabricate volume, rankings, backlinks, credentials, or proof.
7. Require human approval of the briefing before draft body writing, unless the user explicitly asks to skip.

Preserve pt-BR diacritics in all human-facing prose.
