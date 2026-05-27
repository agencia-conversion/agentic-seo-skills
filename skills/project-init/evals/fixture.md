# Fixture: initialize a project

Initialize a new Agentic SEO project named `Projeto de Acentuação`.

Project settings:

- country: Brazil
- market: Brazil
- language: pt-BR
- website: `https://example.com`

Expected output:

- Project directory structure (`brain/`, `sources/`, `contents/`, `artifacts/`, `workbench/`).
- 7 brain files copied from blank templates (index, identity, voice, technology, topic-clusters, review, log); placeholders untouched except for review.md, which carries the universal editorial review rules populated by the template.
- 4 `_template.md` files in `contents/{blog,linkedin,podcast,other}/`.
- `.agentic-seo/project.json` metadata with `schema_version: "2.0.0"`.
- Initial entry in `brain/log.md` with `type: decision` and `approver: agent`.

Constraints:

- Idempotent if run twice.
- Do not overwrite brain files that already have user content.
- Preserve accents in human-facing text.
- No `wiki/` directory anywhere.
