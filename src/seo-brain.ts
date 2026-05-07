#!/usr/bin/env node

export * from "./commands/runtime";
import { runCli } from "./commands/runtime";

if (require.main === module) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
