#!/usr/bin/env node
import { runCollectEnv } from "./lib/companion-types/collect-env.mjs";
import { runApprovePage } from "./lib/companion-types/approve-page.mjs";
import { runPickCluster } from "./lib/companion-types/pick-cluster.mjs";
import { runReviewChanges } from "./lib/companion-types/review-changes.mjs";

const HANDOFFS = {
  "collect-env": runCollectEnv,
  "approve-page": runApprovePage,
  "pick-cluster": runPickCluster,
  "review-changes": runReviewChanges,
};

async function main() {
  const [, , type, ...rest] = process.argv;
  if (!type || type === "--help" || type === "-h") {
    process.stdout.write(
      `Usage: node scripts/companion.mjs <handoff-type> [args]\n\nAvailable handoffs:\n  ${Object.keys(HANDOFFS).join("\n  ")}\n`,
    );
    process.exit(type ? 0 : 2);
  }
  const handler = HANDOFFS[type];
  if (!handler) {
    process.stderr.write(`Unknown handoff: ${type}. Available: ${Object.keys(HANDOFFS).join(", ")}\n`);
    process.exit(2);
  }
  const result = await handler(rest);
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(result && result.ok === false ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
