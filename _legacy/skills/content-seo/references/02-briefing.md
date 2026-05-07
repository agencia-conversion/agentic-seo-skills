# Briefing

The briefing is a writing contract for public SEO content.

## Required fields

- `topic`, `topic_slug`, `keyword`, `keyword_slug`, `language`, `market`.
- `data_provenance`, `process_bypass`, `competitor_evidence`, `context_evidence`, `evidence_sources`, `public_citations`.
- `serp_competitor_domains`, `forbidden_prose_terms`, `source_policy`.
- `voice_context` and `context_evidence.voice_evidence`.
- `skyscraper.word_count.target_words`.
- `competitor_evidence.path` pointing to `competitor-evidence.yaml`.
- `approval.phase: briefing`, `approval.status: pending|approved|needs-rewrite|rejected`.
- `brief.public_content_type: article|landing_page|refresh`.
- `brief.intent`, `reader_need`, `promise`, `target_words`, `must_include`, `must_avoid`, `source_requirements`, `outline`, and `outline_capacity`.
- `draft_status`.

## Checks

- The promise is reader-facing and does not mention Wiki, workbench, briefing, log, agent, provider, or internal process.
- `brief.md` must render the YAML contract into a human-readable review artifact with keyword, intent, limitations, outline, section word budgets, and Web Companion recommendation.
- `outline_capacity.can_support_target` must be `true`; expand the outline in a loop until planned H2 sections and planned words support the word target.
- Missing analysis, draft voice, missing citations, or bypasses are visible before approval.
- Wiki pages read must include path, status, hash, and short excerpts.
- Tom de voz evidence must include path, status, hash, extracted patterns, and avoid rules.
- Top 3 evidence must include heading tags, word count, and sub-agent-style review for positions 1-3, or a visible bypass.
- Approval status starts as `pending`; there is no agent autoapproval.
