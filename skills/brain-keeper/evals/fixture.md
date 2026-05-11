# Fixture: brain-keeper source ingestion + proposed strategic change

Ingest a new source file `project/sources/manual/founder-interview.md`.

The source claims the founder should be positioned as a recognized SEO expert. `brain/identidade.md` does not currently carry that claim, and there is no public proof (awards, clients, citations) registered yet.

Expected output:

- Source captured in `project/sources/manual/founder-interview.md` (untouched if already there).
- Log entry `tipo: ingestao` with `aprovador: agent` referencing the source.
- Log entry `tipo: decisao` with `aprovador: agent`, recording the addition of the expert positioning to `identidade.md`, citing the source as evidence and naming the missing public proof as a gap.
- Change note written to `project/workbench/brain-keeper/identidade-proposal.md`.
- `brain/identidade.md` updated only with the sourced claim and visible limitation.
- Lint entry if any wikilink fails to resolve or any pt-BR accent is missing.

Constraints:

- Do not modify the raw source.
- Do not promote the strategic claim into `identidade.md` without a source-backed decision log.
- Wikilinks only for real files in `brain/`; Markdown links for `../sources/...`.
- Preserve pt-BR accents in any prose written.
