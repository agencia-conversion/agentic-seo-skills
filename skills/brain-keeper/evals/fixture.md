# Fixture: wiki source maintenance

Ingest and reconcile a new source file `project/sources/manual/founder-interview.md`.

The source says Diego should be positioned as a recognized SEO Brain expert, but `wiki/eeat.md` currently has no public proof for awards or clients.

Expected output:

- Source catalog update for `wiki/fontes/index.md`.
- Proposed changes outside strategic pages unless approved.
- Contradiction/gap notes.
- Log entry with the right type.

Constraints:

- Do not modify raw source files.
- Do not promote strategic claims without approval.
- Use Obsidian wikilinks only for real wiki pages.
