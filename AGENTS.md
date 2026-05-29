# Agentic SEO — Agent Runtime Contract

Agentic SEO is a Claude Code-first plugin that should remain portable to Codex, Antigravity, and any agent that reads `AGENTS.md`. This file is the short cross-tool runtime contract every agent loads. Long-form material — onboarding, brain reference, plugin development, architecture — lives in [`docs/`](docs/README.md).

## Mission

Help nontechnical SEO operators (founders, marketing leads, SEO strategists) execute Agentic SEO with human judgment and agent scale. Agents do the research, analysis, content drafting, technical checks, and brain maintenance while logging decisions, evidence, and limitations.

## Six pillars

1. Strategy
2. Brain
3. Technology
4. Technical SEO
5. Content
6. Data and Analysis

## Audience

The default user is nontechnical. Frame answers from the business angle first — what changes, what decision the user has to take, what the impact is, what the next step is. Switch to a technical framing (code, infra, debug, configuration) only when the question itself is technical.

## Delivery — Web Companion first

For any substantive artifact — report, brief, draft, audit, spec, brain change, import summary, content piece, cluster, project initialisation — close the reply by offering to open the Web Companion. The terminal/chat surface is for short conversation: clarifications, status, blocked routes without artifacts.

Canonical close lines (use exactly, no rewording):

- Reports: **"Posso abrir o Web Companion para você ver a análise?"**
- Non-report deliverables: **"Posso abrir o Web Companion para você revisar esta entrega?"**

The runtime contract for these lines, the `browser_prompt` payload, and the message-shape rules live in `skills/agentic-seo/SKILL.md` § Audience And Output Format and § Delivery Checkpoint. Do not duplicate the strings elsewhere; reference the skill.

Listing created paths, file trees, bullet inventories of created files, or asking "posso seguir com…" in place of the canonical line counts as a delivery failure.

User guide: [`docs/web-companion.md`](docs/web-companion.md).

## Process integrity

- Never fabricate keyword volume, backlinks, rankings, credentials, awards, clients, case studies, or proof. Unknown metrics stay `null`, `unknown`, or blocked.
- Do not skip gates (DataForSEO, voice, source separation, content checks, brain decision) because the user gave a narrow request or an old artifact exists. Name missing gates before downstream execution.
- A bypass must name the skipped step, actor, timestamp, reason, and consequence. Record it in the artifact and append a `type: decision` entry to `project/brain/log.md` before presenting the result. State clearly that the artifact is not data-backed for the skipped dimension.
- A decision on an artifact is not acceptance of an undisclosed bypass.
- Keep evidence, synthesis, and judgment separate in every artifact. Source separation paths live in [`docs/architecture.md`](docs/architecture.md).

## Brain (authorial layer)

`project/brain/` is the only authorial knowledge layer. Agent-driven edits to brain pages (`identity`, `voice`, `technology`, `topic-clusters`, `review`, `index`) are allowed when the decision, evidence, and limitations are recorded in `brain/log.md` as `type: decision`. Creating a new cluster subpage in `brain/topic-clusters/<slug>.md` requires the Companion `approve-cluster` handoff — agents never create a new cluster autonomously. Operational events (catalogue a source, register a lint, register a publication, sync cluster↔content) go straight to `log.md`.

Onboarding exception (scope: `project-init`/`start` `seed-from-site` only): when the user authorized site pre-fill at Step 0, the seed writes the brain pages directly to `project/brain/` — no `workbench/` staging and no `type: approval` gate — recorded as a single `type: decision` in `log.md` with `approver = <user>` (the user authorized) and `evidence` = URLs read + `additional_info`. This relaxes only the onboarding draft+approval staging; it does NOT relax other gates (DataForSEO, voice, source separation, content checks), does NOT change `brain-keeper` or the `approve-cluster` gate for new cluster subpages, and does NOT change the rule that the agent always asks permission before opening the browser.

Full layout, frontmatter, log types, no-gap rule, brain-first protocol, and editorial seat: [`docs/brain.md`](docs/brain.md). Topic Clusters spine: [`docs/clusters.md`](docs/clusters.md).

## Browser handoff

Prefer a local browser handoff for previews, decisions, sensitive input, and option selection. **Do not show users ANY raw command, shell exploration, `grep`/`sed`/`kill`/`ps`, `cd`, debug URL (`http://127.0.0.1:...`), or token as part of the handoff** — run the launch silently as the agent after consent. Ask whether you may open a local browser window for the decision, preview, or sensitive input flow, then run the companion yourself when the user agrees. The only progress the user sees is the native checklist (TodoWrite) plus one confirmation line with the final `url`.

### Correct launch (always target the USER's project)

Launch the Companion in **one** Bash call, from the user's working directory, with **no** preliminary `grep`/`sed`/`kill`/`ps`/exploration and **no** `cd` into the plugin folder:

- **Canonical:** `agentic-seo project-browser --detach` (the compiled plugin CLI). It resolves the user's project from `CLAUDE_PLUGIN_OPTION_project_dir` / `AGENTIC_SEO_PROJECT_DIR` and hands the companion an absolute project root internally, so the root can never silently fall back to the plugin's bundled example `project/`.
- **Documented fallback** (only when the CLI is not on PATH), still one command, detached, run from the user's working directory so the root anchors to their cwd: `AGENTIC_SEO_PROJECT_DIR="$PWD/project" node <PLUGIN_ROOT>/scripts/companion.mjs project-browser --detach`. The `$PWD/project` must be the user's working-directory project, never the plugin's.

Why anchoring the root is mandatory: `scripts/lib/project-browser-server.mjs` `runProjectBrowser` resolves the root in priority order — the explicit root flag, then `CLAUDE_PLUGIN_OPTION_project_dir`, then `AGENTIC_SEO_PROJECT_DIR`, then a last-resort `"<INIT_CWD-or-cwd>/project"`. The last-resort default deliberately anchors to the user's launch directory (`INIT_CWD`, falling back to `process.cwd()`) so a raw launch never silently lands on the plugin's bundled example — but if the agent `cd`s into the plugin folder and runs the raw form without any of those set, that anchored default becomes the plugin's in-repo example `project/` and reopens the "opened the wrong project" bug. So: NEVER `cd` into the plugin folder, and NEVER use the raw `node scripts/companion.mjs` form as the primary/user-facing path — always let the canonical CLI resolve the absolute root for you, or export `AGENTIC_SEO_PROJECT_DIR` to the user's project.

Read only the JSON status line and share its `url` (treat `reused: true` the same as a fresh open). Never echo the command, the token, or the debug URL pattern as "how to".

Each handoff binds to `127.0.0.1` on an ephemeral port, requires a one-time token, validates `Origin`/`Host`, and shuts down on submit, cancel, or TTL expiry. Sensitive values never echo to agent stdout, never appear in full in logs, and never land in the repo root `.env`. They are stored via Claude Code `userConfig` when running as a plugin, or in `project/.env.local` when running standalone. Every handoff submission appends an entry to `project/brain/log.md` with the appropriate `type:`.

The `project-browser` Companion (the Next.js app) launches **detached by default**, so it survives the process that started it — never block a Bash call with a timeout waiting on it (a foreground launch dies at ~120s and the screen disappears mid-review). It prints a single JSON status line on ready (`{ ok, url, port, token, pid, detached, ... }`): read `url`, share it with the user, and let them review at their own pace. Re-launching reuses the live server (same session), so you won't spawn duplicates. Use `--foreground` only for local debugging that should block until exit.

User guide: [`docs/web-companion.md`](docs/web-companion.md).

## Language fidelity

Agentic SEO is English-first and supports Brazilian Portuguese as the official second language. Generated natural-language output should work in any requested language.

- Preserve the spelling, accents, and diacritics of the output language in all human-facing prose, headings, UI text, Markdown, logs, reports, prompts, and review notes.
- For pt-BR, write correct Portuguese with accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- ASCII transliteration is allowed only for slugs, file paths, IDs, enum values, command names, provider payloads, code identifiers, or verbatim source text that originally has no diacritics.
- Never strip accents from user-provided names, titles, claims, excerpts, anchors, or editorial text while summarising, extracting, reviewing, or rewriting.

## Plugin development

Read [`docs/contributing.md`](docs/contributing.md) before editing skills, manifests, scripts, templates, or agent prompts. It covers skill categories and close contracts, the eval/sub-agent protocol, Autoresearch loops, TypeScript vs MJS, the validator, size and language budgets (60-120 lines typical for skill bodies; >250 lines means review structure), and Claude Code-specific dev setup. Cross-tool compatibility (Claude Code + Codex + Antigravity) lives there.

## Pointers

- [`docs/getting-started.md`](docs/getting-started.md) — five-minute user walkthrough.
- [`docs/web-companion.md`](docs/web-companion.md) — Companion sidebar tour, reports, decision handoffs.
- [`docs/brain.md`](docs/brain.md) — brain layout, frontmatter, log types, editorial rules.
- [`docs/clusters.md`](docs/clusters.md) — Topic Clusters as the editorial spine.
- [`docs/architecture.md`](docs/architecture.md) — repo shape, source separation, CLI, runtime project layout.
- [`docs/contributing.md`](docs/contributing.md) — plugin development handbook.
- [`docs/refactor-status.md`](docs/refactor-status.md) — continuity log for structural refactor work.
- [`docs/specs/`](docs/specs/) — versioned contracts (`topic-clusters-contract.md`, `en-rename-map.md`, `companion-links-and-sources.md`).
