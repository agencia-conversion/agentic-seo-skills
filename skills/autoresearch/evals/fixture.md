# Fixture: evaluate a skill improvement loop

Set up an Autoresearch-style run for improving the `technical-seo` skill.

The run should define a baseline, metrics, stop rule, and keep/reject criteria. The target improvement is clearer guidance for page-type aliases without changing deterministic audit scores.

Expected output:

- A run plan with hypothesis, editable surface, immutable surface, metrics, and stop rule.
- One proposed iteration record.
- A final decision format for keep/reject.

Constraints:

- Do not modify unrelated skills.
- Do not lower approval gates.
- Keep generated run notes under `.context/skill-evals/`.
