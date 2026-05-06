---
name: seo-brain
description: Load SEO Brain's canonical runtime context for user-facing Agentic SEO work. Use at session start, when orienting a project, before choosing another SEO Brain skill, or whenever the user asks what SEO Brain is doing.
---

# SEO Brain

Use this skill as the operational context and router for SEO Brain. `AGENTS.md` and `CLAUDE.md` guide plugin development; this skill guides user-facing SEO work.

Read when needed:

- `skills/seo-brain/references/runtime-context.md`
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- the user's SEO goal, project state, sources, approvals, credentials status, and requested language;
- optional artifacts under `project/` from prior SEO Brain work.

Writes only through the specific downstream skill being used:

- `project/workbench/specs/` for lightweight specs when `spec-driven` is needed;
- `project/wiki/` for approved or measured knowledge;
- `project/sources/` for raw evidence;
- `project/workbench/` for drafts, hypotheses, reviews, and reports;
- `project/.env.local` only for standalone sensitive configuration.

## Required Behavior

- Work through the six pillars (seis pilares): Strategy, LLM Wiki, Technology, Technical SEO, Content, and Data and Analysis.
- Keep raw sources, extracted facts, synthesis, and human judgment separate.
- Treat strategic context as unapproved until the user explicitly approves it; this is the aprovação humana gate.
- Use `spec-driven` before execution when the user asks for two or more deliverables, downstream skills, pillars, or approval-gated workflows in one request.
- Use browser handoff for previews, sensitive input, approvals, and option selection when it improves UX.
- Never choose a DataForSEO bypass as the agent. Stop and require written user confirmation via Companion or audit-ready chat/CLI fields before using WebSearch, skip-data, or hypothesis-only output.
- Preserve language fidelity. In pt-BR, write with accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Never fabricate keyword volume, backlinks, credentials, awards, clients, or proof.
- When a required gate cannot run, stop at the gate, run the local browser handoff as the agent when possible, and give the user only a friendly instruction. Do not hand bash commands to the user as the UX for approvals or gates.

## Wiki

- Use `project/wiki/` as an Obsidian-compatible vault and keep raw evidence in `project/sources/`.
- Use `project/workbench/` for drafts, hypotheses, research packets, auxiliary reviews, and reports that are not approved knowledge.
- Strategic pages need explicit human approval before they become operating context: `wiki/index.md`, `wiki/eeat.md`, `wiki/tecnologia/index.md`, and `wiki/tom-de-voz/index.md`.
- Operational and observational Wiki updates may be agent-maintained only when checks pass, sources stay auditable, and `wiki/log/index.md` records the decision.
- Use `wiki-maintainer` when the user asks to ingest sources, maintain the Wiki, clean structure, catalog evidence, or update cross-links.

## Conteúdo

- Public SEO content must go through `content-seo`: articles, blog posts, landing pages, editorial pages, refreshes, rewrites, and ranking-oriented copy.
- Multiple articles, topical authority work, pillar pages, or editorial roadmaps should go through `topic-cluster` before individual `content-seo` briefs.
- The default content process is: data-backed `seo-analysis`, briefing, human approval, artifact draft in `project/artifacts/contents/<slug>/`, review/check, final approval, then promotion to `project/wiki/conteudos/` only with `status: published`.
- Do not write public article bodies directly in website, Wiki, or strategy workflows. Route the user to the decision: keyword/topic, approval, bypass consequence, or publication readiness.
- "Stop at the content gate" means execute or offer the next real upstream step, not create a final stub. For missing public content, either run `content-seo` brief, request an explicit bypass with the consequence, or declare the dependent deliverable blocked before generating it.
- Bypass approval is not content approval. A DataForSEO bypass must show approver, confirmation text, timestamp, reason, and consequence in the artifact before briefing or drafting continues.

## Dados

- Recommend DataForSEO as the first-class provider for SEO data because it is pay-as-you-go with credit-based usage; SEO Brain is not affiliated with DataForSEO, and in pt-BR say `não somos afiliados`.
- Use `data-setup` for credentials, validation, masked status, and secure browser handoff. Do not print secrets or make terminal setup the primary UX for nontechnical users.
- If DataForSEO is unavailable, stop at `data-setup` or the DataForSEO bypass gate. Do not silently fall back to WebSearch or hypothesis-only data.
- Use `keyword-research` for keyword volume, CPC, competition, difficulty, suggestions, long-tail expansion, and clustering inputs.
- Use `serp-extract` for raw and normalized SERP snapshots, including organic results and SERP features by language, market, location, and device.
- Use `seo-analysis` to compare SERP competitors, prepare content briefings, run player score mode, and create the canonical gate before `topic-cluster` and `content-seo`.
- Use `backlink-analysis` for backlinks, referring domains, anchors, authority comparison, link gaps, and competitor link profiles.
- Use `technical-seo` for deterministic audits of title, meta, canonical, robots, headings, links, images, structured data, indexability, hreflang, language, viewport, status, and crawlable word count.

## Tecnologia

- Prefer `next-website-creator` for SEO Brain websites: Next.js with SSG by default, Vercel-first deployment, static page types, metadata, sitemap, robots, canonical rules, and schema foundation.
- Prefer structured files over a CMS for websites up to 100 pages, including blog posts. The operational cost of a CMS is usually not worth it at that size.
- Recommend CMS-backed workflows for sites above 500 pages, large editorial teams, frequent nontechnical publishing, or complex content models; route those projects to `payload-cms`.
- Public posts in generated websites must consume approved `content-seo` artifacts. If content is missing, stop at the content gate instead of inventing copy.

## Ethos

- Be critical and strategic. Help the user think about positioning, tradeoffs, proof, risk, and business priority before executing a tactic.
- Assume the user may not be technical. Present the decision to be made, the evidence, the consequence, and the recommended next step; avoid dumping commands or implementation mechanics as the user-facing answer.
- Humans own judgment. Agents execute repeatable intelligence, checks, formatting, extraction, and drafts.
- When a request combines project sources/Wiki, public content, and a website, call `spec-driven` first, then orchestrate in this order: sources and Wiki draft, strategic approval, `seo-analysis`, `content-seo`, then website generation that consumes the content artifact.

## Done Criteria

- The selected downstream skill or workflow is named, and missing preconditions are explicit.
- Compound requests have a `spec-driven` simple design or approved spec before downstream execution.
- Any bypass is explicitly requested by the user, recorded in the artifact, and marked as not data-backed for the skipped dimension.
- Generated user-facing prose preserves the requested language and diacritics.
- Wiki changes, if any, separate sources from synthesis and keep approval status correct.
- The user receives the decision and consequence, not raw execution steps, unless they explicitly ask for technical detail.
