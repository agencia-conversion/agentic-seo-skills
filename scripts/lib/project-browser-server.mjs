import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { PATHS, newToken, readSession, readSessionPort, writeSessionPort } from "./companion-state.mjs";
import companionRoutes from "../../shared/companion-routes.js";

const { companionTargetForPath } = companionRoutes;

function openBrowser(url) {
  if (process.env.AGENTIC_SEO_NO_BROWSER === "1") return;
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

async function isCompanionReady(url, token, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base = String(url || "").replace(/\/project\/[^/]+\/?$/, "/");
    const res = await fetch(`${base}api/project/settings`, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "x-companion-token": token,
      },
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.ok === true && typeof data.projectRoot === "string";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function targetFor(url, openPath) {
  if (!openPath) {
    return {
      target_path: null,
      target_slug: null,
      target_url: url,
    };
  }
  const target = companionTargetForPath(openPath, url);
  return {
    target_path: openPath,
    target_slug: target.companion_slug,
    target_url: target.companion_url,
  };
}

export async function startProjectBrowser({ projectRoot = "project", open = true, dev = false, openPath = "", detach = false } = {}) {
  const root = resolve(projectRoot);
  const existing = readSession();
  if (existing?.port && existing?.token && (!existing.project_root || resolve(existing.project_root) === root)) {
    const existingUrl = `http://127.0.0.1:${existing.port}/project/${existing.token}/`;
    if (await isCompanionReady(existingUrl, existing.token)) {
      const target = targetFor(existingUrl, openPath);
      const payload = {
        ok: true,
        reused: true,
        url: existingUrl,
        ...target,
        port: existing.port,
        token: existing.token,
        project_root: root,
        mode: existing.mode || "unknown",
      };
      process.stdout.write(`${JSON.stringify(payload)}\n`);
      if (open) openBrowser(target.target_url || existingUrl);
      return payload;
    }
  }
  const token = newToken();
  const desired = readSessionPort();
  const port = await pickPort(desired);
  const url = `http://127.0.0.1:${port}/project/${token}/`;
  const target = targetFor(url, openPath);
  const ttlMs = Number(process.env.AGENTIC_SEO_COMPANION_TTL_MS || 4 * 60 * 60 * 1000);

  const useDevServer = dev || !hasProductionBuild();
  const child = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", useDevServer ? "dev" : "start", "--", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: companionDir(),
      env: {
        ...process.env,
        AGENTIC_SEO_PLUGIN_ROOT: PATHS.root,
        AGENTIC_SEO_PROJECT_ROOT: root,
        AGENTIC_SEO_COMPANION_TOKEN: token,
        SEO_BRAIN_PLUGIN_ROOT: PATHS.root,
        SEO_BRAIN_PROJECT_ROOT: root,
        SEO_BRAIN_COMPANION_TOKEN: token,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      detached: detach,
      stdio: detach ? ["ignore", "ignore", "ignore"] : ["ignore", "pipe", "pipe"],
    },
  );

  if (!detach) {
    child.stdout.on("data", (chunk) => process.stderr.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  }

  const stop = () => {
    if (child.exitCode === null) child.kill("SIGTERM");
  };
  const ttl = setTimeout(stop, ttlMs);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    await waitForReady(url, child);
    writeSessionPort(port, { token, project_root: root, mode: useDevServer ? "dev" : "production", pid: child.pid || null });
    const payload = {
      ok: true,
      url,
      ...target,
      port,
      token,
      project_root: root,
      mode: useDevServer ? "dev" : "production",
      detached: !!detach,
      pid: child.pid || null,
    };
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    process.stderr.write(`[project-browser] ${target.target_url || url} (${useDevServer ? "dev" : "production"})\n`);
    if (open) openBrowser(target.target_url || url);

    if (detach) {
      child.unref();
      clearTimeout(ttl);
      return payload;
    }

    return await new Promise((resolveResult) => {
      child.once("exit", (code, signal) => {
        clearTimeout(ttl);
        resolveResult({
          ok: code === 0 || signal === "SIGTERM",
          reason: signal ? `signal-${signal}` : code === 0 ? "closed" : "companion-exited",
          url,
          ...target,
          port,
          token,
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
  if (args.project) throw new Error("--project is no longer supported; Agentic SEO uses the single project at project/.");
  // Last-resort default targets the USER's working-directory project, never a
  // bare relative "project" that would resolve against whatever cwd the process
  // happens to run in (e.g. the plugin folder's in-repo example project after a
  // stray `cd`). INIT_CWD is the user's original launch cwd (set by npm/Claude
  // Code); fall back to process.cwd() when it is absent. The canonical CLI path
  // always passes --project-root, so this branch is only reached on raw launches.
  const projectRoot =
    args["project-root"] ??
    process.env.CLAUDE_PLUGIN_OPTION_project_dir ??
    process.env.AGENTIC_SEO_PROJECT_DIR ??
    join(process.env.INIT_CWD || process.cwd(), "project");
  const open = !args["no-open"];
  const openPath = args["open-path"] || args["target-path"] || "";
  // Detached by default: the Companion must survive the process that launched it
  // (e.g. an agent's Bash call killed at its ~120s timeout). Opt out with
  // --foreground (or --no-detach) for local debugging that blocks until exit.
  const detach = !args.foreground && !args["no-detach"];
  return startProjectBrowser({ projectRoot, open, dev: !!args.dev, openPath, detach });
}
