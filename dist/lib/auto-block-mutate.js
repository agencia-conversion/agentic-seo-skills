"use strict";
// Mutation engine: applies a MutationDescriptor to its target source (cluster.yaml
// or content frontmatter) under a simple file lock, preserves YAML comments
// via YAML.parseDocument, and appends an audit line to auto-block-mutations.jsonl.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMutation = applyMutation;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = __importDefault(require("yaml"));
const CLUSTER_YAML_PATTERN = /\/clusters\/[a-z0-9-]+\/cluster\.yaml$/;
const CONTENT_MD_PATTERN = /\/contents\/(blog|linkedin|podcast|other)\/[a-z0-9-]+\.md$/;
const FIELD_PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[[0-9]+\])*$/;
function isInsideProject(filePath, projectRoot) {
    const rel = (0, node_path_1.relative)(projectRoot, filePath);
    return !rel.startsWith("..") && !rel.startsWith("/");
}
function validateDescriptor(d, projectRoot) {
    if (!d.filePath)
        return "missing filePath";
    if (!isInsideProject(d.filePath, projectRoot))
        return "path escapes project root";
    if (d.source === "cluster-yaml" && !CLUSTER_YAML_PATTERN.test(d.filePath)) {
        return "cluster-yaml descriptor must target clusters/<slug>/cluster.yaml";
    }
    if (d.source === "content-frontmatter" && !CONTENT_MD_PATTERN.test(d.filePath)) {
        return "content-frontmatter descriptor must target contents/<origin>/<slug>.md";
    }
    if (!FIELD_PATH_PATTERN.test(d.fieldPath))
        return "invalid fieldPath syntax";
    return null;
}
function fieldPathSegments(fieldPath) {
    const segments = [];
    for (const part of fieldPath.split(".")) {
        const match = part.match(/^([^\[]+)(\[(\d+)\])?$/);
        if (!match) {
            segments.push(part);
            continue;
        }
        segments.push(match[1]);
        if (match[3] !== undefined)
            segments.push(Number(match[3]));
    }
    return segments;
}
function acquireLock(filePath, timeoutMs = 2000) {
    const lockPath = `${filePath}.lock`;
    const start = Date.now();
    while (true) {
        try {
            const fd = (0, node_fs_1.openSync)(lockPath, "wx");
            (0, node_fs_1.closeSync)(fd);
            return {
                release() {
                    try {
                        (0, node_fs_1.unlinkSync)(lockPath);
                    }
                    catch { /* ignore */ }
                },
            };
        }
        catch (err) {
            if (err.code !== "EEXIST")
                throw err;
            if (Date.now() - start > timeoutMs) {
                throw new Error(`lock timeout on ${lockPath}`);
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
        }
    }
}
function appendAudit(projectRoot, entry) {
    const auditDir = (0, node_path_1.join)(projectRoot, ".agentic-seo", "logs");
    (0, node_fs_1.mkdirSync)(auditDir, { recursive: true });
    const path = (0, node_path_1.join)(auditDir, "auto-block-mutations.jsonl");
    (0, node_fs_1.writeFileSync)(path, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n", {
        flag: "a",
    });
}
function applyClusterYamlMutation(filePath, fieldPath, after) {
    const text = (0, node_fs_1.readFileSync)(filePath, "utf8");
    const doc = yaml_1.default.parseDocument(text);
    const segments = fieldPathSegments(fieldPath);
    const beforeNode = doc.getIn(segments, false);
    const before = beforeNode === undefined ? null : yaml_1.default.parse(yaml_1.default.stringify(beforeNode));
    doc.setIn(segments, after);
    (0, node_fs_1.writeFileSync)(filePath, String(doc), "utf8");
    return { before };
}
function parseFrontmatterBlock(text) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match)
        return null;
    const fm = yaml_1.default.parse(match[1]);
    return { fm: fm && typeof fm === "object" && !Array.isArray(fm) ? fm : {}, body: match[2] };
}
function applyContentFrontmatterMutation(filePath, fieldPath, after) {
    const text = (0, node_fs_1.readFileSync)(filePath, "utf8");
    const parsed = parseFrontmatterBlock(text);
    if (!parsed)
        throw new Error("missing or invalid frontmatter");
    const segments = fieldPathSegments(fieldPath);
    const doc = yaml_1.default.parseDocument(yaml_1.default.stringify(parsed.fm));
    const beforeNode = doc.getIn(segments, false);
    const before = beforeNode === undefined ? null : yaml_1.default.parse(yaml_1.default.stringify(beforeNode));
    doc.setIn(segments, after);
    const nextFm = String(doc).replace(/\n$/, "");
    (0, node_fs_1.writeFileSync)(filePath, `---\n${nextFm}\n---\n${parsed.body}`, "utf8");
    return { before };
}
function applyMutation(descriptor, ctx) {
    const projectRoot = (0, node_path_1.resolve)(ctx.projectRoot);
    const filePath = (0, node_path_1.resolve)(descriptor.filePath);
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
    if (!(0, node_fs_1.existsSync)(filePath)) {
        return {
            ok: false,
            filePath,
            fieldPath: descriptor.fieldPath,
            before: descriptor.before,
            after: descriptor.after,
            error: "target file does not exist",
        };
    }
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(filePath), { recursive: true });
    const lock = acquireLock(filePath);
    try {
        const result = descriptor.source === "cluster-yaml"
            ? applyClusterYamlMutation(filePath, descriptor.fieldPath, descriptor.after)
            : applyContentFrontmatterMutation(filePath, descriptor.fieldPath, descriptor.after);
        appendAudit(projectRoot, {
            filePath: (0, node_path_1.relative)(projectRoot, filePath),
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
    }
    catch (err) {
        return {
            ok: false,
            filePath,
            fieldPath: descriptor.fieldPath,
            before: descriptor.before,
            after: descriptor.after,
            error: err.message,
        };
    }
    finally {
        lock.release();
    }
}
