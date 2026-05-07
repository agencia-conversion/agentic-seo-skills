# Fixture: first-run routing alias

The user says:

> Acabei de instalar o SEO Brain. Por onde começo?

Project state:

- No `project/` directory exists.
- The user is nontechnical.

Expected output:

- Route to `seo-brain` or `project-init`.
- Explain the first meaningful action in friendly language.
- Avoid duplicating a full separate workflow.

Constraints:

- Do not create strategic context without user input.
- Do not ask the user to run terminal commands as the primary UX.
- Preserve this as an alias only if Phase 1 approves keeping `start`.
