---
name: autoresearch
description: Karpathy-style autonomous research loop. Frames metrics, proposes variations, records keep/reject decisions, and stops on threshold, plateau, or budget. Use when iterating any artifact (briefing, headline, prompt, content structure, or another SEO Brain skill) with rigor.
---

# Autoresearch

Use this skill when the user wants to iterate on an artifact with explicit metrics and stop rules instead of ad-hoc edits. Works for any text artifact and for evaluating other SEO Brain skills against fixtures.

Read first when needed:

- `skills/_shared/references/autoresearch-protocol.md` — schemas, lifecycle, stop math, examples.
- `program.md` — the doctrine for plugin-development autoresearch (editable surface, immutable surface). Required reading when running in `skill-eval` mode.
- `templates/autoresearch/run-skeleton/` — starter `metrics.json` and `state.json`.
- `templates/autoresearch/skill-eval/fixtures.md` — fixture skeleton for the meta mode.

## Contract

Inputs:

- problem statement (free text);
- optional baseline artifact path;
- optional `--mode skill-eval` with `target_skill` path and `fixtures_dir`;
- optional knobs: `max_iter`, `threshold`, `plateau_window`.

Writes only:

- `<run-dir>/state.json`, `metrics.json`, `metrics-draft.json`, `journal.jsonl`;
- `<run-dir>/baseline.md`, `iter-N.md`, `winner.md`, `summary.md`;
- where `<run-dir>` resolves to `projects/<slug>/.context/autoresearch/<run-id>/` when a project slug is provided and exists, otherwise `.context/autoresearch/<run-id>/`.

Engine: `node scripts/autoresearch.mjs <subcommand> [args]`. Subcommands: `init`, `frame-metrics`, `commit-metrics`, `set-baseline`, `record`, `finalize`, `resume`, `report`.

## Required Behavior

1. **Init**: call `init --problem "<text>" [--mode general|skill-eval] [--max-iter N] [--threshold N] [--plateau N] [--project-slug <slug>]`. Capture `run_id` and `run_dir`.
2. **Phase 0 — Frame metrics**: propose at least 3 candidate metrics that mix `executable` (deterministic) and `judge` (LLM-as-judge) types, justified against the problem. Write to a candidates file, call `frame-metrics --run <id> --candidates <file>`. Present candidates to the user via AskUserQuestion. Call `commit-metrics --run <id> [--selected i,j,k]` only after explicit user approval.
3. **Baseline**: if the user provided a baseline artifact, score it against committed metrics and call `set-baseline --run <id> --artifact <file> --scores '<json>'`. Otherwise generate a minimal baseline from the problem statement and follow the same path.
4. **Loop** (until decision != `continue`): propose ONE variation. The rationale (≤2 sentences) MUST reference the current best by iter number and explain what differs. Score every committed metric (run executable code for `executable`, judge against rubric prose for `judge`, both 0-1). Call `record --run <id> --variation <file> --rationale "<text>" --scores '<json>'`. Stop when the engine returns `stop:threshold`, `stop:plateau`, or `stop:max_iter`.
5. **Finalize**: call `finalize --run <id>`. Present `winner.md` and `summary.md` to the user.
6. **Read-only invariant**: never overwrite project files outside the run directory. Promotion of `winner.md` to a project artifact (e.g. `projects/<slug>/wiki/...`) is a separate, gated step that requires AskUserQuestion approval.
7. **Resume**: if the user provides an existing `run_id`, call `resume --run <id>`, read state and journal, and continue from `state.phase`.
8. **skill-eval mode**: each variation is a candidate replacement for the target SKILL.md; score it by reading each fixture in `fixtures_dir` and judging or asserting against the rubric (v1: inline simulation; v2 will subprocess `claude --plugin-dir .`).
9. **Anti-drift**: refuse to record byte-identical variations (engine enforces); keep rationale grounded in journal evidence; do not invent metrics not in the committed `metrics.json`.

## Done Criteria

- `state.phase == "finalized"`.
- `winner.md` and `summary.md` exist in the run directory.
- Stop reason in `summary.md` is one of: `stop:threshold`, `stop:plateau`, `stop:max_iter`, or `manual`.
- Journal contains exactly one `baseline` event, one `metrics_committed` event, one `iteration`+`decision` pair per recorded iteration, and one `finalize` event.
- The user has been shown the winner; promotion to a project artifact is an explicit follow-up if requested.
