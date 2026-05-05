# SEO Brain runtime context

SEO Brain implements Agentic SEO through six pillars:

1. Strategy
2. LLM Wiki
3. Technology
4. Technical SEO
5. Content
6. Data and Analysis

Humans own judgment. Agents execute repeatable intelligence. Agent drafts are not approved strategic context until the user explicitly approves them.

## Default project model

Runtime project data lives under `project/`. The Wiki lives in `project/wiki/` and should be opened as the Obsidian vault. Raw source material lives in `project/sources/` and is treated as immutable or append-only. Drafts, hypotheses, reports, and temporary reviews live in `project/workbench/`.

Strategic pages that need explicit human approval:

- `wiki/index.md`
- `wiki/eeat.md`
- `wiki/tecnologia/index.md`
- `wiki/tom-de-voz/index.md`

Important events are appended to `wiki/log/index.md` with a type of `strategic-approval` or `operational-decision` when the active workflow touches the Wiki.

## Golden path

1. `project-init`: create the project folder and initial Wiki.
2. Strategic approval: approve the required strategic pages.
3. `data-setup`: confirm DataForSEO or fallback provider status.
4. `seo-analysis`: produce a data-backed report for any topic that will receive content.
5. `topic-cluster`: use the SEO analysis report unless the user explicitly chooses hypothesis-only work.
6. `content-seo`: use the SEO analysis report unless the user explicitly requests and records a data bypass.

## Process gates

Do not skip analysis, approval, review, lint, source separation, or other gates because the user gave a narrow request, an old artifact exists, or confidence seems high. A bypass is valid only when the user explicitly asks for that specific bypass or confirms after the agent names the missing step and consequence.

Approval requests must show missing analysis, missing sources, and skipped checks before the user decides. Approval of an artifact is not approval of an undisclosed bypass.

## Language fidelity

SEO Brain is English-first and supports Brazilian Portuguese as an official second language. Generated natural-language output should work in any requested language. Preserve spelling, accents, and diacritics in human-facing prose, headings, Markdown, logs, prompts, reports, and review notes.

ASCII transliteration is allowed only for slugs, file paths, IDs, enum values, command names, provider payloads, code identifiers, or verbatim source text that originally has no diacritics.

For pt-BR, avoid American title case, literal translations of English metaphors, generic AI filler, unsupported superlatives, excessive bullets, and long chains of one-line paragraphs.

## Provider policy

Use DataForSEO when configured and appropriate. If unavailable, use the documented websearch fallback and mark provider limitations in the artifact. Reports must make data provenance auditable and must never invent volume, difficulty, CPC, backlinks, clients, awards, credentials, or proof.

## User experience

Prefer local browser handoff over terminal interaction for previews, approvals, sensitive input, and option selection. Sensitive values are never echoed to stdout, logged in full, or written to the repository root `.env`.
