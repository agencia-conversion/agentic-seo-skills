"use strict";
// Scans .md files for `agentic-<type>` code fences and updates the materialized
// payload in-place when the source data changes. The fence body is YAML with
// `version`, user params, and generated fields (`materialized`, `materialized_at`,
// `materialized_fingerprint`). Idempotent: re-scan after no source change is a noop.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanAndSyncAutoBlocks = scanAndSyncAutoBlocks;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_fs_2 = require("node:fs");
const yaml_1 = __importDefault(require("yaml"));
const auto_block_registry_1 = require("./auto-block-registry");
const FENCE_RE = /^(```)(agentic-[a-z0-9-]+)\n([\s\S]*?)\n```/gm;
function walkMarkdown(dir, out = []) {
    let entries = [];
    try {
        entries = (0, node_fs_2.readdirSync)(dir);
    }
    catch {
        return out;
    }
    for (const name of entries) {
        if (name.startsWith(".") || name.startsWith("_"))
            continue;
        const full = (0, node_path_1.join)(dir, name);
        let stat;
        try {
            stat = (0, node_fs_1.statSync)(full);
        }
        catch {
            continue;
        }
        if (stat.isDirectory())
            walkMarkdown(full, out);
        else if (name.endsWith(".md"))
            out.push(full);
    }
    return out;
}
function serializeFenceBody(payload) {
    // Yaml lib auto-picks literal block scalar (|) for multi-line strings,
    // which is exactly what we want for `materialized`.
    return yaml_1.default.stringify(payload, {
        lineWidth: 0,
        minContentWidth: 0,
        defaultStringType: "PLAIN",
        defaultKeyType: "PLAIN",
    });
}
function scanFile(filePath, inputs, options) {
    const original = (0, node_fs_1.readFileSync)(filePath, "utf8");
    const lints = [];
    let blocksFound = 0;
    let blocksUpdated = 0;
    const next = original.replace(FENCE_RE, (match, _fenceMark, typeName, body) => {
        blocksFound++;
        const type = (0, auto_block_registry_1.getAutoBlockType)(typeName);
        if (!type) {
            lints.push({
                code: "auto-block.unknown-type",
                severity: "warn",
                message: `Tipo de auto-block desconhecido: ${typeName} em ${filePath}`,
                context: { type: typeName, file: filePath },
            });
            return match;
        }
        let parsed = {};
        try {
            const parsedRaw = yaml_1.default.parse(body);
            parsed = parsedRaw && typeof parsedRaw === "object" && !Array.isArray(parsedRaw)
                ? parsedRaw
                : {};
        }
        catch (err) {
            lints.push({
                code: "auto-block.invalid-yaml",
                severity: "warn",
                message: `YAML inválido em fence ${typeName}: ${err.message}`,
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
        if (rendered.lints)
            lints.push(...rendered.lints);
        const previousFingerprint = parsed.materialized_fingerprint;
        if (previousFingerprint === rendered.fingerprint) {
            return match;
        }
        blocksUpdated++;
        const nextPayload = {
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
        (0, node_fs_1.writeFileSync)(filePath, next, "utf8");
    }
    return { filePath, changed, blocksFound, blocksUpdated, lints };
}
function scanAndSyncAutoBlocks(inputs, options = {}) {
    const brainDir = (0, node_path_1.join)(inputs.projectRoot, "brain");
    const files = walkMarkdown(brainDir);
    const result = {
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
        if (r.changed)
            result.changedFiles.push(file);
    }
    return result;
}
