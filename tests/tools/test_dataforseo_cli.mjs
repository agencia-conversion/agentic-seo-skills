import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const cli = resolve(root, "tools", "clis", "dataforseo.js");
const home = join(tmpdir(), `agentic-seo-tools-home-${process.pid}`);

function run(args, env = {}) {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HOME: home, DATAFORSEO_LOGIN: "", DATAFORSEO_PASSWORD: "", ...env },
  }));
}

try {
  const help = run(["help"]);
  assert.equal(help.ok, true);
  assert.equal(help.provider, "dataforseo");
  assert.ok(help.commands.serp.includes("serp google"));

  const missing = run(["status"]);
  assert.equal(missing.credentials.configured, false);
  assert.equal(missing.credentials.login_present, false);

  mkdirSync(join(home, ".agentic-seo"), { recursive: true });
  writeFileSync(join(home, ".agentic-seo", "credentials.json"), JSON.stringify({
    dataforseo_login: "user@example.com",
    dataforseo_password: "secret-password",
  }));
  const status = run(["status"]);
  assert.equal(status.credentials.configured, true);
  assert.equal(status.credentials.source, "~/.agentic-seo/credentials.json");

  const serp = run(["serp", "google", "--keyword", "seo agêntico", "--location", "Brazil", "--language", "Portuguese", "--offline"]);
  assert.equal(serp.mode, "offline");
  assert.equal(serp.result.tasks[0].result[0].keyword, "seo agêntico");
  assert.equal(serp.result.tasks[0].result[0].items.length, 0);

  const volume = run(["keywords", "volume", "--keywords", "seo agêntico,seo com agentes", "--offline"]);
  assert.equal(volume.result.tasks[0].result.length, 2);
  assert.equal(volume.result.tasks[0].result[0].search_volume, null);

  const dry = run(["backlinks", "summary", "--target", "example.com", "--dry-run"]);
  assert.equal(dry.mode, "dry-run");
  assert.equal(dry.result.headers.Authorization, "***");
  assert.doesNotMatch(JSON.stringify(dry), /secret-password/);

  const failed = spawnSync(process.execPath, [cli, "keywords", "volume"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HOME: home, DATAFORSEO_LOGIN: "", DATAFORSEO_PASSWORD: "" },
  });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /--keywords required/);
} finally {
  rmSync(home, { recursive: true, force: true });
}

console.log("dataforseo tool cli ok");
