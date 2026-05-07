# Fixture: initialize a project

Initialize a new SEO Brain project named `Projeto de Acentuação`.

Project settings:

- country: Brazil
- market: Brazil
- language: pt-BR
- website: `https://example.com`

Expected output:

- Project directory structure.
- Required strategic wiki pages as drafts.
- `.seo-brain/project.json` metadata.
- Initial log entry with type `operational-decision`.

Constraints:

- Idempotent if run twice.
- Do not overwrite approved pages.
- Preserve accents in human-facing text.
