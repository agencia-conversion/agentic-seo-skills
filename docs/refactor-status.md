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

Phase 3 - First skill calibration checkpoint ready.

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
- D9: Phase 1 keeps `payload-cms` and `serp-extract` as standalone v1 skills for now, but flags both for approval.
- D10: Phase 1 recommends retiring `start` or making it a thin alias to `seo-brain`.
- D11: Phase 2 hard-forks DataForSEO first from `coreyhaines31/marketingskills` commit `906c2fb28e471c5b1d149d4159ec5ddb40b7c364`; GSC, Ahrefs, Semrush, Similarweb, Keywords Everywhere, and AIROPS remain candidates.
- D12: `seo-skills-creator` bootstrap was approved by the main agent at score 96.5 and finalized through `scripts/skill-loop.mjs`.
- D13: `seo-tools-creator` was approved at score 94 after fixture output, reviewer validation, and DataForSEO tool tests.
- D14: `scripts/skill-loop.mjs finalize` now requires threshold success by default; below-threshold finalization requires explicit max-iteration escalation.
- D15: Phase 3 calibrated `seo-analysis` with no rubric changes. Threshold remains 90; the rubric is ready for Phase 4 waves.

## Skills State

| skill | status | run-id | last-score | iterations | notes |
|---|---|---:|---:|---:|---|
| autoresearch | fixture-ready | - | - | - | Keep; fixture created. |
| backlink-analysis | fixture-ready | - | - | - | Keep; fixture created. |
| content-seo | fixture-ready | - | - | - | Keep with internal phases; fixture created. |
| data-setup | fixture-ready | - | - | - | Keep; fixture created. |
| eeat | fixture-ready | - | - | - | Keep; fixture created. |
| internal-links | fixture-ready | - | - | - | Keep; fixture created. |
| keyword-research | fixture-ready | - | - | - | Keep; fixture created. |
| next-website-creator | fixture-ready | - | - | - | Keep; fixture created. |
| payload-cms | fixture-ready | - | - | - | Keep as optional technology skill pending approval; fixture created. |
| project-init | fixture-ready | - | - | - | Keep; fixture created. |
| seo-analysis | approved | `20260506-200703-refactor-seo-brain-skill-seo-ana` | 94 | 1 | Phase 3 calibration target passed; no rubric changes. |
| seo-brain | fixture-ready | - | - | - | Router skill; fixture created. |
| serp-extract | fixture-ready | - | - | - | Keep as data-capture skill pending approval; fixture created. |
| spec-driven | fixture-ready | - | - | - | Keep for compound requests; fixture created. |
| start | fixture-ready | - | - | - | Retire or alias pending approval; fixture created. |
| technical-seo | fixture-ready | - | - | - | Keep; fixture created. |
| topic-cluster | fixture-ready | - | - | - | Keep; fixture created. |
| wiki-maintainer | fixture-ready | - | - | - | Keep; fixture created. |
| seo-skills-creator | approved | `20260506-192337-refactor-seo-brain-skill-seo-ski` | 96.5 | 1 | Bootstrap approval by main agent; finalized. |
| seo-tools-creator | approved | `20260506-192743-refactor-seo-brain-skill-seo-too` | 94 | 1 | Fixture output, reviewer validation, and tool CLI test passed. |

## Tools State

| tool | status | source-commit | upstream | notes |
|---|---|---|---|---|
| dataforseo.js | forked | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Added `tools/clis/dataforseo.js`, docs, registry, attribution, and fixture test. |
| google-search-console.js | candidate | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Candidate after DataForSEO. |
| ahrefs.js | candidate | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Candidate after dependency audit. |
| semrush.js | candidate | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Candidate after dependency audit. |
| similarweb.js | candidate | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Candidate after dependency audit. |
| keywords-everywhere.js | candidate | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Candidate after dependency audit. |
| airops.js | candidate | `906c2fb28e471c5b1d149d4159ec5ddb40b7c364` | `coreyhaines31/marketingskills` | Candidate only if useful for workflow automation. |
| tools registry | planned | pending | mixed | To be created in Phase 2. |

## src/commands State

| subcommand | status | parity-test | notes |
|---|---|---|---|
| project-init | mapped | pending | `src/commands/project-init.ts`. |
| wiki-lint | mapped | pending | `src/commands/wiki-lint.ts`. |
| wiki-approve | mapped | pending | `src/commands/wiki-approve.ts`. |
| wiki-ingest | mapped | pending | `src/commands/wiki-ingest.ts`. |
| data-setup | mapped | pending | `src/commands/data-setup.ts`. |
| serp-extract | mapped | pending | `src/commands/serp-extract.ts`. |
| keyword-research | mapped | pending | `src/commands/keyword-research.ts`. |
| kw-volume | mapped | pending | Merge into keyword research as lean mode or wrapper. |
| backlink-analysis | mapped | pending | `src/commands/backlink-analysis.ts`. |
| seo-analysis | mapped | pending | `src/commands/seo-analysis.ts`. |
| topic-cluster | mapped | pending | `src/commands/topic-cluster.ts`. |
| eeat | mapped | pending | Compatibility stub or omit real command. |
| content-seo | mapped | pending | `src/commands/content-seo.ts` plus helpers if needed. |
| technical-seo | mapped | pending | `src/commands/technical-seo.ts`. |
| next-website-creator | mapped | pending | `src/commands/next-website-creator.ts`. |
| payload-cms | mapped | pending | `src/commands/payload-cms.ts`. |
| audit-skills | mapped | pending | `src/commands/audit-skills.ts` or script-backed dev command. |

## Approval Gates

- Phase 0: complete on 2026-05-06.
- Phase 1: complete on 2026-05-06.
- Phase 2: complete on 2026-05-06.
- Phase 3: ready for checkpoint approval on 2026-05-06.
- Phase 4: pending.
- Phase 5: pending.
- Phase 6: pending.

## Open Questions

- Approve retiring `start` or keeping it as a thin alias.
- Approve keeping `payload-cms` as a standalone optional technology skill.
- Approve keeping `serp-extract` as a standalone data-capture skill.
- Approve the Phase 2 tool fork list: DataForSEO first, other providers as candidates only.

## Pointers

- Legacy snapshot: `_legacy/`
- Legacy consultation rules: `_legacy/CONSULT-RULES.md`
- Refactor architecture: `docs/refactor-architecture.md`
- Rubric seed: `skills/seo-skills-creator/references/approval-rubric.md`
- Skill loop script: `scripts/skill-loop.mjs`
- Initial tools registry: `tools/REGISTRY.md`
- Tool attribution: `tools/ATTRIBUTIONS.md`
- DataForSEO tool test: `tests/tools/test_dataforseo_cli.mjs`
- Pre-rewrite tag: `v0-pre-rewrite`
- Latest autoresearch run: `.context/skill-evals/seo-analysis/20260506-200703-refactor-seo-brain-skill-seo-ana`
- Latest sub-agent report: Phase 3 approver scored `seo-analysis` 94/100, decision `keep`; minor executor-output notes only.

## Checkpoint Log

### Checkpoint 1 - 2026-05-06

- Phase: 0 - Preparation.
- Approved by: human continuation request.
- Summary: Created a versioned legacy snapshot, removed canonical rewrite targets, added continuation and license scaffolds, and documented the legacy quarantine rules.

### Checkpoint 2 - 2026-05-06

- Phase: 1 - Diagnosis and architecture.
- Approved by: human continuation request.
- Summary: Created `docs/refactor-architecture.md`, mapped all 18 legacy skills plus 2 meta-skills, mapped 16 legacy commands into command modules, defined tool fork candidates, created 20 evaluator fixtures, and seeded the narrative skill approval rubric.

### Checkpoint 3 - 2026-05-06

- Phase: 2 - Meta-skills and initial tools.
- Approved by: human continuation request.
- Summary: Added `seo-skills-creator`, `seo-tools-creator`, `scripts/skill-loop.mjs`, DataForSEO tool fork, tool registry, attribution notices, and focused tests. Fixed reviewer-identified finalize gate in the skill loop.
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`

### Checkpoint 4 - 2026-05-06

- Phase: 3 - First skill calibration.
- Approved by: pending human approval.
- Summary: Rewrote `skills/seo-analysis/SKILL.md` as a self-sufficient narrative skill. Developer, executor, and approver roles completed one loop. Approver score was 94/100 with `keep`; autoresearch weighted aggregate was 96.3 and stopped by threshold.
- Run: `.context/skill-evals/seo-analysis/20260506-200703-refactor-seo-brain-skill-seo-ana`
- Rubric decision: no changes; proceed to Phase 4 waves with threshold 90.
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`
