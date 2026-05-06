# Skill-eval fixtures

This template seeds a `skill-eval` mode run. The `autoresearch` skill iterates a target SKILL.md as if each variation were the new skill body, evaluating it against the inputs below.

## Target

- `target_skill`: path to the SKILL.md being iterated, e.g. `skills/keyword-research/SKILL.md`.
- `fixtures_dir`: directory containing one fixture per file. Each fixture is a realistic input the skill would receive (a project brief, a prompt, a JSON payload, etc).

## Suggested layout

```
fixtures/
  fixture-1.md        # input the skill would receive
  fixture-2.md
  fixture-3.md
expectations/         # optional; one per fixture
  fixture-1.md        # what a passing answer looks like (for the judge)
  fixture-2.md
  fixture-3.md
```

## Suggested metrics for skill-eval

```json
{
  "metrics": [
    {
      "id": "follows-contract",
      "type": "judge",
      "source": "the candidate SKILL.md preserves the original Contract section unchanged or with strict supersets",
      "weight": 2,
      "scoring": "0_to_100"
    },
    {
      "id": "fixture-pass-rate",
      "type": "judge",
      "source": "fraction of fixtures where the candidate skill produces output matching the expectation",
      "weight": 3,
      "scoring": "0_to_100"
    },
    {
      "id": "size-budget",
      "type": "executable",
      "source": "candidate SKILL.md line count <= 100",
      "weight": 1,
      "scoring": "binary"
    }
  ],
  "aggregation": "weighted_mean",
  "scale": "0_to_100"
}
```

## Loop semantics in skill-eval (v1)

For each iteration the agent:

1. Reads the candidate SKILL.md text from `iter-N.md`.
2. For every fixture in `fixtures_dir`, simulates the skill inline: treats the candidate text as a prompt-supplement and answers the fixture as the skill would.
3. Judges each simulated output against the expectation (or against the rubric prose if no expectation file exists), collapsing fixture-level scores into a single `fixture-pass-rate` value.
4. Records the iteration via `record --run <id> --variation iter-N.md ...`.

v2 (out of scope): subprocess `claude --plugin-dir . -p "<fixture>"` with the candidate skill installed in a scratch directory. Adds real isolation and removes the simulation gap.
