// Scans .md files for `agentic-<type>` code fences and updates the materialized
// payload in-place when the source data changes. The fence body is YAML with
// `version`, user params, and generated fields (`materialized`, `materialized_at`,
// `materialized_fingerprint`). Idempotent: re-scan after no source change is a noop.

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import YAML from "yaml";
import { getAutoBlockType, type AutoBlockInputs } from "./auto-block-registry";
import type { Lint } from "./cluster-types";

const FENCE_RE = /^(```)(agentic-[a-z0-9-]+)\n([\s\S]*?)\n```/gm;

export interface ScanFileResult {
  filePath: string;
  changed: boolean;
  blocksFound: number;
  blocksUpdated: number;
  lints: Lint[];
}

export interface ScanOptions {
  dryRun?: boolean;
  check?: boolean;
}

function walkMarkdown(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const full = join(dir, name);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walkMarkdown(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

function serializeFenceBody(payload: Record<string, unknown>): string {
  // Yaml lib auto-picks literal block scalar (|) for multi-line strings,
  // which is exactly what we want for `materialized`.
  return YAML.stringify(payload, {
    lineWidth: 0,
    minContentWidth: 0,
    defaultStringType: "PLAIN",
    defaultKeyType: "PLAIN",
  });
}

function scanFile(
  filePath: string,
  inputs: AutoBlockInputs,
  options: ScanOptions,
): ScanFileResult {
  const original = readFileSync(filePath, "utf8");
  const lints: Lint[] = [];
  let blocksFound = 0;
  let blocksUpdated = 0;

  const next = original.replace(FENCE_RE, (match, _fenceMark, typeName, body) => {
    blocksFound++;
    const type = getAutoBlockType(typeName);
    if (!type) {
      lints.push({
        code: "auto-block.unknown-type",
        severity: "warn",
        message: `Tipo de auto-block desconhecido: ${typeName} em ${filePath}`,
        context: { type: typeName, file: filePath },
      });
      return match;
    }

    let parsed: Record<string, unknown> = {};
    try {
      const parsedRaw = YAML.parse(body);
      parsed = parsedRaw && typeof parsedRaw === "object" && !Array.isArray(parsedRaw)
        ? (parsedRaw as Record<string, unknown>)
        : {};
    } catch (err) {
      lints.push({
        code: "auto-block.invalid-yaml",
        severity: "warn",
        message: `YAML inválido em fence ${typeName}: ${(err as Error).message}`,
        context: { type: typeName, file: filePath },
      });
      return match;
    }

    const paramsResult = type.parseParams(parsed);
    if ("error" in paramsResult) {
      lints.push({
        code: "auto-block.invalid-params",
        severity: "warn",
        message: `Params inválidos em ${typeName}: ${paramsResult.error}`,
        context: { type: typeName, file: filePath, error: paramsResult.error },
      });
      return match;
    }

    const rendered = type.render(paramsResult, inputs);
    if (rendered.lints) lints.push(...rendered.lints);

    const previousFingerprint = parsed.materialized_fingerprint;
    if (previousFingerprint === rendered.fingerprint) {
      return match;
    }

    blocksUpdated++;
    const nextPayload: Record<string, unknown> = {
      version: typeof parsed.version === "number" ? parsed.version : 1,
      ...paramsResult,
      materialized: rendered.materialized,
      materialized_at: inputs.now,
      materialized_fingerprint: rendered.fingerprint,
    };
    const nextBody = serializeFenceBody(nextPayload).replace(/\n$/, "");
    return `\`\`\`${typeName}\n${nextBody}\n\`\`\``;
  });

  const changed = next !== original;
  if (changed && !options.check && !options.dryRun) {
    writeFileSync(filePath, next, "utf8");
  }

  return { filePath, changed, blocksFound, blocksUpdated, lints };
}

export interface ScanResult {
  changedFiles: string[];
  blocksFound: number;
  blocksUpdated: number;
  lints: Lint[];
}

export function scanAndSyncAutoBlocks(
  inputs: AutoBlockInputs,
  options: ScanOptions = {},
): ScanResult {
  const brainDir = join(inputs.projectRoot, "brain");
  const files = walkMarkdown(brainDir);
  const result: ScanResult = {
    changedFiles: [],
    blocksFound: 0,
    blocksUpdated: 0,
    lints: [],
  };
  for (const file of files) {
    const r = scanFile(file, inputs, options);
    result.blocksFound += r.blocksFound;
    result.blocksUpdated += r.blocksUpdated;
    result.lints.push(...r.lints);
    if (r.changed) result.changedFiles.push(file);
  }
  return result;
}
