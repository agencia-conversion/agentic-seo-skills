# Changelog

## 0.3.0 - 2026-05-26 (in flight)

### Bilingual refactor — EN-first

- Defaults flipped to EN: `shared/locale.mjs` `DEFAULT_LANGUAGE = "en"`, `SUPPORTED_LANGUAGES = ["en", "pt-BR"]`. `getProjectLanguage()` falls back to `en`.
- Companion compat layer accepts both EN and pt-BR brain filenames, content origins, and `content/` vs `conteudos/` paths.
- `scripts/lib/eeat/render.mjs` now bilingual through `reportText(locale, en, pt)`; `eeat.mjs` passes `getProjectLanguage(projectDir)` to render.
- CLI scripts (`cluster-*.mjs`, `migrate-clusters.mjs`, `reset-clusters.mjs`, `install-cluster-sync-hook.mjs`, `regenerate-clusters-brain.mjs`) emit EN console feedback.
- 3 SKILL.md (`agentic-seo`, `brain-keeper`, `topic-cluster`) translated to EN prose; phase names `Pesquisar/Curar/Estruturar/Promover` → `Research/Curate/Structure/Promote`.
- Templates EN canonical with `.pt-BR.md` siblings: brain pages, content origin templates, analyses report skeletons, `cluster.yaml`, `planning.md`, `project.json`. Loader picks variant by `project.json.language`.
- `cluster.yaml` contract bumped to `contract_version: 2`: keys renamed to EN (`name`, `thesis`, `pillar`, `role`, `published`, `planned`); readers normalize v1 → v2 in-memory via `scripts/lib/cluster-yaml.mjs` and `apps/companion/src/lib/cluster-yaml.ts`.
- Domain rename map frozen in `docs/specs/en-rename-map.md`.
- One-off migration `tools/_oneoff/migrate-brain-belo-horizonte.mjs` renamed the Belo Horizonte brain: `identidade.md` → `identity.md`, `voz.md` → `voice.md`, `tecnologia.md` → `technology.md`; `conteudos/` → `content/` with `outros/` → `other/`; log entry keys translated (`tipo`/`escopo`/`decisao`/`evidencia`/`aprovador`/`aprovado_em`/`notas` → EN); cluster.yaml v1 → v2.

## 0.1.0 - 2026-05-04

- Documented Claude Code marketplace installation as the official distribution path.
- Added `/agentic-seo:start` as the simple first-run entry point.
- Added Claude Code plugin manifest and Codex compatibility manifest.
- Added cross-agent `AGENTS.md` and Claude-specific notes.
- Added 14 Agentic SEO skills with progressive-discovery contracts.
- Added one Claude Code sub-agent per skill plus an Autoresearch sub-agent.
- Added `bin/agentic-seo` CLI with deterministic commands for v0.1 workflows.
- Added project brain templates with decision-aware frontmatter.
- Added offline smoke test, technical SEO fixtures, skill validation, and Autoresearch contract evaluator.
- Completed DataForSEO mode support for `live`, `standard`, `async`, and `offline`.
- Set DataForSEO `standard` as the default mode for SERP and keyword workflows.
- Added live DataForSEO test notes and regression coverage for queued standard tasks.
