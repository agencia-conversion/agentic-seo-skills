#!/usr/bin/env node

// DEPRECATION: the legacy 127.0.0.1 HTTP handoffs dispatched here are migrating to
// the Web Companion surface. `collect-env` is superseded by the Web Companion
// credentials surface (Settings → Credenciais); `approve-cluster` and
// `dataforseo-bypass` also move to the Companion. `approve-briefing`,
// `approve-page`, `review-changes`, and `pick-cluster` remain behind a flag with a
// documented migration plan (see docs/web-companion.md). Kept for compatibility:
// do NOT delete, other flows still reference these handoffs.

// NOTE on TTL: companion-server.mjs resolves AGENTIC_SEO_HANDOFF_TTL_MS into a
// module-level constant (TTL_MS) at import time. To give the collect-env handoff
// a more generous timeout (the user needs time to find and type a login + secret)
// WITHOUT affecting the other handoffs, we must set the env var BEFORE that module
// is loaded. The handoff modules statically import companion-server.mjs, so we use
// DYNAMIC import() inside main() and apply the collect-env default first. An
// explicit value provided by the user is always respected.

const COLLECT_ENV_DEFAULT_TTL_MS = "600000"; // ~10 min, collect-env only.

const HANDOFF_LOADERS = {
  "collect-env": () => import("./lib/companion-types/collect-env.mjs").then((m) => m.runCollectEnv),
  "approve-page": () => import("./lib/companion-types/approve-page.mjs").then((m) => m.runApprovePage),
  "approve-briefing": () =>
    import("./lib/companion-types/approve-briefing.mjs").then((m) => m.runApproveBriefing),
  "dataforseo-bypass": () =>
    import("./lib/companion-types/dataforseo-bypass.mjs").then((m) => m.runDataforseoBypass),
  "pick-cluster": () => import("./lib/companion-types/pick-cluster.mjs").then((m) => m.runPickCluster),
  "approve-cluster": () =>
    import("./lib/companion-types/approve-cluster.mjs").then((m) => m.runApproveCluster),
  "review-changes": () =>
    import("./lib/companion-types/review-changes.mjs").then((m) => m.runReviewChanges),
  "project-browser": () => import("./lib/project-browser-server.mjs").then((m) => m.runProjectBrowser),
};

async function main() {
  const [, , type, ...rest] = process.argv;
  if (!type || type === "--help" || type === "-h") {
    process.stdout.write(
      `Usage: node scripts/companion.mjs <handoff-type> [args]\n\nAvailable handoffs:\n  ${Object.keys(HANDOFF_LOADERS).join("\n  ")}\n`,
    );
    process.exit(type ? 0 : 2);
  }
  const loader = HANDOFF_LOADERS[type];
  if (!loader) {
    process.stderr.write(
      `Unknown handoff: ${type}. Available: ${Object.keys(HANDOFF_LOADERS).join(", ")}\n`,
    );
    process.exit(2);
  }

  // Apply the generous collect-env TTL default before companion-server.mjs is
  // loaded by the dynamic import below. Only sets a default; never overrides an
  // explicit user value, and never touches the TTL of the other handoffs.
  if (type === "collect-env" && !process.env.AGENTIC_SEO_HANDOFF_TTL_MS) {
    process.env.AGENTIC_SEO_HANDOFF_TTL_MS = COLLECT_ENV_DEFAULT_TTL_MS;
  }

  const handler = await loader();
  const result = await handler(rest);
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(result && result.ok === false ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
