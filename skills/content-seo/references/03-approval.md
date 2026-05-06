# Approval

Approval separates human judgment from agent execution.

## Semantics

- Brief approval writes the artifact draft immediately in `project/artifacts/contents/<slug>/draft.md`.
- Brief approval does not publish content to the Wiki.
- Page approval unlocks promotion. It does not approve strategic Wiki context.
- Bypass approval is not content approval.

## Procedure

1. Show missing analysis, source gaps, unapproved voice context, and bypasses.
2. Present `brief.md` as the primary review artifact and recommend the local browser Companion for approval.
3. Record `approved_by`, `decided_at`, status, notes, and visible gaps.
4. If approved, generate the artifact draft and update `draft_status: draft`.
5. Stop before publication. A later check/review/promote phase must validate the draft.

## Reject approval if

- Provenance is missing and no bypass is recorded.
- Bypass lacks reason or consequence.
- Voice context is not approved and the user did not explicitly acknowledge it.
- `context_evidence` or `voice_evidence` is missing.
- A claimed Wiki page lacks path, status, or content hash.
- The outline capacity check cannot support the target word count.
- The briefing changed after the approval handoff opened.
