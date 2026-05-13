# Fixture: compound request spec

The user asks:

> Faça uma auditoria técnica, crie um plano de conteúdo e gere o site para uma consultoria de SEO.

Known state:

- The project has no logged authorial brain decisions (no `tipo: decisao` entries in `project/brain/log.md`).
- No DataForSEO credentials are configured.
- Website generation is outside the Agentic SEO skill scope.

Expected output:

- `project/workbench/specs/<slug>/spec.md` content outline.
- `plan.md` with steps, gates, and artifacts.
- `result-check.md` criteria.
- Blockers and required decisions/checks before downstream work.

Constraints:

- Do not write the spec into `project/brain/`.
- Do not bypass missing brain decision evidence.
- Do not promise final website delivery.
- Mark website implementation as out of scope rather than planning code changes.
