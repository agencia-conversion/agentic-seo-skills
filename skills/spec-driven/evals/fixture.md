# Fixture: compound request spec

The user asks:

> Faça uma auditoria técnica, crie um plano de conteúdo e gere o site em Next.js para uma consultoria de SEO.

Known state:

- The project has no approved authorial brain pages (no `tipo: approval` entries in `project/brain/log.md`).
- No DataForSEO credentials are configured.
- The website output depends on content that does not exist.

Expected output:

- `project/workbench/specs/<slug>/spec.md` content outline.
- `plan.md` with steps, gates, and artifacts.
- `result-check.md` criteria.
- Blockers and required approvals before downstream work.

Constraints:

- Do not write the spec into `project/brain/`.
- Do not bypass missing brain approval.
- Do not promise final website delivery before upstream gates.
