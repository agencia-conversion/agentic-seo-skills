---
title: "Log"
updated: "<YYYY-MM-DD>"
---

# Log

<!--
Append-only. Never rewrite previous entries; correct with a new entry
`type: erratum` referencing the previous entry by date and title.

Entry format (contract_version 2; see docs/specs/en-rename-map.md):

## YYYY-MM-DD - <short title>

- type: approval | decision | erratum | lint | ingestion | publication | proof
- scope: <affected file(s) | editorial area | cluster | source>
- decision: <what changed or was decided>
- evidence: <wikilinks, ../sources/..., urls>
- approver: <human name | agent>
- approved_at: <YYYY-MM-DD optional, for legacy approval entries>
- notes: <optional>

Types:
- approval: legacy value for old approvals; new authorial changes
  should use `type: decision` with recorded evidence and actor.
- decision: operational change recorded (stack choice, configuration,
  process, non-strategic route change).
- erratum: correction of a previous entry. References the original entry.
- lint: result of automatic check (broken links, contradictions, missing
  sources).
- ingestion: cataloging of a new source in ../sources/.
- publication: registration of content published in ../content/.
- proof: E-E-A-T evidence (case, credential, citation, data) that
  reinforces an editorial area or specific claim.
-->
