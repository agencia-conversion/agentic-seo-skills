import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  PATHS,
  newToken,
  writeHandoffResult,
  readSessionPort,
  writeSessionPort,
  writePidFile,
  removePidFile,
} from "./companion-state.mjs";

const DEFAULT_TTL_MS = 120_000;
const ENV_TTL_MS = Number(process.env.AGENTIC_SEO_HANDOFF_TTL_MS) || 0;
const MAX_BODY = 1024 * 1024;

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { ...HEADERS, "Content-Type": type });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY) reject(new Error("body-too-large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function openBrowser(url) {
  if (process.env.AGENTIC_SEO_NO_BROWSER === "1") return;
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
}

function injectContext(html, contextData) {
  const safe = JSON.stringify(contextData).replace(/</g, "\\u003c");
  return html.replace("<!--CONTEXT-->", `<script>window.__CONTEXT__=${safe};</script>`);
}

export function runHandoff({
  id,
  templateName,
  contextData,
  onSubmit,
  extraTabs = [],
  ttlMs,
  emitStatus = false,
}) {
  return new Promise((resolve) => {
    const token = newToken();
    const tokenPath = `/handoff/${token}`;
    const tabRoutes = new Map(extraTabs.map((tab) => [tab.path, tab.template]));
    // TTL precedence: env override (operator escape hatch) > per-handoff opt > default.
    const effectiveTtl = ENV_TTL_MS || Number(ttlMs) || DEFAULT_TTL_MS;
    // Status emission is for the detached child only: the parent sets
    // AGENTIC_SEO_HANDOFF_EMIT_STATUS=1 when it spawns the --serve child. A
    // caller may also force it via opts.emitStatus.
    const detachedMode = process.env.AGENTIC_SEO_HANDOFF_EMIT_STATUS === "1";
    const shouldEmitStatus = emitStatus || detachedMode;
    let port = 0;
    let resolved = false;
    let timer;
    let pidWritten = false;

    const finish = (payload) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      writeHandoffResult(id, payload);
      if (pidWritten) removePidFile(id);
      try {
        server.close();
      } catch {}
      resolve(payload);
    };

    const checkOrigin = (req) => {
      const expectedHost = `127.0.0.1:${port}`;
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (host !== expectedHost) return false;
      if (origin && origin !== `http://${expectedHost}`) return false;
      return true;
    };

    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        if (!url.pathname.startsWith(tokenPath)) return send(res, 404, "not found");
        if (!checkOrigin(req)) return send(res, 403, "forbidden");
        const sub = url.pathname.slice(tokenPath.length);
        if (req.method === "GET" && (sub === "" || sub === "/")) {
          const html = readFileSync(join(PATHS.templatesDir, templateName), "utf8");
          return send(res, 200, injectContext(html, contextData), "text/html; charset=utf-8");
        }
        if (req.method === "GET" && tabRoutes.has(sub)) {
          const html = readFileSync(join(PATHS.templatesDir, tabRoutes.get(sub)), "utf8");
          return send(res, 200, injectContext(html, contextData), "text/html; charset=utf-8");
        }
        if (req.method === "POST" && sub === "/submit") {
          const body = JSON.parse(await readBody(req));
          const result = await onSubmit(body);
          sendJson(res, 200, result);
          if (result.ok !== false) finish(result);
          return;
        }
        if (req.method === "POST" && sub === "/cancel") {
          sendJson(res, 200, { ok: true });
          return finish({ ok: false, reason: "cancelled" });
        }
        return send(res, 404, "not found");
      } catch (err) {
        sendJson(res, 500, { ok: false, reason: "internal-error", message: err.message });
      }
    });

    timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), effectiveTtl);

    const onListen = () => {
      port = server.address().port;
      writeSessionPort(port);
      const base = `http://127.0.0.1:${port}${tokenPath}`;
      if (process.env.AGENTIC_SEO_PRINT_HANDOFF_URL === "1") {
        process.stderr.write(`[companion] ${base}\n`);
        for (const tab of extraTabs) {
          process.stderr.write(`[companion-tab] ${base}${tab.path}\n`);
        }
      }
      // Persist the live server metadata so a detached server can be
      // stopped/reattached later, independent of the launching process.
      writePidFile(id, { pid: process.pid, port, token });
      pidWritten = true;
      // In detached/status mode the parent reads exactly one JSON line from
      // the child's stdout, then unrefs and exits. Always terminate with a
      // newline and flush synchronously so the parent never deadlocks.
      if (shouldEmitStatus) {
        const status = {
          ok: true,
          detached: detachedMode,
          url: base,
          port,
          token,
          pid: process.pid,
          id,
          pidFile: `.companion/handoffs/${id}.pid.json`,
        };
        process.stdout.write(JSON.stringify(status) + "\n");
      }
      for (const tab of extraTabs) openBrowser(`${base}${tab.path}`);
      openBrowser(base);
    };

    const desired = readSessionPort();
    const onListenError = (err) => {
      if (err.code === "EADDRINUSE" && desired !== 0) {
        server.removeListener("error", onListenError);
        server.listen(0, "127.0.0.1", onListen);
      } else {
        finish({ ok: false, reason: "listen-error", message: err.message });
      }
    };
    server.once("error", onListenError);
    server.listen(desired, "127.0.0.1", onListen);
  });
}
