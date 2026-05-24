#!/usr/bin/env node
import * as path from "node:path";
import { reviewReportsInProject } from "./lib/report-contract.mjs";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const projectDir = path.resolve(args._[0] || args.project || process.env.AGENTIC_SEO_PROJECT_DIR || "project");
const result = reviewReportsInProject(projectDir, {
  moduleId: args.module,
  slug: args.slug,
  file: args.file,
  requireAllModules: args.allowMissingModules ? false : undefined,
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
