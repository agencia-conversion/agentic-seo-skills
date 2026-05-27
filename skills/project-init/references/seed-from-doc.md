# Project Init — Seed-From-Doc Workflow

## When To Use

Use this workflow when the user provides a strategic document (one or more `.md` files, a Google Doc paste, a brand brief) and asks to seed the brain from that source instead of starting with blank templates. Typical signals: "use this doc as the basis for the brain", "based on this PRD, fill identidade and editorial", "import this brief into the project".

Do not use this workflow to:
- Generate strategic content the source does not support (no fabrication of brand identity, market positioning, métricas, evidence).
- Replace the user's own decisions about positioning, voice, or pillars — the source document is the canonical authority for this run.
- Skip the canonical phases of `project-init`. Seed-from-doc runs AFTER the standard directory scaffold and blank templates exist.

## Prerequisites

1. `project-init` was already executed and the 8 canonical brain pages exist as templates (or filled from a previous seed).
2. The strategic document is accessible at a local path or pasted into the conversation.
3. The user has explicitly granted authorship of changes (the seed creates substantive brain content; record `aprovador: <human-name>` in the log).

## Framework

### 1. Read and classify

Read the source document end-to-end. Classify each substantive chunk by the brain page where it belongs:

| Chunk type | Target brain page | Notes |
|---|---|---|
| Brand identity, aposto, parágrafo de apresentação, frase-marca, promessa, anti-posicionamento, público | `brain/identidade.md` | Filter marketing adjectives; preserve verifiable claims with evidence links. |
| Voice/tone principles, registro, vocabulary preferences, errata policy | `brain/voz.md` | Specific to this project; do not duplicate the universal rules in `brain/revisao.md`. |
| Stack observed, technical decisions, SEO technical map | `brain/tecnologia.md` | Only observable facts; no editorial opinion on stack. |
| Editorial areas (pillars), thesis per area, sub-themes, target audience | `brain/topic-clusters.md` (H2 sections above the cluster-index auto-block) | One `##` section per pillar with slug, tese, diferenciação, audiência. |
| Products, services, tools, courses listed publicly | `brain/produtos.md` (extensible) | Create with `aprovador: <human>` log entry per extensible-brain contract. |
| Conceptual frameworks (e.g., 4 levels of AI adoption) | Best-fit pillar H2 in `brain/topic-clusters.md` as subsection | Or split into its own brain subpage `brain/<parent>/<concept>.md`. |
| Proof points (clients, awards, métricas, citations) | `brain/log.md` as `tipo: prova` entries | The pages reference the proof; the proof body lives in the log. |
| Pending research, gaps, "to confirm" notes | `brain/log.md` as `tipo: ingestao` or `tipo: lint` | Never leave `gap`, `<preencher>`, `TODO` in brain pages. |

### 2. Detect cluster seeds

If the document lists subtopics under pillars (e.g., "Estratégia → Brand-Led Growth, Autoatribuição, Posicionamento"), propose 1 cluster draft per subtopic with `status: hypothesis` and an explicit `bypass` record. Cluster drafts go to `project/clusters/<slug>/draft.yaml` + `planejamento.md`. Promotion to `cluster.yaml` requires DataForSEO evidence (separate skill: `topic-cluster`).

### 3. Compose the brain pages

For each target page:

1. Read the current state. If the page contains substantive content (not the template placeholders), STOP and ask the user whether to merge, replace, or skip.
2. Compose the new content using the source document as the primary evidence. Add `[Source title](url)` markdown links in the `## Evidência` section at the bottom of each page that cites external claims.
3. Remove all `<!-- REGRA: -->` instructional comments from templates when filling — these are filler guidance, not content.
4. Preserve pt-BR diacritics in every chunk that came from the source. If the source uses ASCII, restore accents during composition.
5. Apply the universal review rules from `brain/revisao.md`: no AI-slop adjectives, no marketing superlatives without proof, no Conversion-explainer voice, lead first sentence.

### 4. Apply via Companion (preferred) or brain-first (fallback)

**Preferred path** — Companion handoff:
Open `node scripts/companion.mjs approve-page --file brain/<page>.md` for each composed page. The handoff shows the diff (template → composed), missing sources, broken wikilinks. The user approves, rejects, or asks for adjustments. On approval, the file is written and a `tipo: decisao` entry is appended to the log with `aprovador: <user>`.

**Fallback path** — brain-first protocol:
If the user explicitly delegates authorship to the agent (e.g., "go ahead and fill it"), the agent writes the pages directly and records each substantive change as a `tipo: decisao` entry in `brain/log.md` with `aprovador: <user>` (the user's name, not `agent`, because the user delegated). This path is allowed by the brain-first protocol in `AGENTS.md` § Brain Rules → Brain-first protocol.

### 5. Register the seed run

Append a single consolidated `tipo: decisao` entry to `brain/log.md` summarizing the seed run:

```markdown
## YYYY-MM-DD - Brain seeded from <source name>

- tipo: decisao
- escopo: brain/identidade.md, brain/topic-clusters.md, brain/voz.md, brain/tecnologia.md, brain/produtos.md (se aplicável)
- decisao: Brain semeado a partir do documento "<source name>". Distribuição: <summary by page>. Cluster drafts criados: <list of slugs>.
- evidencia: <source path/URL>, e cada wikilink correspondente
- aprovador: <user name>
- notas: <pending follow-ups, e.g., "Voz preenchida só nos princípios; vocabulário a evitar fica para a primeira sessão de revisão real.">
```

## Anti-Patterns

- **Do not auto-promote cluster drafts.** Seed-from-doc only creates hypothesis-only drafts; promotion requires DataForSEO evidence via `topic-cluster` skill + `approve-cluster` handoff.
- **Do not invent métricas.** If the source says "Conversion Academy grew 290%", quote it with attribution. If the source has a placeholder like "[encontrar dado]", register the pending data point in `log.md` as `tipo: ingestao` instead of writing a number.
- **Do not write Conversion-explainer prose.** Phrases like "neste artigo", "vamos entender", "como você pode ver" violate the universal review rule even in brain pages.
- **Do not fabricate proof.** If the source mentions a client or award without details, leave it as a pending entry; never expand into fictional context.
- **Do not skip the log.** Every substantive brain change from the seed needs a log entry, even when applied via Companion (the handoff appends automatically).

## Verification

After the seed run:

1. `grep -E "<preencher|TODO|\\[\\?\\]|gap" project/brain/*.md` returns nothing (no-gap policy).
2. Each filled page has a `## Evidência` section with at least one markdown link per claim that was not common knowledge.
3. `brain/log.md` contains the consolidated seed entry plus any `tipo: prova` entries for cited proof.
4. Cluster drafts (if created) have `status: hypothesis` and `provenance.bypass` recorded.
5. Project metadata in `project/.agentic-seo/project.json` reflects the canonical `name`, `market`, `language` from the source.

## Limits of This Workflow

This workflow does not run an LLM to generate brain content — the agent reading the skill (Claude Code or equivalent) is responsible for composing prose under the rubric in section 3. The workflow encodes the distribution rules, the protocol gates, and the verification criteria; the editorial intelligence is the agent's.
