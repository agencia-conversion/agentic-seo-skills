#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const statuslineScript = join(root, "scripts", "statusline.mjs");

function argMode() {
  if (process.argv.includes("--apply")) return "apply";
  if (process.argv.includes("--dry-run")) return "dry-run";
  return "dry-run";
}

function settingsPath() {
  return process.env.SEO_BRAIN_CLAUDE_SETTINGS || join(homedir(), ".claude", "settings.json");
}

function wrapperDir() {
  return process.env.SEO_BRAIN_STATUSLINE_DIR || join(homedir(), ".claude", "seo-brain");
}

function readSettings(file) {
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}

function shQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function wrapperText(oldCommand) {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA || process.env.SEO_BRAIN_PLUGIN_DATA || "";
  return `#!/usr/bin/env bash
set -euo pipefail
input="$(cat)"
old_output=""
if [[ -n ${shQuote(oldCommand || "")} ]]; then
  old_output="$(printf '%s' "$input" | eval ${shQuote(oldCommand)} 2>/dev/null || true)"
fi
seo_output="$(printf '%s' "$input" | SEO_BRAIN_PLUGIN_DATA=${shQuote(pluginData)} node ${shQuote(statuslineScript)} 2>/dev/null || true)"
old_output="\${old_output%%$'\\n'*}"
seo_output="\${seo_output%%$'\\n'*}"
if [[ -n "$old_output" && -n "$seo_output" ]]; then
  printf '%s | %s\\n' "$old_output" "$seo_output"
elif [[ -n "$old_output" ]]; then
  printf '%s\\n' "$old_output"
else
  printf '%s\\n' "$seo_output"
fi
`;
}

function plan(settings) {
  const dir = wrapperDir();
  const wrapper = join(dir, "statusline-wrapper.sh");
  const existing = settings.statusLine?.type === "command" ? settings.statusLine.command : "";
  const already = existing === wrapper;
  return {
    wrapper,
    already,
    existingCommand: already ? "" : existing || "",
    next: {
      ...settings,
      statusLine: {
        ...(settings.statusLine || {}),
        type: "command",
        command: wrapper,
      },
    },
  };
}

const mode = argMode();
const file = settingsPath();
const settings = readSettings(file);
const change = plan(settings);

if (mode === "apply") {
  mkdirSync(dirname(file), { recursive: true });
  mkdirSync(dirname(change.wrapper), { recursive: true });
  if (!change.already || !existsSync(change.wrapper)) {
    writeFileSync(change.wrapper, wrapperText(change.existingCommand), "utf8");
    chmodSync(change.wrapper, 0o755);
  }
  writeFileSync(file, `${JSON.stringify(change.next, null, 2)}\n`, "utf8");
}

process.stdout.write(
  JSON.stringify({
    mode,
    settings: file,
    wrapper: change.wrapper,
    already_installed: change.already,
    preserved_existing: Boolean(change.existingCommand),
    command: change.next.statusLine.command,
  }, null, 2) + "\n",
);
