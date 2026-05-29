# Web Companion

The Web Companion is the primary delivery surface of Agentic SEO. Chat is for conversation; the Companion is where deliverables live and where you make decisions.

## Why the Companion exists

Chat is good for short replies. It is bad for reading a five-page report, scanning a table of fifty content pieces, comparing two competitors, or approving a sensitive piece of strategy. The Companion gives the agent a real interface — a sidebar, page rendering, editable Markdown, structured tables and charts, decision forms with one-time tokens.

A useful rule of thumb:

- **Substantive artifact?** Read it in the Companion.
- **Quick clarification, status check, or blocked route?** Stay in chat.

The agent enforces this. Whenever it produces a substantive artifact — report, brief, draft, audit, spec, brain change, import summary, content piece, cluster, project initialisation — it ends its reply with one canonical line:

- For reports: **"Posso abrir o Web Companion para você ver a análise?"**
- For non-report deliverables: **"Posso abrir o Web Companion para você revisar esta entrega?"**

Answer yes and the agent opens the Companion bound to a local-only address with a one-time token. Answer no and the artifact stays in the project folder for you to open later.

## Sidebar tour

The Companion sidebar mirrors the runtime `project/` folder.

- **Brain** — `project/brain/`. The authorial knowledge layer: `index`, `identity`, `voice`, `technology`, `topic-clusters` (with one subpage per active cluster), `review`, and the append-only `log`. New top-level brain pages such as `products` or `partnerships` show up here automatically.
- **Topic Clusters** — `project/brain/topic-clusters/`. One subpage per active cluster. Each one carries authorial prose plus a materialised table of every content piece that declares the cluster.
- **Contents** — `project/contents/`. A single table that lists every published piece across origins (`blog`, `linkedin`, `podcast`, `other`) with multi-select filters by cluster, origin, status, and free-text search. Click a row to open the individual content page.
- **Workbench** — `project/workbench/`. Drafts and working analysis, inline (no expandable subpages in the sidebar).
- **Analyses** — `project/analyses/<module>/<run-slug>/report.md`. Editable, human-first report pages produced by the data and report skills.

Reports follow the shared `page-report` contract: executive reading at the top, depth in human-readable appendices, raw evidence kept separate in `source_artifact` plus `sources/`, `audits/`, or `workbench/`. Visual modules use structured fences — `agentic-kpis`, `agentic-chart`, `agentic-table` — with YAML `version: 1` payloads.

## Editing in the Companion

Most pages are editable in place. The Companion uses optimistic locking and a content hash check, so concurrent edits in Obsidian, the Companion, or by the agent are caught with a 409 conflict and a reload instead of silent overwrites.

When you save an edit to an authorial brain page or a report, the Companion appends a `type: decision` entry to `project/brain/log.md` with the file, your name, and the time. The log itself is read-only in the Companion — append-only by design.

Bulk delete from the content tables moves files into `project/Trash/` with `trashed_from` and `trashed_at` markers, not a hard unlink. Restore them with `node scripts/restore-from-trash.mjs <slug>` or by moving the file back manually.

## Decision and sensitive-input handoffs

Some flows need more than reading. They need a decision, a credential, a multi-step approval. For those, the agent launches a specific Companion handoff:

- `approve-page` — review a draft of an authorial brain change before it lands.
- `approve-briefing` — accept or reject a content brief before drafting.
- `approve-cluster` — promote a draft cluster (`draft.yaml`) into an active one (`cluster.yaml` + new brain subpage). The only way a new cluster enters the brain.
- `pick-cluster` — choose the cluster to assign a piece of content to.
- `review-changes` — inspect proposed changes before they hit the brain.
- `dataforseo-bypass` — confirm bypassing the DataForSEO gate and accept the consequence in writing.
- `collect-env` — set up secrets or environment variables without exposing them in the terminal. Superseded by the Companion credentials surface (Settings → Credenciais); see "Migration status" below.

Each handoff binds to `127.0.0.1` on an ephemeral port, requires the one-time token, validates `Origin`/`Host`, and shuts down on submit, cancel, or TTL expiry. Sensitive values never echo to agent stdout, never appear in full in logs, and never land in the repo root `.env`. Credentials are stored in the user home file `~/.agentic-seo/credentials.json` with owner-only permissions (`chmod 0600`) — read and written by both the Companion and the CLI.

### Migration status

The legacy `127.0.0.1` HTTP handoffs (`node scripts/companion.mjs <name>`) are migrating into the Web Companion's own surfaces:

- **Moving to the Companion now:** `collect-env` is superseded by the Web Companion credentials surface (Settings → Credenciais); `approve-cluster` (cluster promotion) and `dataforseo-bypass` also move to dedicated Companion screens.
- **Behind a flag, with a documented plan:** `approve-briefing`, `approve-page`, `review-changes`, and `pick-cluster` remain available as legacy HTTP handoffs behind a flag until their Companion equivalents ship.

The handoff code is not deleted — other flows still reference it — only deprecated and documented. Deprecation headers live in `scripts/companion.mjs`, `scripts/lib/companion-server.mjs`, and `scripts/lib/companion-types/collect-env.mjs`.

Every handoff submission also appends an entry to `project/brain/log.md` with the appropriate `type:` (`approval`, `decision`, `ingestion`, `publication`, `evidence`).

## What the Companion does not do

- It does not replace the agent in chat. If you need to converse, clarify, or steer, do it in chat.
- It does not let you create or delete report pages in v1 — those come from a skill run.
- It does not show secrets, raw credentials, or provider keys.
- It does not write changes that bypass the log. Every substantive edit becomes a log entry.

## When the Companion cannot run

The agent never falls back to handing you raw shell commands as the primary UX. If the Companion cannot start, the agent presents a friendly instruction and the exact decision needed, and continues to record everything in the log. You can always inspect the artifact directly: open the file in your editor at the path the agent named.

## Language

The Companion follows `project/.agentic-seo/project.json.language`. v1 ships complete UI and report copy for `pt-BR` and `en`. The agent preserves accents and diacritics in all human-facing prose: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`. ASCII transliteration is only used in slugs, paths, IDs, and code identifiers.

Switch languages from the Companion settings panel or via `PATCH /api/project/settings`. The Topic Clusters materialised tables regenerate in the new language on the next `cluster-sync`.
