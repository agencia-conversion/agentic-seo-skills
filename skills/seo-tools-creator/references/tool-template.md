#!/usr/bin/env node
/* SPDX-License-Identifier: MIT */

const COMMANDS = {
  async help() {},
  async status() {},
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) args._.push(token);
    else args[token.slice(2).replaceAll("-", "_")] = argv[i + 1]?.startsWith("--") ? true : argv[++i] ?? true;
  }
  return args;
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  if (!COMMANDS[command]) throw new Error(`Unknown command: ${command}`);
  await COMMANDS[command](parseArgs(rest));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
