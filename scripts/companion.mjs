#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runCollectEnv } from "./lib/companion-types/collect-env.mjs";
import { runApprovePage } from "./lib/companion-types/approve-page.mjs";
import { runApproveBriefing } from "./lib/companion-types/approve-briefing.mjs";
import { runDataforseoBypass } from "./lib/companion-types/dataforseo-bypass.mjs";
import { runPickCluster } from "./lib/companion-types/pick-cluster.mjs";
import { runReviewChanges } from "./lib/companion-types/review-changes.mjs";
import { runProjectBrowser } from "./lib/companion-types/project-browser.mjs";
import { readPidFile, removePidFile, listPidFiles } from "./lib/companion-state.mjs";

const HANDOFFS = {
  "collect-env": runCollectEnv,
  "approve-page": runApprovePage,
  "approve-briefing": runApproveBriefing,
  "dataforseo-bypass": runDataforseoBypass,
  "pick-cluster": runPickCluster,
  "review-changes": runReviewChanges,
  "project-browser": runProjectBrowser,
};

// Handoffs that launch a long-lived server the human interacts with. These
// default to detached mode so the server survives the caller (e.g. the
// agent's Bash call being killed at its timeout). Opt out with --foreground.
const DETACHED_DEFAULT = new Set(["project-browser"]);

const SELF = fileURLToPath(import.meta.url);

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function flagValue(argv, name) {
  const idx = argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  return next && !next.startsWith("--") ? next : true;
}

function stripFlags(argv, names) {
  const drop = new Set(names);
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--") && drop.has(arg.slice(2))) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) i++; // skip the flag's value too
      continue;
    }
    out.push(arg);
  }
  return out;
}

function stopServer(id) {
  const data = readPidFile(id);
  if (!data || !data.pid) {
    removePidFile(id);
    return { id, stopped: false, reason: "not-found" };
  }
  let signaled = false;
  try {
    process.kill(data.pid, "SIGTERM");
    signaled = true;
  } catch (err) {
    // ESRCH: process already gone — treat as stopped.
    signaled = err.code === "ESRCH";
  }
  removePidFile(id);
  return { id, pid: data.pid, stopped: signaled };
}

function handleStop(argv) {
  if (hasFlag(argv, "stop-all")) {
    const results = listPidFiles().map((entry) => stopServer(entry.id));
    process.stdout.write(JSON.stringify({ ok: true, stopped: results }) + "\n");
    process.exit(0);
  }
  const id = flagValue(argv, "stop");
  if (typeof id !== "string" || !id) {
    process.stderr.write("--stop requires a handoff id (or use --stop-all)\n");
    process.exit(2);
  }
  const result = stopServer(id);
  process.stdout.write(JSON.stringify({ ok: true, ...result }) + "\n");
  process.exit(0);
}

// Detached launch: spawn ourselves in --serve mode (which runs the handler in
// a persistent child), read exactly the first status line the child emits on
// listen, relay it to our stdout, then unref and exit 0. The child keeps the
// http server alive until submit/cancel/TTL.
function launchDetached(type, rest) {
  const child = spawn(process.execPath, [SELF, type, "--serve", ...rest], {
    detached: true,
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, AGENTIC_SEO_HANDOFF_EMIT_STATUS: "1" },
  });

  let buffer = "";
  let relayed = false;

  const onData = (chunk) => {
    buffer += chunk.toString("utf8");
    const nl = buffer.indexOf("\n");
    if (nl === -1) return;
    const line = buffer.slice(0, nl);
    relayed = true;
    child.stdout.removeListener("data", onData);
    process.stdout.write(line + "\n");
    child.unref();
    process.exit(0);
  };

  child.stdout.on("data", onData);

  child.on("error", (err) => {
    process.stderr.write(`failed to launch detached server: ${err.message}\n`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (relayed) return;
    process.stderr.write(`detached server exited before emitting status (code ${code})\n`);
    process.exit(1);
  });
}

async function runForeground(handler, rest) {
  const result = await handler(rest);
  // In --serve mode the child already emitted the status line on listen; the
  // final result is persisted to the handoff result file, not stdout, to
  // avoid corrupting the single-line status contract.
  if (!rest.includes("--serve")) {
    process.stdout.write(JSON.stringify(result) + "\n");
  }
  process.exit(result && result.ok === false ? 1 : 0);
}

async function main() {
  const [, , type, ...rawRest] = process.argv;

  if (!type || type === "--help" || type === "-h") {
    process.stdout.write(
      `Usage: node scripts/companion.mjs <handoff-type> [args]\n\n` +
        `Available handoffs:\n  ${Object.keys(HANDOFFS).join("\n  ")}\n\n` +
        `Lifecycle flags (project-browser):\n` +
        `  --foreground       run server in the foreground (block until done)\n` +
        `  --stop <id>        stop a detached server by handoff id\n` +
        `  --stop-all         stop every detached server\n`,
    );
    process.exit(type ? 0 : 2);
  }

  const handler = HANDOFFS[type];
  if (!handler) {
    process.stderr.write(`Unknown handoff: ${type}. Available: ${Object.keys(HANDOFFS).join(", ")}\n`);
    process.exit(2);
  }

  // Stop subcommands operate on PID files and never start a server.
  if (hasFlag(rawRest, "stop") || hasFlag(rawRest, "stop-all")) {
    handleStop(rawRest);
    return;
  }

  const isServeChild = hasFlag(rawRest, "serve");
  const wantsForeground = hasFlag(rawRest, "foreground");
  const detachedByDefault = DETACHED_DEFAULT.has(type);
  // Decide whether to detach. The --serve child must always run in foreground.
  const shouldDetach = !isServeChild && detachedByDefault && !wantsForeground;

  if (shouldDetach) {
    // Pass through every arg except our launcher-only flags.
    const rest = stripFlags(rawRest, ["foreground"]);
    launchDetached(type, rest);
    return;
  }

  // Foreground path (covers all legacy handoffs and the --serve child).
  const rest = stripFlags(rawRest, ["foreground"]);
  await runForeground(handler, rest);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
