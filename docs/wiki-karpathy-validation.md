# Wiki Model Validation Against Karpathy LLM Wiki

Primary reference:

- https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

Related Agentic SEO reference:

- https://agenticseo.sh/blog/o-que-e-seo-agentico

## What Karpathy Proposes

Karpathy's LLM Wiki pattern has three layers:

1. Raw sources: curated, immutable source documents. The LLM reads them but does not modify them.
2. Wiki: generated Markdown pages, summaries, entity pages, concept pages, comparisons, indexes, and synthesis pages. The LLM owns maintenance.
3. Schema: a project instruction document, such as `CLAUDE.md` or `AGENTS.md`, that defines structure, conventions, and workflows.

The key operations are:

- ingest one source or a batch of sources;
- query the Wiki and save useful answers back into the Wiki;
- lint the Wiki for contradictions, stale claims, orphan pages, missing cross-links, and data gaps;
- maintain `index.md` as a content-oriented catalog;
- maintain `log.md` as an append-only chronological record.

Karpathy's model is intentionally abstract and modular: the exact directory structure should be adapted to the domain.

## Compatibility With SEO Brain

SEO Brain is compatible with the LLM Wiki pattern if the project separates three concerns:

1. Immutable sources: original evidence, crawls, SERP snapshots, customer interviews, brand documents, analytics exports, and manually curated references.
2. Generated Wiki: LLM-maintained summaries, concept pages, clusters, technical notes, content briefs, and analysis.
3. Approved operating context: strategic pages that can guide agents only after human approval.

The user's proposed Wiki model correctly emphasizes human judgment, but it needs a status system because Karpathy's original phrasing says the LLM owns the Wiki layer. In SEO Brain, the LLM should own maintenance mechanics, while humans own strategic approval.

## Required Adjustment

Do not make the Wiki a single undifferentiated layer. Use statuses:

- `draft`: generated or changed by the agent, not yet approved.
- `approved`: explicitly approved by the user and safe for future agent decisions.
- `needs-review`: stale, contradicted, or materially changed.
- `archived`: retained for history but no longer active guidance.

Use `judgment_level` to decide approval requirements:

- `strategic`: explicit human approval required.
- `editorial`: agent can draft, human can calibrate.
- `operational`: agent can update if deterministic checks pass.
- `observational`: agent can append factual extracted data.

## Proposed SEO Brain Wiki Layers

```text
project/
  sources/                  # immutable or append-only raw material
    web/
    serp/
    analytics/
    interviews/
    brand/
  wiki/                     # Obsidian-compatible operational knowledge
    index.md
    schema.md
    eeat.md
    estrategia/
    llm-wiki/
    tecnologia/
    seo-tecnico/
    tom-de-voz/
    conteudos/
    dados-e-analise/
    fontes/
    log/
  artifacts/                # generated previews, reports, charts, prototypes
  reports/                  # exported human-readable deliverables
```

`sources/` should be treated as the evidence base. `wiki/` should cite `sources/` with normal Markdown links to `../sources/...`; `wiki/fontes/index.md` is a catalog, not a raw-source folder. `artifacts/` and `reports/` can be regenerated or revised.

## Index and Log Decision

Karpathy recommends `index.md` and `log.md`. The user's structure uses:

- `wiki/index.md`
- `wiki/log/index.md`

This is acceptable for Obsidian and multi-section navigation, but the schema should document that `wiki/log/index.md` is append-only and parseable. Log entries should use stable headings:

```md
## [2026-05-04] ingest | Source title
## [2026-05-04] approval | wiki/eeat.md
## [2026-05-04] lint | wiki
```

## Anti-Slop Guardrail

Karpathy's pattern solves maintenance cost. It does not automatically solve quality, provenance, or strategic correctness. SEO Brain should add:

- source-level citations for factual claims;
- approval gates for strategic pages;
- Wiki lint with contradiction checks;
- regression fixtures for each skill;
- content review against Brazilian Portuguese editorial norms;
- explicit separation between extracted data, LLM synthesis, and human judgment.

## Verdict

The user's Wiki model is directionally correct and stronger than a pure LLM-owned Wiki for SEO strategy. The only required correction is to formalize status, approval, and source provenance so the LLM can maintain the Wiki without silently converting unapproved drafts into operating doctrine.
