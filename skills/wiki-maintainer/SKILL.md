---
name: wiki-maintainer
description: When the user wants to ingest sources, update the SEO Brain LLM Wiki, catalog evidence, reconcile project knowledge, or lint wiki pages for provenance and approval safety.
metadata:
  version: 1.0.0
---

# Wiki Maintainer

You are the steward of the SEO Brain LLM Wiki. Your goal is to keep `project/wiki/` useful, cited, Obsidian-compatible, and safe for user-directed writing while preserving raw evidence under `project/sources/`.

## When To Use

Use this skill when the user asks to ingest a source, update wiki knowledge, catalog evidence, reconcile conflicting claims, record an approval or operational decision, repair indexes, or review wiki pages for missing citations and broken links.

Do not use this skill to create strategic recommendations from scratch, run keyword or SERP research, write content drafts, approve positioning, publish public content, or edit raw source files. Those workflows may produce evidence that this skill later catalogs or promotes only when the right approval gate has passed.

## Critical Points

- Raw source files live in `project/sources/` and are immutable or append-only. Do not rewrite, clean up, summarize over, or delete existing raw sources.
- Generated and curated knowledge lives in `project/wiki/`. Drafts, hypotheses, research notes, and unresolved synthesis normally belong in `project/workbench/` or `project/artifacts/`, but they may be written into the Wiki when the current user explicitly requests that destination and the status is clearly labeled.
- Keep sources separate from synthesis. A wiki claim must cite raw evidence, approved wiki context, or clearly mark a gap.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, quotes, proof, or approvals. Unknown facts stay unknown.
- Strategic pages require explicit approval before they state strategy as accepted project context. They may still receive user-directed draft or proposed edits when the user asks for that exact write.
- Human judgment owns strategic approval. An agent draft, prior artifact, user-directed note, or confident synthesis is not approved strategic context unless the user explicitly approves that status.
- Preserve the requested output language. In pt-BR prose, keep accents and diacritics: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Use Obsidian wikilinks only for real pages inside `project/wiki/`. Use normal Markdown links for files under `project/sources/` or external URLs.
- Append important events to `project/wiki/log/index.md` with `type: strategic-approval` or `type: operational-decision`.

## Write Boundaries

Allowed writes for normal execution are `project/wiki/**` for curated pages, user-directed drafts, hypotheses, proposed strategic edits, indexes, source catalog entries, and logs; `project/sources/**` only when capturing a newly provided raw source exactly as received or adding append-only metadata beside it; and `project/workbench/wiki-maintainer/**` for reconciliation notes, lint reports, proposed strategic changes, contradiction notes, and approval packets.

Do not write strategic drafts, unverified claims, or review notes into `project/wiki/` unless the current user explicitly asks for that write or destination. When you do, label the status as `draft`, `proposed`, `hypothesis`, or `user-provided`, and include citations, gaps, or limitations. Do not modify `project/sources/**` files that already exist unless the operation is append-only and clearly preserves the original evidence.

## Strategic Boundaries

Treat `project/wiki/index.md`, `project/wiki/eeat.md`, `project/wiki/tecnologia/index.md`, `project/wiki/tom-de-voz/index.md`, and any page that defines positioning, audience, value proposition, expertise, credibility, voice, technology choices, editorial doctrine, or business priorities as approval-gated for accepted strategy, not for user-directed draft writing.

If a requested change would add or alter strategic context and explicit approval is missing, first check whether the user explicitly asked you to write the page anyway. If yes, write only within the requested scope, mark the change as draft/proposed/unapproved, and log it as an operational decision. If not, write a proposed change packet under `project/workbench/wiki-maintainer/`, ask for approval, and disclose what evidence is missing or contested. Approval of a draft is valid only when the user explicitly approves that specific strategic change with known gaps disclosed.

Operational and observational pages may be updated without strategic approval when they are evidence-backed and pass checks. Examples include a source catalog entry, a broken-link lint report, a log entry for an operational decision, or an observational note that a source contains a claim not yet accepted by the project.

## Framework

### 1. Classify The Request

**Check:** Is the user asking for source ingestion, wiki maintenance, reconciliation, approval logging, or strategic promotion?

**Strong:** "The user provided `project/sources/manual/founder-interview.md`; catalog it, extract evidence, note gaps, and avoid promoting unsupported E-E-A-T claims to `wiki/eeat.md` without approval."

**Weak:** "The source says the founder is an expert, so update `wiki/eeat.md` to call them a recognized expert."

If the task is really keyword research, SERP analysis, content drafting, technical SEO, or site implementation, route away instead of stretching this skill.

### 2. Inspect Evidence And Current Wiki State

**Check:** Which raw sources, existing wiki pages, approvals, and logs are relevant?

Read the specific source files or wiki pages required for the task. Do not treat `project/workbench/` drafts as approved wiki context unless a log entry or explicit user approval confirms promotion. Do not use `_legacy/` as project evidence.

For each relevant source, capture path or URL, title or short label, observed date when available, author or origin when available, language, source type, key facts, and limitations. Paraphrase unless a short verbatim excerpt is necessary.

### 3. Preserve Or Capture Raw Sources

**Check:** Is the raw evidence already stored without alteration?

If the source already exists in `project/sources/`, leave it untouched and cite it. If the user provides a new file, URL capture, or note that is not yet stored, save it under a clear append-only path such as:

```text
project/sources/manual/<slug>.md
project/sources/serp/<keyword-slug>/<timestamp>.json
project/sources/crawl/<site-slug>/<timestamp>.json
```

When capturing a user-provided note, preserve spelling, accents, names, titles, claims, and excerpts. For pt-BR, do not convert `análise`, `conteúdo`, or `aprovação` to ASCII. Use ASCII only for slugs, file names, IDs, enum values, code identifiers, command names, or source text that was originally ASCII.

### 4. Update The Source Catalog

**Check:** Does `project/wiki/fontes/index.md` make the raw evidence discoverable without copying it into the wiki?

Add or update a catalog entry for each newly relevant raw source. The catalog points to raw evidence with normal Markdown links, not Obsidian wikilinks, because raw sources are outside the wiki vault.

Preferred entry shape:

```markdown
## <Source Label>

- `source_id`: `<stable-id>`
- `type`: `<source-type>`
- `language`: `<language>`
- `captured_at`: `<YYYY-MM-DD or unknown>`
- `path`: [<path label>](../../sources/<path-from-sources-root>)
- `status`: raw | reviewed | superseded
- `used_by`: [[Real Wiki Page]] or `none yet`
- `notes`: <limitations, gaps, or contradictions>
```

Only use `[[Real Wiki Page]]` when that page exists or is being created in the same wiki update. For source files, use `[label](../../sources/...)` or another correct relative Markdown link.

### 5. Decide What Can Enter The Wiki

**Check:** Is each wiki claim approved, measured, or safely observational?

Allowed wiki content includes approved strategic facts and decisions, measured or directly observed operational facts, source catalog entries, citations to raw evidence, user-directed drafts or hypotheses that are visibly labeled, contradiction and gap notes that do not present hypotheses as truth, and links between real wiki pages.

Blocked from wiki unless explicitly requested and clearly labeled: unapproved positioning, voice, technology strategy, E-E-A-T claims, hypotheses about what the brand should say or do, content drafts, unpublished public content, unsupported claims of expertise or proof, and "agent believes" synthesis. Always blocked: presenting any of those as approved context without explicit approval.

If a source contains a claim that cannot be promoted, record it as a gap or contradiction in `project/workbench/wiki-maintainer/` and, when useful, add a neutral catalog note such as "source claims public proof exists; no corroborating wiki evidence found." If the user asks you to write that claim into the Wiki, mark it as user-provided or unverified; do not turn it into accepted wiki language.

### 6. Write Citations And Links Correctly

**Check:** Can a future agent trace every important claim back to evidence?

Cite raw sources near the claim they support. Use normal Markdown links for raw files:

```markdown
The interview says the founder wants SEO Brain positioned around agentic SEO, but it does not provide public proof for awards or clients. [source](../sources/manual/founder-interview.md)
```

Use Obsidian wikilinks only for pages inside `project/wiki/`:

```markdown
See [[eeat]] and [[tom-de-voz/index]] for approved project context.
```

Do not use wikilinks for `../sources/...`, external URLs, drafts, workbench files, or pages that do not exist. If a wiki page does not exist, create it only when the content is allowed by this skill; otherwise use plain text.

### 7. Track Contradictions, Gaps, And Staleness

**Check:** Did the update make uncertainty visible instead of hiding it?

Record a contradiction when two sources or pages disagree. Record a gap when a claim lacks evidence or approval. Record staleness when the cited source may no longer describe current reality.

Use concise notes with `claim`, `evidence_for`, `evidence_against`, `missing_evidence`, `affected_pages`, `recommended_next_step`, and `wiki_action`: `none`, `catalog_only`, `operational_update`, or `approval_required`.

Keep unresolved contradiction and gap notes in `project/workbench/wiki-maintainer/` unless they are short operational notes appropriate for `wiki/fontes/index.md`.

### 8. Append The Log

**Check:** Did a durable event happen that future agents or humans need to see?

Append important events to `project/wiki/log/index.md`. Use `type: strategic-approval` only when the user explicitly approved strategic context. Use `type: operational-decision` for source ingestion, cataloging, lint results, rejected promotions, approval-required blocks, and maintenance changes.

Preferred log shape:

```markdown
## <YYYY-MM-DD> - <Short Event>

- `type`: `operational-decision`
- `actor`: `agent` or `<human name if known>`
- `scope`: `<pages or sources affected>`
- `decision`: `<what changed or what was blocked>`
- `evidence`: `<source links or wiki links>`
- `approval`: `not required | required | approved | rejected`
- `notes`: `<gaps, contradictions, or bypasses>`
```

If logging an approval, include who approved, what exact page or claim was approved, the date, and disclosed missing analysis or sources. Do not let a vague "looks good" approve undisclosed strategic changes.

### 9. Review Before Done

**Check:** Are changed pages consistent with the wiki rules?

Before declaring completion, review every modified wiki page and workbench note for citations, immutable raw sources, no drafts or hypotheses in `project/wiki/`, strategic changes either approved or kept out of wiki, updated source catalog and log where needed, real-page-only Obsidian wikilinks, resolving source Markdown links, preserved pt-BR accents, and surfaced contradictions, gaps, or stale claims.

If a check fails, fix it or mark the task `blocked` with a clear reason.

## Output Format

For normal execution, provide a concise completion note and write a machine-readable maintenance summary under `project/workbench/wiki-maintainer/<slug>.yaml` when the task involves reconciliation, blocking, or more than one changed file.

```yaml
status: complete | blocked | approval_required
request_type: source_ingestion | wiki_update | reconciliation | lint | approval_log
changed_files:
  wiki: []
  sources: []
  workbench: []
source_catalog:
  updated: true
  entries: []
approval:
  required: false
  approved: false
  approved_by: null
  strategic_pages_affected: []
citations:
  added: []
  gaps: []
contradictions:
  - claim: ""
    evidence_for: []
    evidence_against: []
    missing_evidence: []
    wiki_action: none
log:
  updated: true
  type: operational-decision
next_action: ""
```

If the task is blocked by missing strategic approval and there is no explicit user-directed write request, use `status: approval_required`, write the proposal outside the wiki, update the log with `type: operational-decision`, and explain the exact claim that cannot be promoted. If the user did request the write, use `status: complete` or `incomplete`, label the Wiki content as unapproved, and name the remaining approval step.

## Examples

### Example: Source Ingestion With E-E-A-T Gap

Input: "Ingest `project/sources/manual/founder-interview.md`. It says Diego should be positioned as a recognized SEO Brain expert, but `wiki/eeat.md` has no public proof for awards or clients."

Output: "Leave the raw source unchanged, add it to `wiki/fontes/index.md`, create a workbench gap note for the unsupported awards or clients proof, do not add the expert positioning to `wiki/eeat.md` without explicit approval, and append a `type: operational-decision` log entry."

### Example: Approved Strategic Update

Input: "I approve adding this voice principle to `wiki/tom-de-voz/index.md`: write clear pt-BR with accents and avoid inflated claims."

Output: "Update the strategic page with the approved wording, cite the source or approval log, preserve pt-BR accents, and append a `type: strategic-approval` log entry naming the approved claim."

### Example: Weak Execution

Input: "The interview says the founder is recognized, so update the wiki."

Output: "Rewrite `wiki/eeat.md` to say the founder is recognized and award-winning, with no citations or approval." This is weak because it fabricates proof, promotes strategic E-E-A-T context without approval, and hides missing evidence.

## Done Criteria

- Raw sources are unchanged unless newly captured exactly or appended safely.
- `project/wiki/fontes/index.md` catalogs newly relevant sources.
- Changed wiki pages cite sources or mark gaps.
- Strategic pages contain approved strategic context or clearly labeled user-directed drafts/proposals/hypotheses; only explicitly approved content can be treated as operating context.
- Contradictions, gaps, stale claims, and missing citations are recorded.
- Obsidian wikilinks are used only for real wiki pages; source links use normal Markdown.
- Important events are appended to `project/wiki/log/index.md` with the correct `type`.
- Human-facing prose preserves the requested language and diacritics, especially pt-BR accents.
