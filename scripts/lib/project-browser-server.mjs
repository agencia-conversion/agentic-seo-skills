import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { PATHS, newToken, readSessionPort, writeSessionPort } from "./companion-state.mjs";

function openBrowser(url) {
  if (process.env.SEO_BRAIN_NO_BROWSER === "1") return;
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function companionDir() {
  return join(PATHS.root, "apps", "companion");
}

function hasProductionBuild() {
  return existsSync(join(companionDir(), ".next", "BUILD_ID"));
}

function isPortFree(port) {
  return new Promise((resolveFree) => {
    const server = createServer();
    server.once("error", () => resolveFree(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolveFree(true));
    });
  });
}

function pickPort(preferred) {
  return new Promise((resolvePort) => {
    const finish = async (port) => {
      if (port && (await isPortFree(port))) return resolvePort(port);
      const server = createServer();
      server.listen(0, "127.0.0.1", () => {
        const picked = server.address().port;
        server.close(() => resolvePort(picked));
      });
    };
    finish(preferred || 0);
  });
}

async function waitForReady(url, child, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`companion exited with code ${child.exitCode}`);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("companion did not become ready in time");
}

export async function startProjectBrowser({ projectRoot = "project", open = true, dev = false } = {}) {
  const token = newToken();
  const desired = readSessionPort();
  const port = await pickPort(desired);
  const root = resolve(projectRoot);
  const url = `http://127.0.0.1:${port}/project/${token}/`;
  const ttlMs = Number(process.env.SEO_BRAIN_COMPANION_TTL_MS || 4 * 60 * 60 * 1000);

  const useDevServer = dev || !hasProductionBuild();
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", useDevServer ? "dev" : "start", "--", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: companionDir(),
      env: {
        ...process.env,
        SEO_BRAIN_PROJECT_ROOT: root,
        SEO_BRAIN_COMPANION_TOKEN: token,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => process.stderr.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const stop = () => {
    if (child.exitCode === null) child.kill("SIGTERM");
  };
  const ttl = setTimeout(stop, ttlMs);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    await waitForReady(url, child);
    writeSessionPort(port);
    process.stdout.write(`${JSON.stringify({ ok: true, url, project_root: root, mode: useDevServer ? "dev" : "production" })}\n`);
    process.stderr.write(`[project-browser] ${url} (${useDevServer ? "dev" : "production"})\n`);
    if (open) openBrowser(url);

    return await new Promise((resolveResult) => {
      child.once("exit", (code, signal) => {
        clearTimeout(ttl);
        resolveResult({
          ok: code === 0 || signal === "SIGTERM",
          reason: signal ? `signal-${signal}` : code === 0 ? "closed" : "companion-exited",
          url,
          project_root: root,
          mode: useDevServer ? "dev" : "production",
        });
      });
    });
  } catch (err) {
    clearTimeout(ttl);
    stop();
    return { ok: false, reason: "start-failed", message: err.message };
  }
}

export async function runProjectBrowser(argv = []) {
  const args = parseArgs(argv);
  if (args.project) throw new Error("--project is no longer supported; SEO Brain uses the single project at project/.");
  const projectRoot =
    args["project-root"] ??
    process.env.CLAUDE_PLUGIN_OPTION_project_dir ??
    process.env.SEO_BRAIN_PROJECT_DIR ??
    "project";
  const open = !args["no-open"];
  return startProjectBrowser({ projectRoot, open, dev: !!args.dev });
}
