# Fixture: content SEO review gate

Run the `check` phase for an existing draft at `project/artifacts/contents/seo-agentico/draft.md` in pt-BR.

Available context:

- Project language: `pt-BR`.
- Keyword: `seo agêntico`.
- `project/brain/voice.md` is filled with 3 principles.
- `project/brain/review.md` is filled with: 3 items under `Princípios de revisão deste projeto`, 4 items under `Checklist estilística do projeto`, and 2 rows under `Erros comuns observados` (each with an `[[log#...]]` origin wikilink).
- The draft body contains one explicit violation: it uses the phrase "vamos entender neste artigo" in the opening paragraph (matches both the universal anti-Conversion-explainer rule and one project-specific principle).
- The draft body also contains a recurring use of the term "robusto" not yet listed in `Evitar > IA-slop`. This is the first time the agent observes it in this project; in the prior draft (`project/artifacts/contents/outra-pauta/draft.md`) the same term appeared.

Expected output for the `check` phase:

- `checks.yaml > review.page_present: true`.
- `checks.yaml > review.review_backed: true`.
- `principles_checked`, `checklist_checked`, and `erros_comuns_checked` each list the items applied (9 total).
- `failures` includes one entry pointing at the "vamos entender neste artigo" violation, with `evidence` quoting the offending sentence and `severity: blocking` or `severity: high` per the project rule.
- `new_patterns_observed` includes one entry of `kind: stylistic_minor` proposing to add "robusto" to `Evitar > IA-slop`. The entry has `applied: true` and `log_entry` referencing the `type: decision` appended to `project/brain/log.md` with `approver: agent`.
- `project/brain/review.md` was edited: the new term "robusto" appears under `Evitar > IA-slop` after the existing terms.
- The Output Format YAML reports `brain_overlay.review_backed: true`, `brain_state.review: filled`, and no `bypasses[].gate: review` entry.
- `status: blocked` because of the unresolved failure; the draft is not promoted to `project/contents/`.

Constraints:

- The auto-applied edit to `review.md` must include the matching `type: decision` entry in `project/brain/log.md` with `scope: brain/review.md`, `decision: adicionar "robusto" à seção Evitar > IA-slop`, `evidence: project/artifacts/contents/seo-agentico/checks.yaml`, `approver: agent`.
- The agent must not silently delete the failing sentence from the draft; the draft stays as-is and the failure is reported.
- A failure on a universal rule overrides a passing project-specific item; record both signals separately in `review.failures`.
- Preserve all pt-BR accents in the recorded items and log entries.
