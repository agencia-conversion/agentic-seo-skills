# Legacy Consultation Rules

`_legacy/` is a versioned quarantine snapshot of the pre-rewrite SEO Brain implementation.

It exists for audit, parity checks, and controlled migration only. It is not runtime source.

## Rules

- Main agents must not read `_legacy/` while doing ordinary implementation work.
- Only sub-agents assigned a specific refactor, parity, or review task may consult `_legacy/`.
- Do not execute binaries, scripts, tests, or generated artifacts from `_legacy/`.
- If code, prompts, fixtures, templates, or behavior are copied from `_legacy/`, record the source path, destination path, and reason in `docs/refactor-status.md`.
- Treat `_legacy/` as immutable until removal in v0.2.0.

## Allowed Uses

- Compare old and new behavior for an explicitly scoped parity test.
- Inspect a single old skill when rewriting that same skill.
- Audit source separation, approval gates, or language fidelity from the previous implementation.

## Disallowed Uses

- Reusing `_legacy/` as hidden context for a new skill executor.
- Running commands from `_legacy/`.
- Treating old drafts, contracts, or workflow shortcuts as approved strategic context.
