import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WIKI_PAGES = [
  "wiki/index.md",
  "wiki/eeat.md",
  "wiki/tom-de-voz/index.md",
];

function sha12(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end === -1) return {};
  const head = text.slice(4, end);
  const data = {};
  for (const rawLine of head.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || /^\s/.test(line)) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (!value) {
      data[key] = "";
      continue;
    }
    const unquoted = value.replace(/^["']|["']$/g, "");
    data[key] = unquoted;
  }
  return data;
}

function resolveDomain(fmIndex, projectJson) {
  if (typeof fmIndex.publisher_domain === "string" && fmIndex.publisher_domain.trim()) return fmIndex.publisher_domain.trim();
  const nested = fmIndex["publisher.domain"] || fmIndex["site.domain"];
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (projectJson && typeof projectJson.publisher_domain === "string" && projectJson.publisher_domain.trim()) return projectJson.publisher_domain.trim();
  if (projectJson && typeof projectJson.domain === "string" && projectJson.domain.trim()) return projectJson.domain.trim();
  return null;
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function readWikiContext({ projectDir }) {
  const pages = WIKI_PAGES.map((rel) => {
    const abs = path.join(projectDir, rel);
    if (!fs.existsSync(abs)) return { path: rel, status: null, hash: null, exists: false };
    const text = fs.readFileSync(abs, "utf8");
    const fm = parseFrontmatter(text);
    return {
      path: rel,
      status: typeof fm.status === "string" ? fm.status : null,
      hash: sha12(text),
      exists: true,
      frontmatter: fm,
    };
  });
  const indexPage = pages.find((p) => p.path === "wiki/index.md");
  const projectJson = readJsonSafe(path.join(projectDir, ".seo-brain", "project.json"));
  const publisher_domain = resolveDomain(indexPage?.frontmatter || {}, projectJson);
  return {
    pages: pages.map(({ frontmatter, ...rest }) => rest),
    publisher_domain,
  };
}
