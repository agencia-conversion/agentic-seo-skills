---
name: data-setup
description: Help nontechnical users configure DataForSEO and future data providers securely through guided setup and masked validation.
---

# Data Setup

Use this skill when the user asks to configure credentials, validate DataForSEO, or set up external SEO data providers.

Read first when needed:

- `.env.example`
- `.claude-plugin/plugin.json`

## Contract

Inputs:

- provider name;
- user-provided credentials or existing environment variables.

Writes only:

- `.env.example` when adding placeholder keys;
- project-local config files only after explicit user action;
- setup reports under `project/reports/setup/` when a project is active.

## Required Behavior

- Never display full secrets.
- Prefer Claude Code `userConfig` sensitive fields when running as a plugin.
- When credentials are missing in standalone CLI mode, open the local web handoff:

```bash
bin/seo-brain data-setup --handoff
```

- Set `dataforseo_mode` to `standard` by default unless the user asks for `live`, `async`, or `offline`.
- Validate credentials with a minimal safe request.
- Explain setup in plain Portuguese.
- Support DataForSEO first and leave provider abstraction for future sources.
- The CLI reads the same `~/.seo-brain/credentials.json` file that the handoff writes.

## Done Criteria

- Credential status is clear and masked.
- Missing credentials have actionable setup guidance.
- No secret values are committed or logged.
