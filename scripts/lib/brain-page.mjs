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

export function listIngestedSources(logFile) {
  if (!existsSync(logFile)) return [];
  const text = readFileSync(logFile, "utf8");
  const sources = new Set();
  const blocks = text.split(/^## /m).slice(1);
  for (const block of blocks) {
    if (!/^- tipo:\s*ingestion\b/m.test(block)) continue;
    const escopo = block.match(/^- escopo:\s*(.+)$/m);
    if (escopo) sources.add(escopo[1].trim());
    const evidencia = block.match(/^- evidencia:\s*(.+)$/m);
    if (evidencia) sources.add(evidencia[1].trim());
  }
  return [...sources];
}

export function findMissingSources(body, logFile) {
  const used = extractSources(body).map((s) => s.path);
  const ingested = new Set(listIngestedSources(logFile));
  return [...new Set(used)].filter((p) => !ingested.has(p));
}

export function findBrokenWikilinks(body, brainRoot) {
  const links = extractWikilinks(body);
  const broken = [];
  for (const link of links) {
    const target = link.split("#", 1)[0].trim();
    if (!target) continue;
    const candidate = target.endsWith(".md")
      ? join(brainRoot, target)
      : join(brainRoot, `${target}.md`);
    if (!existsSync(candidate)) broken.push(link);
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
  const dir = mkdtempSync(join(tmpdir(), "agentic-seo-diff-"));
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
  const { date, tipo, titulo, escopo, decisao, evidencia, aprovador, aprovado_em, notas } = entry;
  mkdirSync(dirname(logFile), { recursive: true });
  const escopoStr = Array.isArray(escopo) ? escopo.join(", ") : (escopo || "n/a");
  const lines = [
    "",
    "",
    `## ${date} - ${titulo}`,
    "",
    `- tipo: ${tipo}`,
    `- escopo: ${escopoStr}`,
    `- decisao: ${decisao}`,
  ];
  if (evidencia) lines.push(`- evidencia: ${evidencia}`);
  lines.push(`- aprovador: ${aprovador || "agent"}`);
  if (aprovado_em) lines.push(`- aprovado_em: ${aprovado_em}`);
  if (notas) lines.push(`- notas: ${notas}`);
  appendFileSync(logFile, lines.join("\n") + "\n", "utf8");
}

export function appendSourcesAsIngest(logFile, sources, aprovador) {
  if (!sources || !sources.length) return;
  const date = new Date().toISOString().slice(0, 10);
  for (const sourcePath of sources) {
    const label = sourcePath.split("/").pop() || sourcePath;
    appendLogEntry(logFile, {
      date,
      tipo: "ingestion",
      titulo: `Ingestao de fonte: ${label}`,
      escopo: sourcePath,
      decisao: "Catalogada via aprovacao de pagina do brain.",
      evidencia: sourcePath,
      aprovador: aprovador || "agent",
    });
  }
}

export function pageRelative(projectRoot, absolutePath) {
  return relative(resolve(projectRoot), resolve(absolutePath));
}
