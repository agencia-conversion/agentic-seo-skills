---
name: eeat
description: Audit a target's Experience, Expertise, Authoritativeness, and Trust by dispatching three parallel sub-agents that act as Google Search Quality Raters against a fixed checklist. Produces a consensus score, page-quality rating, evidence-backed findings, and prioritized remediation. Targets the project wiki or any public URL.
---

# EEAT

Use this skill when the user asks to audit, score, evaluate, or strengthen E-E-A-T — for the project wiki, the project's own site, or any public URL.

Read first when needed:

- `skills/eeat/references/checklist.md` — fixed E-E-A-T checklist (the contract for every rating).
- `skills/eeat/references/rubric.md` — ratings, score math, gates (Trust gate, Reputation cap, YMYL).
- `skills/eeat/references/rater-prompt.md` — prompt to copy into each rater sub-agent.
- `skills/eeat/references/consensus.md` — how 3 raters are merged.
- `skills/_shared/references/operating-model.md`

## Contract

Inputs:

- `--mode wiki` (default) or `--mode url`;
- in URL mode: `--url <https://...>`;
- optional `--slug` for the run-id, `--pages-file <json>` to override page set, `--reputation-query <q>` to override the reputation lookup.

Writes only:

- `project/reports/eeat/<run-id>/manifest.json`
- `project/reports/eeat/<run-id>/raters/rater-{1,2,3}.json` (written by sub-agents, not the engine)
- `project/reports/eeat/<run-id>/report.json`
- `project/reports/eeat/<run-id>/report.md`
- `project/wiki/eeat.md` only when the user explicitly approves a sync, with `status: needs-review`.

Engine: `node scripts/eeat.mjs <init|validate|consensus|synthesize> [args]`.

## Required Behavior

1. **Init**: call `node scripts/eeat.mjs init --mode <wiki|url> [--url ...] [--slug ...]`. Capture `run_id`, `run_dir`, `manifest_path`, and the 3 `rater_output_paths`.
2. **Dispatch 3 raters in parallel** via the `Agent` tool. Each agent receives the same prompt (verbatim from `references/rater-prompt.md`), the same `manifest.json`, the contents of `references/checklist.md` and `references/rubric.md`, and a unique `output_path` (`rater-1.json`, `rater-2.json`, `rater-3.json`). Do not reveal to a rater that other raters exist. Send the three `Agent` tool uses in a single message so they run concurrently.
3. **Reputation lookup is mandatory in URL mode.** If a rater cannot run `WebSearch` against `reputation_query`, the engine will cap Authoritativeness numeric score at 50 and flag `reputation_only_self_published`. Do not fake reputation.
4. **Validate each rater output** with `node scripts/eeat.mjs validate --rater-output <path>` before consensus. If any rater output is invalid, fix the prompt or rerun that rater — never edit the rater's JSON manually.
5. **Consensus**: call `node scripts/eeat.mjs consensus --run <run-id>`. The engine takes the median of numeric scores per pillar, applies gates (Trust gate, Reputation cap, YMYL elevation), clusters remediation, and writes `report.json` + `report.md`. Per-rater detail is preserved in `report.json._audit` for traceability but is not surfaced in `report.md`.
6. **Synthesize a single consolidated narrative.** Read `report.json` (not the individual rater outputs — the engine has already merged them). Write 2–4 paragraphs in the voice of a single Quality Rater: strengths, weaknesses, priorities. Do not say "rater-1 said X" or "raters disagreed". Save the text and run `node scripts/eeat.mjs synthesize --run <run-id> --narrative-file <path>` (or `--narrative "<text>"`). The engine injects it into `report.md`.
7. **Present results** to the user: score (0–100), page_quality, score per pillar, top remediation items, and `risk_flags`. The consolidated narrative IS the analysis — present it as the final word, not as a synthesis of three opinions.
8. **Wiki sync is gated.** Never write to `project/wiki/eeat.md` automatically. If the user asks to sync, use `AskUserQuestion` to confirm, then write the inventory of `present` findings (with sources) into `wiki/eeat.md` keeping `status: needs-review` and never marking as approved.
9. **Never invent.** No invented clients, awards, credentials, partnerships, dates, or numbers. Every `present` rating in the output must carry an `evidence_quote`. Items without evidence are demoted to `unclear` by the engine.

## Done Criteria

- `report.json` and `report.md` exist in `project/reports/eeat/<run-id>/`.
- `score` is a number 0–100, derived from continuous numeric scores per pillar (ratio × 100).
- `consolidated_narrative` is set in `report.json` and rendered in `report.md` as the single "Análise" section. No per-rater divergence appears in the user-facing markdown.
- `risk_flags` lists every triggered gate and divergence signal.
- The user has been shown the score, page_quality, score per pillar, and the prioritized remediation list.
- No write to `wiki/eeat.md` happened without an explicit approval gate.
