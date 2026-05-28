# Getting Started

A five-minute path from a clean install to your first artifact open in the Web Companion.

## 1. Install the plugin

You need Claude Code running on your machine. From a terminal where the `claude` command is available:

```bash
claude plugin marketplace add agencia-conversion/agentic-seo-skills
claude plugin install agentic-seo@agentic-seo-skills-marketplace
```

Then restart Claude Code or run `/reload-plugins` inside an active session.

## 2. Start a session

Open Claude Code in any folder you want to use as your working project. Then ask:

```text
/agentic-seo:start
```

You will get a short orientation: what Agentic SEO is, what kinds of requests work well, and what the runtime expects. The session is bilingual — you can write in English or Brazilian Portuguese. The agent will answer in the language you used.

## 3. Initialize a project

Tell the agent what your project is about. For example:

> Initialize a project for the Acme Co. blog. We want to cover marketing automation for B2B SaaS.

The agent routes to `project-init`, which creates the runtime structure inside `project/`:

- `project/brain/` — the only authorial knowledge layer, with `index`, `identity`, `voice`, `technology`, `topic-clusters`, `review`, and `log` pages.
- `project/sources/` — raw evidence, immutable once captured.
- `project/clusters/` — Topic Cluster manifests (`cluster.yaml`) and planning notes.
- `project/contents/` — public content in flat files (`blog/<slug>.md`, `linkedin/<slug>.md`, etc.).
- `project/workbench/` — drafts and working analysis.
- `project/artifacts/` — complete non-report deliverables (briefs, drafts, specs, checks).
- `project/analyses/` — Web Companion report pages, one per run.

Read [`brain.md`](brain.md) for the full layout and writing rules. Read [`architecture.md`](architecture.md) for what each top-level folder owns.

## 4. Run a workflow

Now you can ask for any of the skill workflows:

- "Analyse the keyword `marketing automation` for the US market."
- "Plan a content cluster around `agentic marketing`."
- "Audit the technical SEO of `https://example.com`."
- "Write a brief and a draft for the article `What is agentic SEO`."

The agent picks the right downstream skill, runs the work, and lands the result in the right folder under `project/`.

## 5. Open the Web Companion

For any substantive deliverable — a report, brief, draft, audit, brain change, cluster, content piece — the agent ends its reply with one canonical question:

- For reports: **"Posso abrir o Web Companion para você ver a análise?"**
- For non-report deliverables: **"Posso abrir o Web Companion para você revisar esta entrega?"**

Answer "yes" and the agent opens a local browser window bound to `127.0.0.1` with a one-time token. The Companion is where you read, edit, and approve artifacts. See [`web-companion.md`](web-companion.md) for a full tour.

The terminal/chat surface is for short conversation: clarifications, status, blocked routes. Heavy reading belongs in the Companion.

## What to do next

- Save credentials for the DataForSEO provider before asking for keyword volume or SERP data. The agent will offer a secure browser handoff (`data-setup`) the first time it needs them.
- If you are starting fresh, fill in `project/brain/identity.md` and `project/brain/voice.md` early — every content workflow uses them as the strategic baseline.
- For deeper editing of the brain in your favourite tool, open `project/brain/` as an [Obsidian vault](obsidian-vault.md). Wikilinks already work.

If something is missing, the agent stops at the gate and tells you what is blocked, why, and what the next step is. It will not silently use guessed data.
