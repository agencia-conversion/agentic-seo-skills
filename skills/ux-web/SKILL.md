---
name: ux-web
description: Provide SEO Brain's local web UX for project dashboards, artifact previews, setup tutorials, and approval flows for nontechnical users.
---

# UX Web

Use this skill when the user needs to view, approve, preview, or configure SEO Brain work through a web app instead of terminal output.

Read first when needed:

- `skills/_shared/references/operating-model.md`
- `docs/product-spec-v0.1.md`

## Contract

Inputs:

- project slug;
- artifact, Wiki page, report, or setup flow to display.

Writes only:

- dashboard code or templates owned by SEO Brain;
- generated artifacts under `projects/[project]/artifacts/`;
- explicit approval records when the user approves in the web UI.

## Required Behavior

- Prefer visual previews and plain Portuguese explanations.
- Hide full secrets and credentials.
- Surface pending approvals.
- Render Markdown, reports, and web previews.
- Explain missing dependencies or credentials without exposing stack traces as the primary UX.

## Done Criteria

- User can see the requested artifact or workflow in a local web UI.
- Pending approvals are visible.
- Sensitive values are masked.

