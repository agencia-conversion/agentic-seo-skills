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

Phase 6 - final validation in progress.

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
- D16: Phase 4 Wave A approved `keyword-research`, `serp-extract`, and `backlink-analysis` in one iteration each.
- D17: Phase 4 Wave B approved `topic-cluster`, `content-seo`, and `eeat` in one iteration each.
- D18: Phase 4 Wave C approved `technical-seo`, `internal-links`, `next-website-creator`, and `payload-cms` in one iteration each.
- D19: Phase 4 Wave D approved `seo-brain`, `spec-driven`, `data-setup`, `wiki-maintainer`, `project-init`, `autoresearch`, and the `start` alias in one iteration each.
- D20: Phase 5 restored `src/seo-brain.ts` as a slim dispatcher/re-export surface and moved deterministic runtime parity into `src/commands/runtime.ts`; full `npm test` passes.

## Skills State

| skill | status | run-id | last-score | iterations | notes |
|---|---|---:|---:|---:|---|
| autoresearch | approved | `20260506-210544-refactor-seo-brain-skill-autores` | 97 | 1 | Wave D passed. |
| backlink-analysis | approved | `20260506-202827-refactor-seo-brain-skill-backlin` | 98 | 1 | Wave A passed. |
| content-seo | approved | `20260506-203844-refactor-seo-brain-skill-content` | 97 | 1 | Wave B passed. |
| data-setup | approved | `20260506-205841-refactor-seo-brain-skill-data-se` | 97 | 1 | Wave D passed. |
| eeat | approved | `20260506-203844-refactor-seo-brain-skill-eeat` | 97 | 1 | Wave B passed. |
| internal-links | approved | `20260506-204557-refactor-seo-brain-skill-interna` | 96 | 1 | Wave C passed. |
| keyword-research | approved | `20260506-202827-refactor-seo-brain-skill-keyword` | 98 | 1 | Wave A passed. |
| next-website-creator | approved | `20260506-204557-refactor-seo-brain-skill-next-we` | 95 | 1 | Wave C passed. |
| payload-cms | approved | `20260506-205207-refactor-seo-brain-skill-payload` | 99 | 1 | Wave C passed. |
| project-init | approved | `20260506-210544-refactor-seo-brain-skill-project` | 97 | 1 | Wave D passed. |
| seo-analysis | approved | `20260506-200703-refactor-seo-brain-skill-seo-ana` | 94 | 1 | Phase 3 calibration target passed; no rubric changes. |
| seo-brain | approved | `20260506-205840-refactor-seo-brain-skill-seo-bra` | 98 | 1 | Wave D passed. |
| serp-extract | approved | `20260506-202827-refactor-seo-brain-skill-serp-ex` | 94 | 1 | Wave A passed; minor output path/status precision notes. |
| spec-driven | approved | `20260506-205840-refactor-seo-brain-skill-spec-dr` | 97 | 1 | Wave D passed. |
| start | approved | `20260506-211054-refactor-seo-brain-skill-start` | 96 | 1 | Kept as thin alias to `seo-brain`. |
| technical-seo | approved | `20260506-204557-refactor-seo-brain-skill-technic` | 95 | 1 | Wave C passed. |
| topic-cluster | approved | `20260506-203844-refactor-seo-brain-skill-topic-c` | 95 | 1 | Wave B passed. |
| wiki-maintainer | approved | `20260506-210544-refactor-seo-brain-skill-wiki-ma` | 98 | 1 | Wave D passed. |
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
| tools registry | complete | pending | mixed | Initial registry, attribution, and DataForSEO integration docs created in Phase 2. |

## src/commands State

| subcommand | status | parity-test | notes |
|---|---|---|---|
| project-init | restored | passed | Implemented inside `src/commands/runtime.ts`; split into finer modules remains future cleanup. |
| wiki-lint | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| wiki-approve | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| wiki-ingest | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| data-setup | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| serp-extract | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| keyword-research | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| kw-volume | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| backlink-analysis | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| seo-analysis | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| topic-cluster | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| eeat | restored | passed | Compatibility command restored inside `src/commands/runtime.ts`; richer E-E-A-T engine remains in `scripts/eeat.mjs`. |
| content-seo | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| technical-seo | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| next-website-creator | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| payload-cms | restored | passed | Runtime parity restored inside `src/commands/runtime.ts`. |
| audit-skills | restored | passed | Updated to v1 narrative skill checks inside `src/commands/runtime.ts`. |

## Approval Gates

- Phase 0: complete on 2026-05-06.
- Phase 1: complete on 2026-05-06.
- Phase 2: complete on 2026-05-06.
- Phase 3: complete on 2026-05-06.
- Phase 4: complete on 2026-05-06.
- Phase 5: complete on 2026-05-06.
- Phase 6: in progress.

## Open Questions

- `start` was kept as a thin alias to `seo-brain`.
- `payload-cms` was kept as a standalone optional technology skill.
- `serp-extract` was kept as a standalone data-capture skill.
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
- Latest autoresearch run: `.context/skill-evals/start/20260506-211054-refactor-seo-brain-skill-start`
- Latest sub-agent report: Phase 5 worker restored runtime parity, ran `npm install`, `npm run build`, TypeScript no-emit, and focused runtime tests. Main agent updated v1 skill tests, `audit-skills`, and confirmed full `npm test`.

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
- Approved by: human continuation request.
- Summary: Rewrote `skills/seo-analysis/SKILL.md` as a self-sufficient narrative skill. Developer, executor, and approver roles completed one loop. Approver score was 94/100 with `keep`; autoresearch weighted aggregate was 96.3 and stopped by threshold.
- Run: `.context/skill-evals/seo-analysis/20260506-200703-refactor-seo-brain-skill-seo-ana`
- Rubric decision: no changes; proceed to Phase 4 waves with threshold 90.
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`

### Checkpoint 5a - 2026-05-06

- Phase: 4 - Wave A data skills.
- Approved by: autonomous continuation request.
- Summary: Rewrote `keyword-research`, `serp-extract`, and `backlink-analysis` as self-sufficient narrative skills. All three completed developer -> executor -> approver loops in one iteration and passed threshold.
- Scores:
  - `keyword-research`: 98
  - `serp-extract`: 94
  - `backlink-analysis`: 98
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`

### Checkpoint 5b - 2026-05-06

- Phase: 4 - Wave B workflow/content skills.
- Approved by: autonomous continuation request.
- Summary: Rewrote `topic-cluster`, `content-seo`, and `eeat` as self-sufficient narrative skills. All three completed developer -> executor -> approver loops in one iteration and passed threshold.
- Scores:
  - `topic-cluster`: 95
  - `content-seo`: 97
  - `eeat`: 97
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`

### Checkpoint 5c - 2026-05-06

- Phase: 4 - Wave C technical/website skills.
- Approved by: autonomous continuation request.
- Summary: Rewrote `technical-seo`, `internal-links`, `next-website-creator`, and `payload-cms` as self-sufficient narrative skills. All completed developer -> executor -> approver loops in one iteration and passed threshold.
- Scores:
  - `technical-seo`: 95
  - `internal-links`: 96
  - `next-website-creator`: 95
  - `payload-cms`: 99
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`

### Checkpoint 5d - 2026-05-06

- Phase: 4 - Wave D router/setup/meta skills.
- Approved by: autonomous continuation request.
- Summary: Rewrote `seo-brain`, `spec-driven`, `data-setup`, `wiki-maintainer`, `project-init`, and `autoresearch` as self-sufficient narrative skills, and kept `start` as a thin alias to `seo-brain`. All completed developer/executor/approver evaluation and passed threshold.
- Scores:
  - `seo-brain`: 98
  - `spec-driven`: 97
  - `data-setup`: 97
  - `wiki-maintainer`: 98
  - `project-init`: 97
  - `autoresearch`: 97
  - `start`: 96
- Verification:
  - `node --check scripts/skill-loop.mjs`
  - `node --check tools/clis/dataforseo.js`
  - `node tests/tools/test_dataforseo_cli.mjs`
  - `node tests/test_skill_loop_gate.mjs`

### Checkpoint 6 - 2026-05-06

- Phase: 5 - Deterministic runtime restoration.
- Approved by: autonomous continuation request.
- Summary: Restored `src/seo-brain.ts` as a slim dispatcher and re-export file, restored deterministic command/API parity in `src/commands/runtime.ts`, updated the compiled CLI output, aligned v1 skill tests and `audit-skills` with narrative self-sufficient skills, and removed the last documentation reference to the retired project selector.
- Verification:
  - `npm run build`
  - `node scripts/validate_skills.mjs`
  - `node scripts/smoke_test.mjs`
  - `npm test`
