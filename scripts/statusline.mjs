#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

function parseJson(text) {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function dataDir() {
  return process.env.AGENTIC_SEO_PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA || "";
}

function candidateMarkers() {
  const explicit = dataDir();
  if (explicit) return [join(explicit, "session-status.json")];
  const dataRoot = join(homedir(), ".claude", "plugins", "data");
  if (!existsSync(dataRoot)) return [join(dataRoot, "agentic-seo", "session-status.json")];
  return readdirSync(dataRoot)
    .filter((name) => name.startsWith("agentic-seo"))
    .map((name) => join(dataRoot, name, "session-status.json"))
    .filter((file) => existsSync(file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function projectName(input) {
  const dir = input.workspace?.project_dir || input.workspace?.current_dir || input.cwd || process.cwd();
  return basename(dir) || "projeto";
}

function loaded() {
  for (const file of candidateMarkers()) {
    try {
      if (JSON.parse(readFileSync(file, "utf8")).loaded === true) return true;
    } catch {
      continue;
    }
  }
  return false;
}

const input = parseJson(await readStdin());
const state = loaded() ? "carregado" : "não carregado";
process.stdout.write(`Agentic SEO: ${state} | ${projectName(input)}\n`);
