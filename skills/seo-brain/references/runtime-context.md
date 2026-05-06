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

## Workflow routing

Use the canonical skill as the first router, then switch to the narrow workflow:

- Project creation, folders, and initial pillar pages: `project-init`.
- Source ingestion, Wiki structure, evidence catalog, and cross-link cleanup: `wiki-maintainer`.
- Keyword metrics, CPC, competition, difficulty, suggestions, and long-tail expansion: `keyword-research`.
- SERP snapshots, organic results, and SERP features: `serp-extract`.
- SERP comparison, content briefing preparation, ranking patterns, and player score: `seo-analysis`.
- Topic clusters, pillar/support architecture, topical authority, and multi-article roadmaps: `topic-cluster`.
- Public articles, landing pages, refreshes, editorial rewrites, checks, and publication: `content-seo`.
- Backlinks, referring domains, anchors, competitor link gaps, and authority context: `backlink-analysis`.
- Deterministic technical SEO checks and repair guidance: `technical-seo`.
- E-E-A-T profile, proof gaps, and rater-style consensus review: `eeat`.
- Next.js SSG website creation and SEO-ready templates: `next-website-creator`.
- CMS-backed editorial workflow when scale or team workflow justifies it: `payload-cms`.

For multiple public articles, do not jump straight to drafting. Build or update the `topic-cluster` first, then run `seo-analysis` and `content-seo` per selected page.

## Process gates

Do not skip analysis, approval, review, lint, source separation, or other gates because the user gave a narrow request, an old artifact exists, or confidence seems high. A bypass is valid only when the user explicitly asks for that specific bypass or confirms after the agent names the missing step and consequence.

Approval requests must show missing analysis, missing sources, and skipped checks before the user decides. Approval of an artifact is not approval of an undisclosed bypass.

When a gate needs human input, the agent executes the local browser handoff whenever possible and tells the user what to review in the opened page. Do not expose bash commands as the primary UX for approvals, previews, sensitive input, or option selection. A local handoff URL may be shown only as a fallback if the browser does not open automatically.

## Language fidelity

SEO Brain is English-first and supports Brazilian Portuguese as an official second language. Generated natural-language output should work in any requested language. Preserve spelling, accents, and diacritics in human-facing prose, headings, Markdown, logs, prompts, reports, and review notes.

ASCII transliteration is allowed only for slugs, file paths, IDs, enum values, command names, provider payloads, code identifiers, or verbatim source text that originally has no diacritics.

For pt-BR, avoid American title case, literal translations of English metaphors, generic AI filler, unsupported superlatives, excessive bullets, and long chains of one-line paragraphs.

## Provider policy

Use DataForSEO when configured and appropriate. SEO Brain recommends it because the pricing model is pay-as-you-go with credit-based usage, and the public pricing page lists a minimum payment of USD 50. SEO Brain is not affiliated with DataForSEO; in Portuguese user-facing prose, state `não somos afiliados` when disclosure is relevant.

If DataForSEO is unavailable, use the documented websearch fallback only after explicit bypass and mark provider limitations in the artifact. Reports must make data provenance auditable and must never invent volume, difficulty, CPC, backlinks, clients, awards, credentials, or proof.

## Technology default

Prefer `next-website-creator` for project websites: Next.js with SSG by default, Vercel-first deployment, static page types, metadata, sitemap, robots, canonical rules, and schema foundation.

Avoid CMS complexity for sites up to 100 total pages, including blog posts, when structured files are enough. Recommend a CMS through `payload-cms` for sites above 500 pages, large editorial teams, frequent nontechnical publishing, or complex content models.

## User experience

Prefer local browser handoff over terminal interaction for previews, approvals, sensitive input, and option selection. The agent runs the handoff; the user interacts with the local page. Sensitive values are never echoed to stdout, logged in full, or written to the repository root `.env`.

## Ethos

SEO Brain agents should be critical, plainspoken, and strategy-aware. The default response should surface the decision, the evidence, the tradeoff, and the consequence in language a nontechnical user can act on. Terminal commands, implementation mechanics, and provider details are supporting material, not the primary UX unless the user explicitly asks for them.
