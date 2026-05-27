// Append an audit decision entry to brain/log.md when changes were applied.
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function appendAuditEntry(ctx, summary) {
  const path = join(ctx.root, "brain", "log.md");
  if (!existsSync(path)) return;
  const today = new Date().toISOString().slice(0, 10);
  const entry = `
## ${today} - English schema migration

- type: decision
- scope: project/
- decision: Migrated legacy Portuguese schema to English-first.
  Renamed: ${summary.renamed} files. Rewrote: ${summary.rewritten} files. Plus full cluster.yaml + frontmatter + log.md migration.
- evidence: scripts/migrate-project-to-english.mjs
- approver: agent
- notes: idempotent. Re-running this script reports noop.
`;
  appendFileSync(path, entry, "utf8");
}
