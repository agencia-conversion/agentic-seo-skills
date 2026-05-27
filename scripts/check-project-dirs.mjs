#!/usr/bin/env node
// scripts/check-project-dirs.mjs — diagnose project directory conventions.
// Reports legacy/non-canonical layouts. Does not auto-rename anything.
// Exits 0 even when warnings exist; exits 1 only on hard errors (missing
// project root). Use --strict to make warnings exit 2.

import { existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

function parseArgs(argv) {
  const out = { root: 'project', strict: false, json: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--root=')) out.root = arg.slice('--root='.length);
    else if (arg === '--strict') out.strict = true;
    else if (arg === '--json') out.json = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/check-project-dirs.mjs [--root=project] [--strict] [--json]');
      process.exit(0);
    }
  }
  return out;
}

function isDir(p) {
  return existsSync(p) && statSync(p).isDirectory();
}

function detect(root) {
  const issues = [];
  const legacy = join(root, 'content');
  const canonical = join(root, 'contents');
  const hasLegacy = isDir(legacy);
  const hasCanonical = isDir(canonical);
  if (hasLegacy && !hasCanonical) {
    issues.push({
      code: 'legacy-content-dir',
      severity: 'error',
      message: 'project/content/ existe mas project/contents/ não. O Companion não vai listar conteúdos.',
      fix: `mv "${legacy}" "${canonical}"`,
    });
  } else if (hasLegacy && hasCanonical) {
    issues.push({
      code: 'content-and-contents-coexist',
      severity: 'warning',
      message: 'project/content/ e project/contents/ coexistem. Apenas project/contents/ é lido.',
      fix: `Mescle manualmente, então: rm -rf "${legacy}"`,
    });
  }
  return { root, hasLegacy, hasCanonical, issues };
}

const args = parseArgs(process.argv);
const root = resolve(process.cwd(), args.root);

if (!isDir(root)) {
  console.error(`error: project root not found: ${root}`);
  process.exit(1);
}

const report = detect(root);

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`project: ${report.root}`);
  console.log(`  content/  (legacy):    ${report.hasLegacy ? 'present' : 'absent'}`);
  console.log(`  contents/ (canonical): ${report.hasCanonical ? 'present' : 'absent'}`);
  if (report.issues.length === 0) {
    console.log('ok: no directory issues detected.');
  } else {
    for (const issue of report.issues) {
      console.log('');
      console.log(`[${issue.severity}] ${issue.code}`);
      console.log(`  ${issue.message}`);
      console.log(`  fix: ${issue.fix}`);
    }
  }
}

const hasError = report.issues.some((i) => i.severity === 'error');
if (hasError) process.exit(args.strict ? 2 : 0);
if (args.strict && report.issues.length > 0) process.exit(2);
process.exit(0);
