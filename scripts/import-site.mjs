#!/usr/bin/env node
// Import a site's sitemap into project/contents/<origin>/<slug>.md.
// Uses tools/clis/extract.js for HTML→Markdown extraction.
// Idempotent: skips files that already exist with substantive content.
// Adds frontmatter contract_version: 1 + clusters: [].

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--base") out.base = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a.startsWith("--")) out[a.slice(2)] = true;
    else out._.push(a);
  }
  return out;
}

async function fetchSitemap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  return res.text();
}

function parseSitemap(xml) {
  const urls = [];
  const re = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
  let m;
  while ((m = re.exec(xml))) urls.push({ loc: m[1].trim(), lastmod: m[2]?.trim() ?? null });
  return urls;
}

function classify(loc, base) {
  const path = loc.replace(base, "").replace(/^\//, "").replace(/\/$/, "");
  if (path === "" || path === "blog" || path === "tools" || path === "cursos") {
    return { loc, path, origin: "skip", reason: "index" };
  }
  if (path.startsWith("blog/")) return { loc, path, slug: path.slice(5), origin: "blog" };
  if (path.startsWith("cursos/")) return { loc, path, slug: path.slice(7), origin: "other", category: "cursos" };
  if (path.startsWith("tools/")) return { loc, path, slug: path.slice(6), origin: "other", category: "tools" };
  if (path === "ai-metrics") return { loc, path, slug: "ai-metrics", origin: "other", category: "ai-metrics" };
  return { loc, path, origin: "skip", reason: "unmatched" };
}

async function runExtract(url) {
  const bin = join(ROOT, "tools/clis/extract.js");
  const { stdout } = await exec("node", [bin, "--url", url, "--timeout", "60000"], { maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function escapeYaml(str) {
  if (str == null) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildFrontmatter(item, payload) {
  const title = payload.title || item.slug;
  const rawDate = payload.date_published || new Date().toISOString();
  const date = String(rawDate).slice(0, 10);
  const lines = [
    "---",
    "contract_version: 1",
    `title: "${escapeYaml(title)}"`,
    `slug: "${item.slug}"`,
    `published_at: "${date}"`,
    `source_url: "${item.loc}"`,
    `origin: "${item.origin}"`,
    "clusters: []",
  ];
  if (item.category) lines.push(`category: "${item.category}"`);
  if (payload.byline) lines.push(`author: "${escapeYaml(payload.byline)}"`);
  if (payload.language) lines.push(`language: "${payload.language}"`);
  lines.push("---", "");
  return lines.join("\n");
}

function buildBody(payload) {
  const heading = payload.title ? `# ${payload.title}\n` : "";
  const md = (payload.body_markdown || "").trim();
  const footer = [
    "",
    "---",
    "",
    "## Importação",
    "",
    `- importado_em: ${new Date().toISOString().slice(0, 10)}`,
    `- fonte: ${payload.url}`,
    `- método: ${payload.extraction_method || "fetch"}`,
    payload.word_count != null ? `- palavras: ${payload.word_count}` : null,
    "",
  ].filter(Boolean).join("\n");
  return [heading, md, footer].filter(Boolean).join("\n");
}

async function importOne(item, opts) {
  const outPath = join(ROOT, "project/contents", item.origin, `${item.slug}.md`);
  if (existsSync(outPath)) {
    const s = await stat(outPath);
    if (s.size > 0) {
      const body = await readFile(outPath, "utf8");
      if (!body.startsWith("---\ntitle:") || body.length > 200) {
        return { item, status: "skipped", reason: "exists-substantive", outPath };
      }
    }
  }
  let payload;
  try {
    payload = await runExtract(item.loc);
  } catch (err) {
    return { item, status: "failed", reason: err.message, outPath };
  }
  if (!payload.ok) return { item, status: "failed", reason: payload.error || "extract not ok", outPath };
  const content = buildFrontmatter(item, payload) + buildBody(payload);
  if (opts.dryRun) return { item, status: "would-write", outPath, bytes: content.length };
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, content, "utf8");
  return { item, status: "wrote", outPath, bytes: content.length };
}

async function appendLog(results, base) {
  const logPath = join(ROOT, "project/brain/log.md");
  const wrote = results.filter((r) => r.status === "wrote");
  if (wrote.length === 0) return;
  const today = new Date().toISOString().slice(0, 10);
  const byOrigin = {};
  for (const r of wrote) {
    byOrigin[r.item.origin] ??= [];
    byOrigin[r.item.origin].push(`${r.item.slug}`);
  }
  const summary = Object.entries(byOrigin).map(([o, list]) => `  - ${o}: ${list.length} (${list.join(", ")})`).join("\n");
  const entry = [
    "",
    `## ${today} - Import agenticseo.sh (Lote C)`,
    "",
    "- type: ingestion",
    "- scope: project/contents/blog/, project/contents/other/",
    `- decision: ${wrote.length} conteúdos importados de ${base} via scripts/import-site.mjs + tools/clis/extract.js. Distribuição por origin:`,
    summary,
    `- evidence: ${base}/sitemap.xml`,
    "- approver: agent",
    "- notes: Cada arquivo tem frontmatter contract_version: 1 + clusters: [] + bloco \"## Importação\" no rodapé. Atribuição a cluster será feita depois, manualmente ou via topic-cluster skill, quando pesquisa DataForSEO sustentar promoção dos drafts hypothesis-only.",
    "",
  ].join("\n");
  const existing = await readFile(logPath, "utf8");
  await writeFile(logPath, existing + entry, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base || "https://agenticseo.sh";
  const xml = await fetchSitemap(`${base}/sitemap.xml`);
  const all = parseSitemap(xml);
  const classified = all.map((u) => classify(u.loc, base));
  const targets = classified.filter((c) => c.origin !== "skip");
  const limited = args.limit ? targets.slice(0, args.limit) : targets;
  process.stdout.write(`Discovered ${all.length} URLs; ${targets.length} importable; processing ${limited.length}${args.dryRun ? " (dry-run)" : ""}.\n`);
  const results = [];
  for (const item of limited) {
    process.stdout.write(`  ${item.origin.padEnd(7)} ${item.slug} ... `);
    const r = await importOne(item, args);
    results.push(r);
    process.stdout.write(`${r.status}\n`);
  }
  if (!args.dryRun) await appendLog(results, base);
  const summary = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  process.stdout.write(`\nSummary: ${JSON.stringify(summary)}\n`);
}

main().catch((err) => { process.stderr.write(`error: ${err.stack || err.message}\n`); process.exit(1); });
