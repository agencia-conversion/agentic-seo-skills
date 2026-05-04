# SEO Brain Operating Model

Use this reference when a skill needs shared SEO Brain rules.

## Intelligence vs Judgment

- Intelligence: repeatable work with clear procedures, data extraction, deterministic checks, formatting, and routine updates.
- Judgment: strategic positioning, business priority, brand claims, editorial taste, risk, and final approval.

Agents may draft judgment-heavy artifacts, but they must request explicit approval before treating them as approved context.

## Project Paths

Runtime projects use:

```text
projects/[project-slug]/
  wiki/
  web/
  sources/
  reports/
  artifacts/
  .seo-brain/
```

Open `projects/[project-slug]/wiki/` as the Obsidian vault. Keep raw files outside the vault in `sources/`; catalog them from `wiki/fontes/index.md` using Markdown links to `../sources/...`.

Initial Wiki maps use the six SEO Brain pillars:

```text
wiki/
  index.md
  schema.md
  eeat.md
  estrategia/index.md
  llm-wiki/index.md
  tecnologia/index.md
  seo-tecnico/index.md
  tom-de-voz/index.md
  conteudos/index.md
  conteudos/topic-clusters.md
  dados-e-analise/index.md
  fontes/index.md
  log/index.md
```

## Wiki Status

Use frontmatter:

```yaml
status: draft
owner: human
judgment_level: strategic
approved_by: null
approved_at: null
sources: []
```

Allowed status values:

- `draft`
- `approved`
- `needs-review`
- `archived`

Allowed `judgment_level` values:

- `strategic`
- `editorial`
- `operational`
- `observational`

## Required Log Format

Append important events to `wiki/log/index.md`:

```md
## [YYYY-MM-DD] event-type | Short title

- Actor: agent|human
- Files: [[path]]
- Summary: what changed
- Approval: not-required|pending|approved|rejected
```

## Anti-Slop Rules for Brazilian Portuguese

- Use Brazilian Portuguese unless the project explicitly says otherwise.
- Do not use American title case. Capitalize only the first word and proper nouns.
- Avoid excessive bullets.
- Avoid a rhythm of many one-line paragraphs.
- Avoid literal translations of English metaphors.
- Avoid generic AI filler and unsupported superlatives.

## Ordem do Golden Path

The default sequence for a new SEO Brain project:

1. `project-init`: create the project folder and initial Wiki.
2. Strategic approval: humans approve `wiki/index.md`, `wiki/eeat.md`, `wiki/tecnologia/index.md`, `wiki/tom-de-voz/index.md`.
3. `data-setup`: confirm provider status. DataForSEO is the default when configured; otherwise the system uses websearch.
4. `seo-analysis`: produce `reports/seo-analysis/<keyword-slug>.json` for any topic that will receive content. This is the canonical gate for steps 5 and 6.
5. `topic-cluster`: requires the seo-analysis report unless `--hypothesis-only` is passed.
6. `content-seo`: requires the seo-analysis report unless `--skip-data --skip-data-reason "<motivo>"` is passed.

`keyword-research` and `serp-extract` remain available as standalone skills for raw data and to enrich `seo-analysis`. They are recommended steps inside the DataForSEO path, but they are not gates by themselves.

## Provider Selection for SEO Data

`seo-analysis` accepts `--provider {dataforseo, websearch, auto}`. Default is `auto`:

- `auto`: pick `dataforseo` when `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` are set; otherwise pick `websearch`.
- `dataforseo`: force DataForSEO; fail clearly when credentials are absent.
- `websearch`: force the websearch fallback. The agent must collect SERP results via the model's WebSearch tool and write them to `sources/websearch/<slug>.json` before running the CLI.

Reports always carry `provider`, `provider_reason`, `keyword_metrics` (object or `null`), and `incomplete` so the consumer can audit what was used.

## Registro de Publicação

Content destined for a public site is written as a blog article, not as a Wiki page. The rules below apply to any artifact in `wiki/conteudos/` that targets publication. The Wiki itself can use Obsidian wikilinks freely.

Five generic rules:

- Do not expose internal URL paths or slugs in prose. Reference other articles by their working title in natural anchor text.
- Anchor text must be informative on its own. Avoid "clique aqui", "saiba mais", "aqui", "link", and "no blog da X".
- Every sentence containing a link must remain coherent if the link is removed. This is the link-removed test.
- Do not mention in prose any domain that appears in the `top_results` of the `seo-analysis` report for the article's primary keyword. The SERP is input for understanding intent and gaps; it is never output. This rule is enforced dynamically against the analysis report, not against a hardcoded list.
- Cite external sources via Markdown backlinks with anchor text that describes the idea or the work, never the domain. The choice of when to cite is editorial; the form is fixed.
