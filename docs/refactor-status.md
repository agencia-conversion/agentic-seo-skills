# SEO Brain Refactor - Status

## Resume Protocol

Read this section first if you are a new session.

1. Read this file top to bottom.
2. Read `program.md` and the active workspace instructions.
3. Run `git log --oneline -20` to see the latest commits.
4. Find the most recent `## Checkpoint` section below; resume from the next unfinished phase.
5. If a tri-agent loop is mid-run, find its run id under `.context/skill-evals/` and inspect `state.json` for the current iteration.
6. Do not read `_legacy/` directly unless the current task explicitly assigns a legacy consultation role. Follow `_legacy/CONSULT-RULES.md`.

## Current Phase

Phase 0 - Preparation checkpoint ready.

Canonical rewrite targets have been cleared after the legacy snapshot:

- `skills/*`
- `src/seo-brain.ts`

Canonical runtime support files remain in place:

- `scripts/`
- `tests/`
- `templates/`
- `bin/`
- `src/lib/player-score.ts`

## Decision Log

- D1: `_legacy/` lives at the repository root, is versioned, and is removed in v0.2.0.
- D2: Target skill style is narrative, self-sufficient, page-cro inspired, with framework steps and concrete examples.
- D3: `tools/` will hard-fork useful MIT files from `coreyhaines31/marketingskills/tools` with explicit attribution.
- D4: Phase 5 deterministic refactor runs autonomously, then stops at a summarized checkpoint.
- D5: Skills are written in English. Runtime natural-language output follows the project language, with pt-BR accents preserved.
- D6: Skill development uses a developer -> executor -> approver loop with threshold >= 90 and max 5 iterations.
- D7: This file is the living continuation document for cross-session work.
- D8: Phase 0 snapshot was created before removing canonical rewrite targets.

## Skills State

| skill | status | run-id | last-score | iterations | notes |
|---|---|---:|---:|---:|---|
| autoresearch | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| backlink-analysis | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| content-seo | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| data-setup | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| eeat | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| internal-links | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| keyword-research | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| next-website-creator | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| payload-cms | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| project-init | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| seo-analysis | legacy-snapshotted | - | - | - | First calibration target in Phase 3. |
| seo-brain | legacy-snapshotted | - | - | - | Router skill to be rewritten. |
| serp-extract | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| spec-driven | legacy-snapshotted | - | - | - | Evaluate whether to keep in Phase 1. |
| start | legacy-snapshotted | - | - | - | Evaluate merge with `seo-brain` in Phase 1. |
| technical-seo | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| topic-cluster | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| wiki-maintainer | legacy-snapshotted | - | - | - | Awaiting Phase 1 mapping. |
| seo-skills-creator | planned | - | - | - | New meta-skill in Phase 2. |
| seo-tools-creator | planned | - | - | - | New meta-skill in Phase 2. |

## Tools State

| tool | status | source-commit | upstream | notes |
|---|---|---|---|---|
| dataforseo.js | planned | pending | `coreyhaines31/marketingskills` | Minimum hard-fork target. |
| tools registry | planned | pending | mixed | To be defined in Phase 1 and created in Phase 2. |

## src/commands State

| subcommand | status | parity-test | notes |
|---|---|---|---|
| project-init | planned | pending | Awaiting Phase 1 mapping. |
| wiki-lint | planned | pending | Awaiting Phase 1 mapping. |
| wiki-approve | planned | pending | Awaiting Phase 1 mapping. |
| wiki-ingest | planned | pending | Awaiting Phase 1 mapping. |
| data-setup | planned | pending | Awaiting Phase 1 mapping. |
| serp-extract | planned | pending | Awaiting Phase 1 mapping. |
| keyword-research | planned | pending | Awaiting Phase 1 mapping. |
| kw-volume | planned | pending | Awaiting Phase 1 mapping. |
| backlink-analysis | planned | pending | Awaiting Phase 1 mapping. |
| seo-analysis | planned | pending | Awaiting Phase 1 mapping. |
| topic-cluster | planned | pending | Awaiting Phase 1 mapping. |
| eeat | planned | pending | Awaiting Phase 1 mapping. |
| content-seo | planned | pending | Awaiting Phase 1 mapping. |
| technical-seo | planned | pending | Awaiting Phase 1 mapping. |
| next-website-creator | planned | pending | Awaiting Phase 1 mapping. |
| payload-cms | planned | pending | Awaiting Phase 1 mapping. |
| audit-skills | planned | pending | Awaiting Phase 1 mapping. |

## Approval Gates

- Phase 0: ready for checkpoint approval on 2026-05-06.
- Phase 1: pending.
- Phase 2: pending.
- Phase 3: pending.
- Phase 4: pending.
- Phase 5: pending.
- Phase 6: pending.

## Open Questions

- Phase 1 must decide whether `start` merges into `seo-brain`.
- Phase 1 must decide whether `spec-driven` remains a standalone skill.
- Phase 1 must approve the exact provider list to fork under `tools/`.

## Pointers

- Legacy snapshot: `_legacy/`
- Legacy consultation rules: `_legacy/CONSULT-RULES.md`
- Pre-rewrite tag: `v0-pre-rewrite`
- Latest autoresearch run: none yet
- Latest sub-agent report: none yet

## Checkpoint Log

### Checkpoint 1 - 2026-05-06

- Phase: 0 - Preparation.
- Approved by: pending human approval.
- Summary: Created a versioned legacy snapshot, removed canonical rewrite targets, added continuation and license scaffolds, and documented the legacy quarantine rules.
