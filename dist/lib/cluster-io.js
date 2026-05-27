"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fingerprintIO = void 0;
exports.parseFrontmatter = parseFrontmatter;
exports.serializeFrontmatter = serializeFrontmatter;
exports.loadClusters = loadClusters;
exports.loadContents = loadContents;
exports.writeClusterYaml = writeClusterYaml;
exports.readProjectLanguage = readProjectLanguage;
exports.ensureDir = ensureDir;
exports.writeFileIfChanged = writeFileIfChanged;
exports.loadSubpage = loadSubpage;
exports.subpagePath = subpagePath;
exports.indexPath = indexPath;
exports.loadTemplate = loadTemplate;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const ORIGINS = ["blog", "linkedin", "podcast", "other"];
function parseFrontmatter(text) {
    const cleaned = text.replace(/^﻿/, "");
    const match = cleaned.match(FRONTMATTER_RE);
    if (!match) {
        return { data: {}, body: cleaned, raw: "" };
    }
    const raw = match[1];
    const body = match[2] ?? "";
    let data = {};
    try {
        const parsed = (0, yaml_1.parse)(raw);
        if (parsed && typeof parsed === "object") {
            data = parsed;
        }
    }
    catch {
        data = {};
    }
    return { data, body, raw };
}
function serializeFrontmatter(data, body) {
    const yaml = (0, yaml_1.stringify)(data, { lineWidth: 0 }).trimEnd();
    const sep = body.startsWith("\n") ? "" : "\n";
    return `---\n${yaml}\n---\n${sep}${body}`;
}
function loadClusters(projectRoot) {
    const dir = (0, node_path_1.join)(projectRoot, "clusters");
    if (!(0, node_fs_1.existsSync)(dir))
        return [];
    const out = [];
    for (const name of (0, node_fs_1.readdirSync)(dir)) {
        if (name.startsWith(".") || name.startsWith("_"))
            continue;
        const yamlPath = (0, node_path_1.join)(dir, name, "cluster.yaml");
        if (!(0, node_fs_1.existsSync)(yamlPath))
            continue;
        try {
            const parsed = (0, yaml_1.parse)((0, node_fs_1.readFileSync)(yamlPath, "utf8"));
            if (parsed && parsed.slug) {
                out.push({ slug: parsed.slug, filePath: yamlPath, yaml: parsed });
            }
        }
        catch {
            // skip malformed
        }
    }
    return out.sort((a, b) => a.slug.localeCompare(b.slug));
}
function loadContents(projectRoot) {
    const out = [];
    for (const origin of ORIGINS) {
        const dir = (0, node_path_1.join)(projectRoot, "contents", origin);
        if (!(0, node_fs_1.existsSync)(dir))
            continue;
        for (const name of (0, node_fs_1.readdirSync)(dir)) {
            if (!name.endsWith(".md"))
                continue;
            if (name.startsWith("_"))
                continue;
            const filePath = (0, node_path_1.join)(dir, name);
            const stat = (0, node_fs_1.statSync)(filePath);
            let fm = {};
            try {
                fm = parseFrontmatter((0, node_fs_1.readFileSync)(filePath, "utf8")).data;
            }
            catch {
                fm = {};
            }
            const slug = fm.slug || name.replace(/\.md$/, "");
            out.push({
                slug,
                origin,
                filePath,
                relPath: (0, node_path_1.relative)(projectRoot, filePath).replace(/\\/g, "/"),
                fm,
                mtimeMs: stat.mtimeMs,
            });
        }
    }
    return out.sort((a, b) => a.slug.localeCompare(b.slug));
}
function writeClusterYaml(cluster, next) {
    ensureDir(cluster.filePath);
    (0, node_fs_1.writeFileSync)(cluster.filePath, (0, yaml_1.stringify)(next, { lineWidth: 0 }), "utf8");
}
function readProjectLanguage(projectRoot) {
    const filePath = (0, node_path_1.join)(projectRoot, ".agentic-seo", "project.json");
    if (!(0, node_fs_1.existsSync)(filePath))
        return null;
    try {
        const data = JSON.parse((0, node_fs_1.readFileSync)(filePath, "utf8"));
        if (typeof data.language === "string")
            return data.language;
    }
    catch {
        return null;
    }
    return null;
}
function ensureDir(filePath) {
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(filePath), { recursive: true });
}
function writeFileIfChanged(filePath, next) {
    const created = !(0, node_fs_1.existsSync)(filePath);
    if (!created) {
        const current = (0, node_fs_1.readFileSync)(filePath, "utf8");
        if (current === next)
            return { changed: false, created: false };
    }
    ensureDir(filePath);
    (0, node_fs_1.writeFileSync)(filePath, next, "utf8");
    return { changed: true, created };
}
exports.fingerprintIO = {
    read(projectRoot, slug) {
        const filePath = (0, node_path_1.join)(projectRoot, "clusters", slug, ".sync-fingerprint");
        if (!(0, node_fs_1.existsSync)(filePath))
            return null;
        return (0, node_fs_1.readFileSync)(filePath, "utf8").trim();
    },
    write(projectRoot, slug, value) {
        const filePath = (0, node_path_1.join)(projectRoot, "clusters", slug, ".sync-fingerprint");
        ensureDir(filePath);
        (0, node_fs_1.writeFileSync)(filePath, value, "utf8");
    },
};
function loadSubpage(projectRoot, slug) {
    const filePath = (0, node_path_1.join)(projectRoot, "brain", "topic-clusters", `${slug}.md`);
    if (!(0, node_fs_1.existsSync)(filePath))
        return null;
    return (0, node_fs_1.readFileSync)(filePath, "utf8");
}
function subpagePath(projectRoot, slug) {
    return (0, node_path_1.join)(projectRoot, "brain", "topic-clusters", `${slug}.md`);
}
function indexPath(projectRoot) {
    return (0, node_path_1.join)(projectRoot, "brain", "topic-clusters.md");
}
function loadTemplate(pluginRoot, relativePath) {
    const filePath = (0, node_path_1.join)(pluginRoot, "templates", relativePath);
    if (!(0, node_fs_1.existsSync)(filePath))
        return null;
    return (0, node_fs_1.readFileSync)(filePath, "utf8");
}
