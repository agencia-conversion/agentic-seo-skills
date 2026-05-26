---
name: autoresearch
description: When the user wants a rigorous iteration loop for an artifact, prompt, briefing, content structure, or Agentic SEO skill. Also use for Karpathy-style experiment runs that need baseline scoring, explicit metrics, stop rules, and keep/reject decisions.
metadata:
  version: 1.0.0
---

# Autoresearch

You are an experiment lead for Agentic SEO. Your goal is to improve one editable surface through a controlled run with a baseline, stable metrics, one variation per iteration, and an explicit keep or reject decision.

## When To Use

Use this skill when the user asks to iterate, benchmark, evaluate, tune, or improve an artifact through repeated attempts with measurable criteria. Use `skill-eval` mode when the editable surface is one `skills/<name>/SKILL.md` file.

Do not use this skill for open-ended SEO analysis, writing authorial brain pages, content drafting without an experiment question, or bypassing a required decision/check gate. Autoresearch can recommend a winner; it cannot fabricate strategic evidence.

## Critical Points

- One run has one editable surface. Everything else is immutable context: fixtures, rubrics, source packets, logged brain pages, and prior run notes may be read, but not changed as part of the variation.
- Always score a baseline before proposing improvements. Existing drafts do not waive the baseline step.
- Commit metrics before the first variation and do not add, remove, rename, or relax metrics mid-run. If the metrics are wrong, stop and start a new run.
- Never lower decision/check gates, quality thresholds, source requirements, or review requirements to make a candidate pass. A blocked gate is a result, not a reason to weaken the gate.
- Keep raw evidence separate from synthesis: `project/sources/` for raw evidence, `.context/skill-evals/` or `project/workbench/` for working notes, and `project/artifacts/` for final deliverables.
- Do not write drafts, hypotheses, or unevidenced strategy into `project/brain/`. Authorial brain pages require a `type: decision` entry in `project/brain/log.md` with evidence, limitations, and actor.
- Never fabricate keyword volume, backlinks, rankings, credentials, awards, clients, or proof. Unknown values stay `unknown` or `null`.
- Preserve the requested output language in human-facing prose, including pt-BR accents: `página`, `conteúdo`, `análise`, `evidência`, `aprovação`, `técnico`, `não`, `até`.
- Save reviewable run notes for skill-development runs under `.context/skill-evals/<skill-name>/<run-id>/`.

## Framework

### 1. Define The Run
**Check:** What single question is the run trying to answer, and what exact surface may be edited?
**Strong:** "Improve only `skills/content-seo/SKILL.md` against the fixture and review rubric. Fixtures, rubric, manifests, and other skills are immutable."
**Weak:** "Improve the skill, fixture, rubric, and examples together until the score looks better."

Create a run id using a stable timestamp or short slug. Record:

```yaml
run:
  id: ""
  mode: general | skill-eval
  problem: ""
  editable_surface: ""
  immutable_context: []
  run_dir: .context/skill-evals/<skill-name>/<run-id>/ | project/workbench/autoresearch/<run-id>/
  max_iter: 5
  threshold: 90
  plateau_window: 3
```

Use `.context/skill-evals/` for skill-development and meta-skill runs. Use `project/workbench/autoresearch/` for project artifact experiments unless the user names another workbench path. Do not use terminal output as the only durable record.

### 2. Frame And Approve Metrics
**Check:** Do the metrics directly test the run question without weakening existing gates?
**Strong:** "Metrics include self-sufficiency, fixture execution, source separation, decision/check gates, and language fidelity. Threshold remains 90 because the existing rubric requires it."
**Weak:** "Remove gate scoring because the candidate keeps failing there."

Propose at least three metrics before any variation. Mix deterministic checks and judgment checks when possible:

- `executable`: line count, required headings, required output fields, forbidden path writes, fixture files present.
- `judge`: task clarity, hallucination risk, behavioral parity, strength of examples, source/synthesis separation.
- `gate`: decision log required, provider bypass required, brain promotion blocked, minimum rubric threshold.

Present the metrics and record the metric decision before continuing. The decision should include threshold, maximum iterations, and plateau rule.

Committed metrics are immutable for that run. Record them as:

```yaml
metrics:
  threshold: 90
  plateau_window: 3
  items:
    - id: ""
      type: executable | judge | gate
      weight: 0
      pass_rule: ""
      scoring: "0-100"
      lower_is_better: false
```

### 3. Establish The Baseline
**Check:** Is there a scored starting point using the committed metrics?
**Strong:** "Score the current `SKILL.md` before editing it and record defects against the fixture."
**Weak:** "Start by rewriting from scratch and call the first rewrite iteration 1."

If a baseline file exists, score that file. If no baseline exists, create the smallest honest baseline from the problem statement, mark it as generated, and score it. The baseline score is part of the journal and must not be overwritten.

Record:

```yaml
baseline:
  artifact: baseline.md
  generated: true | false
  scores:
    metric_id: 0
  weighted_score: 0
  defects: []
```

### 4. Run One-Variation Iterations

**Check:** Does each iteration change one deliberate thing relative to the current best?

**Strong:** "Iteration 2 keeps the output schema from iteration 1 and adds explicit stop-rule language because the baseline lost points on run lifecycle."

**Weak:** "Iteration 2 changes the task, examples, threshold, output schema, and fixture assumptions at the same time."

For each iteration:

1. Identify the current best by baseline or iteration number.
2. Propose one variation with a rationale of one or two sentences.
3. Edit only the declared editable surface or write only the candidate artifact for comparison.
4. Score every committed metric from 0-100. Binary checks are `0` or `100`.
5. Compare to the current best and record `keep`, `reject`, or `continue`.

Do not record byte-identical candidates or invent evidence to justify a better score. Write concise observable reasons.

Iteration record:

```yaml
iteration:
  n: 1
  candidate: iter-1.md
  changed: ""
  rationale: ""
  scores:
    metric_id: 0
  weighted_score: 0
  decision: keep | reject | continue
  reason: ""
  defects: []
```

### 5. Stop Correctly

**Check:** Did the run stop because a declared stop rule fired?

**Strong:** "Stop at iteration 3 because the candidate scored 92 against the committed rubric and no gate was lowered."

**Weak:** "Stop because the latest draft feels good, without showing scores or gate status."

Stop when one of these is true:

- `stop:threshold`: the current best score is greater than or equal to the committed threshold and all gate metrics pass.
- `stop:plateau`: the best score has not improved across the committed plateau window.
- `stop:max_iter`: the run reached the committed maximum iteration count.
- `manual`: the user explicitly ends the run.
- `blocked`: a required source, fixture, or tool is missing and cannot be bypassed without lowering a gate.

A plateau is a keep/reject point: keep the best candidate if it improves on baseline and passes gates; otherwise reject the experiment and preserve the baseline.

### 6. Finalize The Decision

**Check:** Can another agent review the run and understand why the winner was kept or rejected?

**Strong:** "The summary names the baseline score, winning score, stop reason, changed surface, gate status, residual risks, and exact next action."

**Weak:** "The summary says the new version is better and should be used."

Write a final summary in the run directory:

```yaml
status: finalized
run_id: ""
mode: general | skill-eval
editable_surface: ""
baseline_score: 0
winner: baseline | iter-1 | iter-2 | none
winner_score: 0
decision: keep | reject | blocked
stop_reason: stop:threshold | stop:plateau | stop:max_iter | manual | blocked
gates:
  lowered: false
  failed: []
  bypasses: []
artifacts:
  baseline: ""
  winner: ""
  journal: ""
  notes: ""
residual_risks: []
next_action: ""
```

Record a separate decision before promoting a winner outside the run directory. The run result alone is not evidence for strategic claims.

## Skill-Eval Mode

Use `skill-eval` mode when improving an Agentic SEO skill. The editable surface is exactly one `skills/<name>/SKILL.md` file unless the user explicitly names another file; save notes under `.context/skill-evals/<name>/<run-id>/`.

Minimum skill-eval metrics:

- `task_clarity`: the skill teaches one task and names routing boundaries.
- `self_sufficiency`: normal execution does not require `_shared/` or another skill.
- `examples`: at least one strong and one weak example materially contrast behavior.
- `output_contract`: output schema or template is specific enough for stable execution.
- `critical_gates`: anti-fabrication, source/synthesis separation, decision/check gates, and language fidelity are explicit.
- `behavioral_parity`: the new skill preserves required files, gates, JSON/YAML surfaces, and user-facing behavior from the existing contract.
- `length_budget`: the main `SKILL.md` stays within the configured line budget unless the run explicitly justifies an exception.

Executor simulation must use only the candidate skill and the fixture. Reviewer scoring must use the committed rubric. Sub-agent or simulated output is evidence, not final decision; the main agent still owns integration.

## Output Format

For a completed run, provide the user with a concise summary and point to the run notes. Use this shape:

```yaml
autoresearch_result:
  status: finalized | blocked
  decision: keep | reject | blocked
  stop_reason: ""
  editable_surface: ""
  baseline_score: 0
  winner_score: 0
  winner_path: ""
  run_notes: ""
  gates_lowered: false
  failed_gates: []
  residual_risks: []
  next_action: ""
```

## Examples

### Example: Skill Improvement

Input: "Improve `skills/seo-analysis/SKILL.md` with an autoresearch loop."

Output: "Run `skill-eval` with `skills/seo-analysis/SKILL.md` as the only editable surface, save notes under `.context/skill-evals/seo-analysis/<run-id>/`, score the baseline, commit metrics at threshold 90, test one candidate at a time, and keep only a candidate that improves the score without lowering DataForSEO, source separation, brain decision, or pt-BR language gates."

### Example: Weak Experiment

Input: "Make this skill pass faster."

Output: "Lower the threshold from 90 to 75, remove the gate metric, edit the fixture to match the draft, and publish the draft to `project/brain/`." This is weak because it changes the evaluation surface, lowers gates, and treats an unevidenced draft as context.

## Done Criteria

- The run has exactly one baseline record.
- Metrics were committed before the first variation and stayed unchanged.
- Each iteration has one candidate, one rationale, complete scores, and a keep/reject/continue decision.
- The stop reason is one of the declared stop reasons.
- The final summary records whether gates were lowered; a valid keep decision has `gates.lowered: false`.
- Skill-development run notes are saved under `.context/skill-evals/<skill-name>/<run-id>/`.
- The user has seen the winner or the blocked reason, and any promotion outside the run directory is handled as a separate decision step.
