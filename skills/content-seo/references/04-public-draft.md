# Public draft

Write for an external reader searching the keyword. The draft is public SEO content, not a Wiki page.

## Rules

- Approval writes the first draft automatically after `approval.status: approved`.
- Write/retry only to `project/artifacts/contents/<slug>/draft.md`.
- Workbench is for construction files, not delivered drafts.
- Use normal Markdown links to canonical public URLs only.
- Do not link to `project/sources`, `workbench`, local files, or raw snapshots in the body.
- Do not use Obsidian wikilinks in the article body.
- Do not mention Wiki, workbench, briefing, log, agent, provider, internal paths, approval gates, or SERP mechanics unless the topic explicitly requires them.
- Never invent keyword volume, backlinks, rankings, clients, credentials, awards, experience, or proof.

## Frontmatter

Draft frontmatter must include `public_content: true`, `content_type`, `primary_keyword`, `brief_path`, `context_evidence_path`, `brief_status`, `voice_status`, `target_words`, `source_policy`, `sources`, and pending approval fields.
