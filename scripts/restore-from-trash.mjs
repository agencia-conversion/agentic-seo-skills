#!/usr/bin/env node
// Restore the most recent trashed content matching <slug> back to
// contents/<origin>/<slug>.md. Trash files carry trashed_from in the
// frontmatter so origin + original path are recoverable.
//
// Usage: node scripts/restore-from-trash.mjs <slug> [--project=./project]
//        node scripts/restore-from-trash.mjs --list [--project=./project]

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

function parseArgs(argv) {
  const out = { project: 'project', slug: null, list: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--list') out.list = true;
    else if (arg.startsWith('--project=')) out.project = arg.slice('--project='.length);
    else if (!arg.startsWith('--') && !out.slug) out.slug = arg;
  }
  return out;
}

function listTrash(trashDir) {
  if (!existsSync(trashDir)) return [];
  return readdirSync(trashDir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => {
      const full = join(trashDir, name);
      const mtime = statSync(full).mtimeMs;
      return { name, full, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: text };
  try {
    const parsed = parseYaml(match[1]);
    return {
      fm: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {},
      body: match[2] || '',
    };
  } catch {
    return { fm: {}, body: match[2] || '' };
  }
}

function main() {
  const args = parseArgs(process.argv);
  const projectRoot = resolve(args.project);
  const trashDir = join(projectRoot, 'Trash');
  const all = listTrash(trashDir);
  if (args.list) {
    if (all.length === 0) {
      console.log(`(Trash empty — ${trashDir})`);
      return;
    }
    for (const item of all) console.log(item.name);
    return;
  }
  if (!args.slug) {
    console.error('Usage: node scripts/restore-from-trash.mjs <slug> [--project=./project]');
    process.exit(2);
  }
  const suffix = `-${args.slug}.md`;
  const match = all.find((item) => item.name.endsWith(suffix));
  if (!match) {
    console.error(`No trashed file ending with "${suffix}" in ${trashDir}`);
    process.exit(1);
  }
  const text = readFileSync(match.full, 'utf8');
  const { fm, body } = parseFrontmatter(text);
  const origin = typeof fm.trashed_from === 'string' && fm.trashed_from.startsWith('contents/')
    ? fm.trashed_from.split('/')[1]
    : null;
  if (!origin) {
    console.error(`Trashed file ${match.name} missing valid trashed_from frontmatter — cannot infer origin.`);
    process.exit(1);
  }
  const targetRel = `contents/${origin}/${args.slug}.md`;
  const targetFull = join(projectRoot, targetRel);
  if (existsSync(targetFull)) {
    console.error(`Target already exists: ${targetRel}. Move/rename it first.`);
    process.exit(1);
  }
  const restored = { ...fm };
  delete restored.trashed_from;
  delete restored.trashed_at;
  const yaml = stringifyYaml(restored, { lineWidth: 0 }).trimEnd();
  mkdirSync(dirname(targetFull), { recursive: true });
  writeFileSync(targetFull, `---\n${yaml}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`, 'utf8');
  // Remove the trashed file once restore succeeded. Use rename to a temp
  // path first to avoid a race where the Companion picks it up mid-flight.
  const tomb = `${match.full}.restored`;
  renameSync(match.full, tomb);
  // Best-effort cleanup: ignore unlink failures.
  try { unlinkSync(tomb); } catch {}
  console.log(`Restored ${match.name} → ${targetRel}`);
}

main();
