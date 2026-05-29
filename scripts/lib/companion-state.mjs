import { homedir } from "node:os";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  chmodSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

export const PATHS = {
  root: ROOT,
  companionDir: join(ROOT, ".companion"),
  handoffsDir: join(ROOT, ".companion", "handoffs"),
  identityFile: join(ROOT, ".companion", "identity.json"),
  sessionFile: join(ROOT, ".companion", "session.json"),
  templatesDir: join(ROOT, "templates", "companion"),
  homeDir: join(homedir(), ".agentic-seo"),
  homeCredentials: join(homedir(), ".agentic-seo", "credentials.json"),
};

export function ensureDirs() {
  for (const dir of [PATHS.companionDir, PATHS.handoffsDir, PATHS.homeDir]) {
    mkdirSync(dir, { recursive: true });
  }
}

export function newHandoffId() {
  return randomBytes(8).toString("hex");
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function readIdentity() {
  if (!existsSync(PATHS.identityFile)) return null;
  try {
    return JSON.parse(readFileSync(PATHS.identityFile, "utf8"));
  } catch {
    return null;
  }
}

export function writeIdentity(name) {
  ensureDirs();
  const data = { name, set_at: new Date().toISOString() };
  writeFileSync(PATHS.identityFile, JSON.stringify(data, null, 2));
  return data;
}

export function writeHandoffResult(id, payload) {
  ensureDirs();
  const path = join(PATHS.handoffsDir, `${id}.result.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2));
  return path;
}

export function maskSecret(value, visible = 4) {
  if (!value) return "";
  if (value.length <= visible) return "*".repeat(value.length);
  return "*".repeat(value.length - visible) + value.slice(-visible);
}

export function homeRelativePath(absolute) {
  const home = homedir();
  return absolute.startsWith(home) ? "~" + absolute.slice(home.length) : absolute;
}

export function readHomeCredentials() {
  if (!existsSync(PATHS.homeCredentials)) return null;
  try {
    return JSON.parse(readFileSync(PATHS.homeCredentials, "utf8"));
  } catch {
    return null;
  }
}

export function readSessionPort() {
  if (!existsSync(PATHS.sessionFile)) return 0;
  try {
    const data = JSON.parse(readFileSync(PATHS.sessionFile, "utf8"));
    return Number.isInteger(data?.port) && data.port > 0 ? data.port : 0;
  } catch {
    return 0;
  }
}

export function writeSessionPort(port) {
  ensureDirs();
  writeFileSync(
    PATHS.sessionFile,
    JSON.stringify({ port, updated_at: new Date().toISOString() }, null, 2),
  );
}

export function writeHomeCredentials(payload) {
  ensureDirs();
  writeFileSync(PATHS.homeCredentials, JSON.stringify(payload, null, 2));
  chmodSync(PATHS.homeCredentials, 0o600);
  return PATHS.homeCredentials;
}

const PID_SUFFIX = ".pid.json";

function pidFilePath(id) {
  return join(PATHS.handoffsDir, `${id}${PID_SUFFIX}`);
}

// Persist the live server process metadata so a detached Companion can be
// reattached or stopped later, even after the launching process is gone.
// The token lands on disk here, so the file is chmod 600 (like credentials)
// and lives in the gitignored .companion/handoffs/ directory.
export function writePidFile(id, { pid, port, token, started_at } = {}) {
  ensureDirs();
  const path = pidFilePath(id);
  const data = {
    id,
    pid,
    port,
    token,
    started_at: started_at || new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(data, null, 2));
  try {
    chmodSync(path, 0o600);
  } catch {}
  return path;
}

export function readPidFile(id) {
  const path = pidFilePath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function removePidFile(id) {
  const path = pidFilePath(id);
  try {
    rmSync(path, { force: true });
  } catch {}
  return path;
}

export function listPidFiles() {
  if (!existsSync(PATHS.handoffsDir)) return [];
  let entries;
  try {
    entries = readdirSync(PATHS.handoffsDir);
  } catch {
    return [];
  }
  const out = [];
  for (const name of entries) {
    if (!name.endsWith(PID_SUFFIX)) continue;
    const id = name.slice(0, -PID_SUFFIX.length);
    const data = readPidFile(id);
    if (data) out.push(data);
  }
  return out;
}
