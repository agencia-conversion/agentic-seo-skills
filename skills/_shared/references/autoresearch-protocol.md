# Autoresearch Protocol

Reference for the `/seo-brain:autoresearch` skill. Defines the run lifecycle, schemas, stop rules, and modes. Inspired by `karpathy/autoresearch`: one subsystem per run, baseline first, fixed budget, explicit metric, keep/reject decision.

## Lifecycle

```
init → frame-metrics → commit-metrics → set-baseline → record* → finalize
                                                           │
                                                  resume (any time)
```

Each stage is a CLI subcommand of `scripts/autoresearch.mjs`. The skill orchestrates; the engine persists state and decides stops.

## Run Directory

When invoked inside a SEO Brain project (slug detected via `projects/<slug>/.seo-brain/`):

```
projects/<slug>/.context/autoresearch/<run-id>/
```

Otherwise (free use):

```
.context/autoresearch/<run-id>/
```

`run-id` format: `YYYYMMDD-HHMMSS-<problem-slug>` (problem slug truncated to 32 chars, kebab-case, ASCII only).

Files inside the run directory:

- `state.json` — current run state (mutable, atomic write).
- `metrics.json` — committed metrics (immutable after `commit-metrics`).
- `journal.jsonl` — append-only event log.
- `baseline.md` — baseline artifact text.
- `iter-N.md` — variation N text.
- `winner.md` — produced by `finalize`.
- `summary.md` — produced by `finalize`.

## state.json schema

```json
{
  "run_id": "20260504-205755-melhorar-briefing-x",
  "problem": "<original problem text>",
  "mode": "general",
  "max_iter": 8,
  "threshold": 8,
  "plateau_window": 3,
  "phase": "framing|baselined|looping|finalized",
  "iter": 0,
  "best": { "iter": null, "score": null, "path": null },
  "history": [],
  "project_slug": "agencia-conversion-seo-brain",
  "created_at": "<ISO>",
  "updated_at": "<ISO>"
}
```

`history` is a derived cache of `{iter, score}` per recorded iteration; the source of truth is `journal.jsonl`.

## metrics.json schema

```json
{
  "metrics": [
    {
      "id": "title-length",
      "type": "executable",
      "source": "title.length <= 60",
      "weight": 1,
      "scoring": "binary"
    },
    {
      "id": "brand-voice",
      "type": "judge",
      "source": "alinhamento com tom-de-voz aprovado da marca",
      "weight": 2,
      "scoring": "0_to_1"
    }
  ],
  "aggregation": "weighted_mean",
  "scale": "0_to_10"
}
```

Rules:

- `type`: `executable` (deterministic, agent runs and captures number) or `judge` (LLM-as-judge against rubric prose).
- `scoring`: `binary` (0|1) or `0_to_1` (continuous). All scores normalize to 0-1 internally; `scale` only applies to the aggregated final score.
- `weight`: positive integer.
- `aggregation`: `weighted_mean` (v1 only).

Aggregation formula:

```
agg_normalized = Σ(score_i * weight_i) / Σ(weight_i)
agg_final = round(agg_normalized * 10, 2)   // when scale = "0_to_10"
```

## journal.jsonl events

One JSON object per line. Events:

```jsonl
{"ts":"<ISO>","event":"baseline","artifact_path":"baseline.md","scores":{"title-length":1,"brand-voice":0.5},"agg":6.67}
{"ts":"<ISO>","event":"metrics_committed","metrics_count":2}
{"ts":"<ISO>","event":"iteration","iter":1,"variation_path":"iter-1.md","rationale":"varia o gancho da headline para incluir benefício explícito","scores":{"title-length":1,"brand-voice":0.8},"agg":8.67,"keep":true}
{"ts":"<ISO>","event":"decision","iter":1,"decision":"continue","best_score":8.67,"reason":"abaixo do threshold, sem plateau"}
{"ts":"<ISO>","event":"finalize","best":{"iter":3,"score":9.0,"path":"iter-3.md"},"reason":"stop:threshold"}
```

## Stop rules

Evaluated after every `record`, in this order:

1. **threshold**: `best.score >= state.threshold` → `stop:threshold`.
2. **plateau**: when `iter >= plateau_window + 1` AND `max(history[-plateau_window:].score) <= max(history[:-plateau_window].score)` → `stop:plateau`.
3. **max_iter**: `iter >= state.max_iter` → `stop:max_iter`.
4. otherwise → `continue`.

Plateau math (window = 3):

```
history = [6.0, 7.5, 8.0, 8.0, 7.9, 7.8]
recent  = max(history[-3:]) = 8.0
prior   = max(history[:-3]) = 8.0
recent <= prior → plateau hit
```

## Anti-drift rules for variations

The skill must enforce on each iteration:

- A variation file (`iter-N.md`) ≤ 50 KB. Soft warning >5 KB. Hard reject >50 KB.
- A `rationale` ≤ 2 sentences explaining what differs from prior best (NOT from baseline; must reference the current best by iter number).
- A variation cannot be byte-identical to any prior variation in the same run (engine checks via hash before recording).

## Modes

### general

- Default. Problem is free-form. Baseline is optional (engine creates blank baseline if omitted).
- Artifacts in `.context/autoresearch/<run-id>/` (root or project).

### skill-eval (meta)

- Problem framed as "iterate skill X against fixtures".
- `state.target_skill` = path to the SKILL.md being iterated.
- `state.fixtures_dir` = directory with one fixture per file (each file = one input).
- Each variation is a candidate replacement for the target SKILL.md.
- Scoring: agent runs each variation against every fixture, judges or asserts per fixture, aggregates.
- v1 simulation: agent reads the candidate SKILL.md as prompt-supplement and answers each fixture inline. v2 (out of scope): subprocess `claude --plugin-dir . -p "..."`.
- Templates: `templates/autoresearch/skill-eval/fixtures.md`.

## Read-only invariant

The engine never writes to project files outside its own run directory. The skill may, but only after explicit human approval via AskUserQuestion. `winner.md` is presented; promotion to project artifact is a separate, gated step.

## Resume

`resume --run <id>` returns full state JSON. The agent re-enters at `state.phase` and continues. If the agent's context was lost, the journal is the source of truth — the agent reads `journal.jsonl` to reconstruct rationales of prior iterations.
