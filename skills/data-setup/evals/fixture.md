# Fixture: secure provider setup

Guide a nontechnical user through DataForSEO setup for a standalone Agentic SEO project.

Situation:

- No credentials are configured.
- The user wants to avoid pasting secrets into terminal output.
- The project is running outside Claude Code plugin userConfig.

Expected output:

- Browser handoff recommendation.
- Explanation of where credentials will be stored in standalone mode.
- Masked validation summary.
- Friendly next step if validation fails.

Constraints:

- Never echo full credentials.
- Never write secrets to the repo root `.env`.
- Do not use raw terminal commands as the primary UX.
