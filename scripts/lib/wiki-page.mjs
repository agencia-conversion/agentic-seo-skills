import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { data: {}, body: text, raw: "" };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: text, raw: "" };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  const data = {};
  let currentList = null;
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s/.test(line) && currentList) {
      const m = line.match(/^\s+-\s*(.+)$/);
      if (m) currentList.push(m[1].replace(/^["']|["']$/g, ""));
      continue;
    }
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (val === "" || val === "[]") {
      currentList = [];
      data[key] = currentList;
    } else {
      data[key] = val.replace(/^["']|["']$/g, "");
      currentList = null;
    }
  }
  return { data, body, raw };
}

export function extractSources(body) {
  const matches = [...body.matchAll(/\[([^\]]+)\]\((\.\.\/sources\/[^)]+)\)/g)];
  return matches.map((m) => ({ label: m[1], path: m[2] }));
}

export function extractWikilinks(body) {
  const matches = [...body.matchAll(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g)];
  return matches.map((m) => m[1].trim());
}

export function listCatalogedSources(fontesIndexPath) {
  if (!existsSync(fontesIndexPath)) return [];
  const text = readFileSync(fontesIndexPath, "utf8");
  return [...text.matchAll(/\[([^\]]+)\]\((\.\.\/sources\/[^)]+)\)/g)].map((m) => m[2]);
}

export function findMissingSources(body, fontesIndexPath) {
  const used = extractSources(body).map((s) => s.path);
  const cataloged = new Set(listCatalogedSources(fontesIndexPath));
  return [...new Set(used)].filter((p) => !cataloged.has(p));
}

export function findBrokenWikilinks(body, wikiRoot) {
  const links = extractWikilinks(body);
  const broken = [];
  for (const link of links) {
    const candidates = [
      join(wikiRoot, `${link}.md`),
      join(wikiRoot, link, "index.md"),
    ];
    if (!candidates.some((p) => existsSync(p))) broken.push(link);
  }
  return broken;
}

export function snapshotPath(projectRoot, pageRel) {
  return join(projectRoot, ".handoffs", "snapshots", pageRel);
}

export function readSnapshot(projectRoot, pageRel) {
  const p = snapshotPath(projectRoot, pageRel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

export function writeSnapshot(projectRoot, pageRel, body) {
  const p = snapshotPath(projectRoot, pageRel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body, "utf8");
  return p;
}

export function diffAgainstSnapshot(projectRoot, pageRel, currentBody) {
  const previous = readSnapshot(projectRoot, pageRel);
  if (previous === null) return { hasPrevious: false, unified: "" };
  const dir = mkdtempSync(join(tmpdir(), "seo-brain-diff-"));
  const tmpA = join(dir, "previous.md");
  const tmpB = join(dir, "current.md");
  try {
    writeFileSync(tmpA, previous, "utf8");
    writeFileSync(tmpB, currentBody, "utf8");
    const result = spawnSync("git", ["diff", "--no-index", "--no-color", "--", tmpA, tmpB], {
      encoding: "utf8",
    });
    return { hasPrevious: true, unified: result.stdout || "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function appendLogEntry(logFile, entry) {
  const { date, eventType, title, type, actor, files, decision, summary, notes } = entry;
  mkdirSync(dirname(logFile), { recursive: true });
  const links = files.length ? files.map((f) => `[[${f}]]`).join(", ") : "n/a";
  const lines = [
    "",
    "",
    `## [${date}] ${eventType} | ${title}`,
    "",
    `- Type: ${type}`,
    `- Actor: ${actor}`,
    `- Files: ${links}`,
    `- Decision: ${decision}`,
    `- Summary: ${summary}`,
  ];
  if (notes) lines.push(`- Notes: ${notes}`);
  appendFileSync(logFile, lines.join("\n") + "\n", "utf8");
}

export function appendSourcesToCatalog(fontesIndexPath, missing) {
  if (!missing.length) return;
  mkdirSync(dirname(fontesIndexPath), { recursive: true });
  const lines = missing.map((p) => `- [${p.split("/").pop()}](${p})`);
  appendFileSync(fontesIndexPath, "\n" + lines.join("\n") + "\n", "utf8");
}

export function pageRelative(projectRoot, absolutePath) {
  return relative(resolve(projectRoot), resolve(absolutePath));
}
