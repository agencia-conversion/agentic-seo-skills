# Fixture: port a provider CLI

Port `dataforseo.js` from the vetted upstream `marketingskills` tools into Agentic SEO's `tools/clis/` structure.
Produce:

- A tool design note with commands, inputs, credential sources, and JSON output contracts.
- Attribution entries for `THIRD_PARTY_NOTICES.md` and `tools/ATTRIBUTIONS.md`.
- A fixture test plan for offline mode, credential status, SERP normalization, keyword volume, and backlinks.

Constraints:

- Do not commit secrets.
- Keep the CLI executable with `node tools/clis/dataforseo.js <subcommand>`.
- Do not make the tool depend on skill prose.
- Record SPDX, upstream commit, source path, destination path, author, and local changes.
