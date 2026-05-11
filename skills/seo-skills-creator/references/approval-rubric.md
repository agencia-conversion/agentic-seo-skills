# Narrative Skill Decision Rubric

Use this rubric to evaluate a single `SKILL.md` plus the executor output produced from its fixture.

Threshold: 90/100.

Maximum iterations: 5 before escalation.

## Scoring

| Dimension | Weight | Scoring | Criteria |
|---|---:|---|---|
| Task clarity | 20 | 0-100 | The skill teaches one task in under 3 minutes of reading and makes routing boundaries clear. |
| Self-sufficiency | 15 | 0 or 100 | The executor can complete the fixture from this skill alone. Required reads from `_shared/` score 0. |
| Examples | 15 | 0 or 100 | At least one strong example and one weak example are present and materially contrast behavior. |
| Output format | 15 | 0-100 | The deliverable schema/template is specific enough for stable executor output. |
| Critical points | 10 | 0-100 | Non-negotiable invariants are explicit: anti-fabrication, source/synthesis separation, decision/check gates, language fidelity. |
| Behavioral parity | 15 | 0-100 | Tool-using skills preserve expected files, gates, and JSON/YAML surfaces in fixture output. Redistribute to clarity and self-sufficiency when no tool is involved. |
| Length within budget | 10 | 0 or 100 | Main `SKILL.md` is 60-250 lines, unless a router/meta skill has a documented reason. |

## Required Findings Format

```json
{
  "score": 0,
  "threshold": 90,
  "decision": "keep|revise|escalate",
  "breakdown": {
    "task_clarity": 0,
    "self_sufficiency": 0,
    "examples": 0,
    "output_format": 0,
    "critical_points": 0,
    "behavioral_parity": 0,
    "length_within_budget": 0
  },
  "defects": [
    {
      "severity": "blocker|major|minor",
      "evidence": "quote or precise reference",
      "impact": "why this hurts execution",
      "fix": "actionable change"
    }
  ],
  "notes": []
}
```

## Automatic Blockers

- Fabricates keyword volume, backlinks, credentials, awards, clients, or proof.
- Allows an authorial brain page to change without a source-backed `tipo: decisao` entry in `project/brain/log.md`.
- Stores drafts or hypotheses in `project/brain/`.
- Tells a nontechnical user to run terminal commands as the primary decision or sensitive-input flow.
- Strips accents from pt-BR human-facing prose.
- Requires shared references for normal execution.
