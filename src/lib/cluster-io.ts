import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import type {
  ClusterRecord,
  ClusterYaml,
  ContentFrontmatter,
  ContentRecord,
  Origem,
} from "./cluster-types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const ORIGEMS: Origem[] = ["blog", "linkedin", "podcast", "other"];

export interface ParsedFrontmatter {
  data: ContentFrontmatter;
  body: string;
  raw: string;
}

export function parseFrontmatter(text: string): ParsedFrontmatter {
  const cleaned = text.replace(/^﻿/, "");
  const match = cleaned.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, body: cleaned, raw: "" };
  }
  const raw = match[1];
  const body = match[2] ?? "";
  let data: ContentFrontmatter = {};
  try {
    const parsed = yamlParse(raw);
    if (parsed && typeof parsed === "object") {
      data = parsed as ContentFrontmatter;
    }
  } catch {
    data = {};
  }
  return { data, body, raw };
}

export function serializeFrontmatter(
  data: ContentFrontmatter,
  body: string,
): string {
  const yaml = yamlStringify(data, { lineWidth: 0 }).trimEnd();
  const sep = body.startsWith("\n") ? "" : "\n";
  return `---\n${yaml}\n---\n${sep}${body}`;
}

export function loadClusters(projectRoot: string): ClusterRecord[] {
  const dir = join(projectRoot, "clusters");
  if (!existsSync(dir)) return [];
  const out: ClusterRecord[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const yamlPath = join(dir, name, "cluster.yaml");
    if (!existsSync(yamlPath)) continue;
    try {
      const parsed = yamlParse(readFileSync(yamlPath, "utf8")) as ClusterYaml;
      if (parsed && parsed.slug) {
        out.push({ slug: parsed.slug, filePath: yamlPath, yaml: parsed });
      }
    } catch {
      // skip malformed
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

// Bilingual content roots and origin aliases. EN canonical is content/ with
// origin: other; pt-BR alias is conteudos/ with origin: outros.
const CONTENT_ROOTS = ["content", "conteudos"] as const;
const ORIGIN_ALIASES: Record<string, string> = { outros: "other", other: "outros" };

export function loadContents(projectRoot: string): ContentRecord[] {
  const out: ContentRecord[] = [];
  const seen = new Set<string>();
  for (const root of CONTENT_ROOTS) {
    for (const origem of ORIGEMS) {
      const dirCandidates = [origem, ORIGIN_ALIASES[origem]].filter(Boolean) as string[];
      for (const folderName of dirCandidates) {
        const dir = join(projectRoot, root, folderName);
        if (!existsSync(dir)) continue;
        for (const name of readdirSync(dir)) {
          if (!name.endsWith(".md")) continue;
          if (name.startsWith("_")) continue;
          const filePath = join(dir, name);
          if (seen.has(filePath)) continue;
          seen.add(filePath);
          const stat = statSync(filePath);
          let fm: ContentFrontmatter = {};
          try {
            fm = parseFrontmatter(readFileSync(filePath, "utf8")).data;
          } catch {
            fm = {};
          }
          const slug = (fm.slug as string) || name.replace(/\.md$/, "");
          out.push({
            slug,
            origem,
            filePath,
            relPath: relative(projectRoot, filePath).replace(/\\/g, "/"),
            fm,
            mtimeMs: stat.mtimeMs,
          });
        }
      }
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function writeClusterYaml(
  cluster: ClusterRecord,
  next: ClusterYaml,
): void {
  ensureDir(cluster.filePath);
  writeFileSync(cluster.filePath, yamlStringify(next, { lineWidth: 0 }), "utf8");
}

export function readProjectLanguage(projectRoot: string): string | null {
  const filePath = join(projectRoot, ".agentic-seo", "project.json");
  if (!existsSync(filePath)) return null;
  try {
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    if (typeof data.language === "string") return data.language;
  } catch {
    return null;
  }
  return null;
}

export function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function writeFileIfChanged(
  filePath: string,
  next: string,
): { changed: boolean; created: boolean } {
  const created = !existsSync(filePath);
  if (!created) {
    const current = readFileSync(filePath, "utf8");
    if (current === next) return { changed: false, created: false };
  }
  ensureDir(filePath);
  writeFileSync(filePath, next, "utf8");
  return { changed: true, created };
}

export interface FingerprintIO {
  read(projectRoot: string, slug: string): string | null;
  write(projectRoot: string, slug: string, value: string): void;
}

export const fingerprintIO: FingerprintIO = {
  read(projectRoot, slug) {
    const filePath = join(
      projectRoot,
      "clusters",
      slug,
      ".sync-fingerprint",
    );
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf8").trim();
  },
  write(projectRoot, slug, value) {
    const filePath = join(
      projectRoot,
      "clusters",
      slug,
      ".sync-fingerprint",
    );
    ensureDir(filePath);
    writeFileSync(filePath, value, "utf8");
  },
};

export function loadSubpage(projectRoot: string, slug: string): string | null {
  const filePath = join(projectRoot, "brain", "topic-clusters", `${slug}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf8");
}

export function subpagePath(projectRoot: string, slug: string): string {
  return join(projectRoot, "brain", "topic-clusters", `${slug}.md`);
}

export function indexPath(projectRoot: string): string {
  return join(projectRoot, "brain", "topic-clusters.md");
}

export function loadTemplate(
  pluginRoot: string,
  relativePath: string,
): string | null {
  const filePath = join(pluginRoot, "templates", relativePath);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf8");
}
