# Fixture: initialize a project

Initialize a new SEO Brain project named `Projeto de Acentuação`.

Project settings:

- country: Brazil
- market: Brazil
- language: pt-BR
- website: `https://example.com`

Expected output:

- Project directory structure (`brain/`, `sources/`, `conteudos/`, `artifacts/`, `workbench/`).
- 7 brain files copied from blank templates with placeholders untouched.
- 4 `_template.md` files in `conteudos/{blog,linkedin,podcast,outros}/`.
- `.seo-brain/project.json` metadata with `schema_version: "2.0.0"`.
- Initial entry in `brain/log.md` with `tipo: decisao` and `aprovador: agent`.

Constraints:

- Idempotent if run twice.
- Do not overwrite brain files that already have user content.
- Preserve accents in human-facing text.
- No `wiki/` directory anywhere.
