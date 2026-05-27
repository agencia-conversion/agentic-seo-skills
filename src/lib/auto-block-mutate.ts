// Mutation engine: applies a MutationDescriptor to its target source (cluster.yaml
// or content frontmatter) under a simple file lock, preserves YAML comments
// via YAML.parseDocument, and appends an audit line to auto-block-mutations.jsonl.

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import YAML from "yaml";
import type { MutationDescriptor } from "./auto-block-registry";

const CLUSTER_YAML_PATTERN = /\/clusters\/[a-z0-9-]+\/cluster\.yaml$/;
const CONTENT_MD_PATTERN = /\/conteudos\/(blog|linkedin|podcast|outros)\/[a-z0-9-]+\.md$/;
const FIELD_PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[0-9]+\])*$/;

export interface MutationContext {
  projectRoot: string;
  actor: string;
  source: "api" | "reverse-sync" | "watcher";
  toolName?: string;
}

export interface MutationApplyResult {
  ok: boolean;
  filePath: string;
  fieldPath: string;
  before: unknown;
  after: unknown;
  error?: string;
}

function isInsideProject(filePath: string, projectRoot: string): boolean {
  const rel = relative(projectRoot, filePath);
  return !rel.startsWith("..") && !rel.startsWith("/");
}

function validateDescriptor(d: MutationDescriptor, projectRoot: string): string | null {
  if (!d.filePath) return "missing filePath";
  if (!isInsideProject(d.filePath, projectRoot)) return "path escapes project root";
  if (d.source === "cluster-yaml" && !CLUSTER_YAML_PATTERN.test(d.filePath)) {
    return "cluster-yaml descriptor must target clusters/<slug>/cluster.yaml";
  }
  if (d.source === "content-frontmatter" && !CONTENT_MD_PATTERN.test(d.filePath)) {
    return "content-frontmatter descriptor must target conteudos/<origem>/<slug>.md";
  }
  if (!FIELD_PATH_PATTERN.test(d.fieldPath)) return "invalid fieldPath syntax";
  return null;
}

function fieldPathSegments(fieldPath: string): (string | number)[] {
  const segments: (string | number)[] = [];
  for (const part of fieldPath.split(".")) {
    const match = part.match(/^([^\[]+)(\[(\d+)\])?$/);
    if (!match) {
      segments.push(part);
      continue;
    }
    segments.push(match[1]);
    if (match[3] !== undefined) segments.push(Number(match[3]));
  }
  return segments;
}

function acquireLock(filePath: string, timeoutMs = 2000): { release: () => void } {
  const lockPath = `${filePath}.lock`;
  const start = Date.now();
  while (true) {
    try {
      const fd = openSync(lockPath, "wx");
      closeSync(fd);
      return {
        release() {
          try { unlinkSync(lockPath); } catch { /* ignore */ }
        },
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`lock timeout on ${lockPath}`);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}

function appendAudit(projectRoot: string, entry: Record<string, unknown>): void {
  const auditDir = join(projectRoot, ".agentic-seo", "logs");
  mkdirSync(auditDir, { recursive: true });
  const path = join(auditDir, "auto-block-mutations.jsonl");
  writeFileSync(path, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n", {
    flag: "a",
  });
}

function applyClusterYamlMutation(
  filePath: string,
  fieldPath: string,
  after: unknown,
): { before: unknown } {
  const text = readFileSync(filePath, "utf8");
  const doc = YAML.parseDocument(text);
  const segments = fieldPathSegments(fieldPath);
  const beforeNode = doc.getIn(segments, false);
  const before = beforeNode === undefined ? null : YAML.parse(YAML.stringify(beforeNode));
  doc.setIn(segments, after);
  writeFileSync(filePath, String(doc), "utf8");
  return { before };
}

function parseFrontmatterBlock(text: string): { fm: Record<string, unknown>; body: string } | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const fm = YAML.parse(match[1]);
  return { fm: fm && typeof fm === "object" && !Array.isArray(fm) ? fm : {}, body: match[2] };
}

function applyContentFrontmatterMutation(
  filePath: string,
  fieldPath: string,
  after: unknown,
): { before: unknown } {
  const text = readFileSync(filePath, "utf8");
  const parsed = parseFrontmatterBlock(text);
  if (!parsed) throw new Error("missing or invalid frontmatter");
  const segments = fieldPathSegments(fieldPath);
  const doc = YAML.parseDocument(YAML.stringify(parsed.fm));
  const beforeNode = doc.getIn(segments, false);
  const before = beforeNode === undefined ? null : YAML.parse(YAML.stringify(beforeNode));
  doc.setIn(segments, after);
  const nextFm = String(doc).replace(/\n$/, "");
  writeFileSync(filePath, `---\n${nextFm}\n---\n${parsed.body}`, "utf8");
  return { before };
}

export function applyMutation(
  descriptor: MutationDescriptor,
  ctx: MutationContext,
): MutationApplyResult {
  const projectRoot = resolve(ctx.projectRoot);
  const filePath = resolve(descriptor.filePath);
  const validationError = validateDescriptor({ ...descriptor, filePath }, projectRoot);
  if (validationError) {
    return {
      ok: false,
      filePath: descriptor.filePath,
      fieldPath: descriptor.fieldPath,
      before: descriptor.before,
      after: descriptor.after,
      error: validationError,
    };
  }
  if (!existsSync(filePath)) {
    return {
      ok: false,
      filePath,
      fieldPath: descriptor.fieldPath,
      before: descriptor.before,
      after: descriptor.after,
      error: "target file does not exist",
    };
  }
  mkdirSync(dirname(filePath), { recursive: true });
  const lock = acquireLock(filePath);
  try {
    const result =
      descriptor.source === "cluster-yaml"
        ? applyClusterYamlMutation(filePath, descriptor.fieldPath, descriptor.after)
        : applyContentFrontmatterMutation(filePath, descriptor.fieldPath, descriptor.after);
    appendAudit(projectRoot, {
      filePath: relative(projectRoot, filePath),
      fieldPath: descriptor.fieldPath,
      source: descriptor.source,
      before: result.before,
      after: descriptor.after,
      actor: ctx.actor,
      via: ctx.source,
      tool: ctx.toolName,
    });
    return {
      ok: true,
      filePath,
      fieldPath: descriptor.fieldPath,
      before: result.before,
      after: descriptor.after,
    };
  } catch (err) {
    return {
      ok: false,
      filePath,
      fieldPath: descriptor.fieldPath,
      before: descriptor.before,
      after: descriptor.after,
      error: (err as Error).message,
    };
  } finally {
    lock.release();
  }
}
