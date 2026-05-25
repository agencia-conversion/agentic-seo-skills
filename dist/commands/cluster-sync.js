"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLUSTER_LABELS = void 0;
exports.clusterSync = clusterSync;
exports.parseArgs = parseArgs;
exports.runCli = runCli;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const cluster_types_1 = require("../lib/cluster-types");
const cluster_io_1 = require("../lib/cluster-io");
const cluster_render_1 = require("../lib/cluster-render");
const cluster_labels_1 = require("../lib/cluster-labels");
Object.defineProperty(exports, "CLUSTER_LABELS", { enumerable: true, get: function () { return cluster_labels_1.CLUSTER_LABELS; } });
function defaultNow() {
    return new Date().toISOString().slice(0, 10);
}
function fingerprintOf(content) {
    return (0, node_crypto_1.createHash)("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}
function findProjectRoot(root) {
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, ".agentic-seo", "project.json")))
        return root;
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "project", ".agentic-seo", "project.json"))) {
        return (0, node_path_1.join)(root, "project");
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, "project")))
        return (0, node_path_1.join)(root, "project");
    return root;
}
function findPluginRoot(start) {
    let current = start;
    for (let i = 0; i < 6; i++) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(current, "plugin.json")))
            return current;
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(current, ".claude-plugin", "plugin.json")))
            return current;
        const parent = (0, node_path_1.join)(current, "..");
        if (parent === current)
            break;
        current = parent;
    }
    return start;
}
function indexContentsByCluster(contents) {
    const map = new Map();
    const orphans = [];
    for (const content of contents) {
        const clusters = content.fm.clusters || [];
        if (clusters.length === 0) {
            orphans.push(content);
            continue;
        }
        for (const slug of clusters) {
            if (!map.has(slug))
                map.set(slug, []);
            map.get(slug).push(content);
        }
    }
    return { map, orphans };
}
function resolveInputs(options) {
    const projectRoot = findProjectRoot(options.root);
    const pluginRoot = findPluginRoot(projectRoot);
    const clusters = (0, cluster_io_1.loadClusters)(projectRoot);
    const contents = (0, cluster_io_1.loadContents)(projectRoot);
    const language = (options.language ||
        (0, cluster_labels_1.resolveLanguage)((0, cluster_io_1.readProjectLanguage)(projectRoot)));
    const labels = (0, cluster_labels_1.getLabels)(language);
    const { map, orphans } = indexContentsByCluster(contents);
    const clusterBySlug = new Map(clusters.map((c) => [c.slug, c]));
    return {
        clusters,
        clusterBySlug,
        contents,
        contentsByCluster: map,
        orphanContents: orphans,
        language,
        labels,
        pluginRoot,
        projectRoot,
        now: (options.now || defaultNow)(),
    };
}
function detectLints(inputs, filterCluster) {
    const lints = [];
    const clusterSlugs = new Set(inputs.clusters.map((c) => c.slug));
    for (const content of inputs.contents) {
        const clusters = content.fm.clusters || [];
        if (clusters.length === 0) {
            lints.push({
                code: "content.no-clusters",
                severity: "warn",
                message: `${content.relPath} sem clusters declarados`,
                context: { content: content.relPath },
            });
            continue;
        }
        if (clusters.length >= 4) {
            lints.push({
                code: "content.cluster-fanout",
                severity: "warn",
                message: `${content.slug} declara ${clusters.length} clusters`,
                context: { content: content.relPath, count: clusters.length },
            });
        }
        for (const slug of clusters) {
            if (!clusterSlugs.has(slug)) {
                lints.push({
                    code: "content.cluster-missing",
                    severity: "block",
                    message: `${content.slug} declara cluster "${slug}" que não existe`,
                    context: { content: content.relPath, slug },
                });
            }
        }
        if (content.fm.papel) {
            for (const key of Object.keys(content.fm.papel)) {
                if (!clusters.includes(key)) {
                    lints.push({
                        code: "content.papel-orphan",
                        severity: "warn",
                        message: `${content.slug} declara papel para "${key}" mas não está em clusters:[]`,
                        context: { content: content.relPath, papel_cluster: key },
                    });
                }
            }
        }
    }
    const pilarOwners = new Map();
    for (const cluster of inputs.clusters) {
        if (filterCluster && cluster.slug !== filterCluster)
            continue;
        if (cluster.yaml.status === "active" && !cluster.yaml.pilar?.slug) {
            lints.push({
                code: "cluster.pilar.missing",
                severity: "block",
                message: `cluster "${cluster.slug}" ativo sem pilar`,
                context: { cluster: cluster.slug },
            });
        }
        const pilarSlug = cluster.yaml.pilar?.slug;
        if (pilarSlug) {
            if (!pilarOwners.has(pilarSlug))
                pilarOwners.set(pilarSlug, []);
            pilarOwners.get(pilarSlug).push(cluster.slug);
            const pilarContent = inputs.contents.find((c) => c.slug === pilarSlug);
            if (pilarContent) {
                const declared = pilarContent.fm.papel?.[cluster.slug];
                if (declared && declared !== "pilar") {
                    lints.push({
                        code: "cluster.pilar.divergence",
                        severity: "warn",
                        message: `pilar do cluster "${cluster.slug}" diverge: frontmatter de ${pilarSlug} diz "${declared}"`,
                        context: { cluster: cluster.slug, content: pilarSlug, declared },
                    });
                }
                if (!(pilarContent.fm.clusters || []).includes(cluster.slug)) {
                    lints.push({
                        code: "cluster.pilar.divergence",
                        severity: "warn",
                        message: `pilar "${pilarSlug}" não declara cluster "${cluster.slug}" em clusters:[]`,
                        context: { cluster: cluster.slug, content: pilarSlug },
                    });
                }
            }
        }
        const overrideSlugs = Object.keys(cluster.yaml.satelite_overrides || {});
        for (const slug of overrideSlugs) {
            const c = inputs.contents.find((x) => x.slug === slug);
            if (!c || !(c.fm.clusters || []).includes(cluster.slug)) {
                lints.push({
                    code: "cluster.override.orphan",
                    severity: "warn",
                    message: `satelite_overrides em "${cluster.slug}" referencia "${slug}" sem conteúdo publicado vinculado`,
                    context: { cluster: cluster.slug, content_slug: slug },
                });
            }
        }
        for (const planned of cluster.yaml.planned_satellites || []) {
            const collision = inputs.contents.find((c) => c.slug === planned.slug);
            if (collision && (collision.fm.clusters || []).includes(cluster.slug)) {
                lints.push({
                    code: "cluster.planned-collision",
                    severity: "warn",
                    message: `planned_satellite "${planned.slug}" colide com conteúdo publicado`,
                    context: { cluster: cluster.slug, slug: planned.slug },
                });
            }
        }
    }
    for (const [slug, owners] of pilarOwners.entries()) {
        if (owners.length > 1) {
            lints.push({
                code: "cluster.unique-pilar",
                severity: "block",
                message: `conteúdo "${slug}" é pilar de múltiplos clusters: ${owners.join(", ")}`,
                context: { content: slug, clusters: owners },
            });
        }
    }
    return lints;
}
function resolvePilarSlug(cluster, inputs) {
    const declared = cluster.yaml.pilar?.slug;
    if (!declared)
        return null;
    const published = inputs.contentsByCluster.get(cluster.slug) || [];
    return published.find((c) => c.slug === declared)?.slug || null;
}
function applyContentBlock(current, block, labels) {
    const beginIdx = current.indexOf(cluster_types_1.SENTINELS.contentBegin);
    const endIdx = current.indexOf(cluster_types_1.SENTINELS.contentEnd);
    if (beginIdx >= 0 && endIdx >= 0 && endIdx > beginIdx) {
        const before = current.slice(0, beginIdx).replace(/\s+$/, "");
        const after = current.slice(endIdx + cluster_types_1.SENTINELS.contentEnd.length).replace(/^\s+/, "");
        return { next: `${before}\n\n${block}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim() + "\n", lint: null };
    }
    if (beginIdx >= 0 || endIdx >= 0) {
        return { next: rebuildContentSubpage(current, block, labels), lint: "cluster.table.corrupt" };
    }
    return {
        next: rebuildContentSubpage(current, block, labels),
        lint: "cluster.table.sentinel-missing",
    };
}
function rebuildContentSubpage(current, block, labels) {
    const pilarRe = new RegExp(`^## ${escapeRegex(labels.pilar_section)}.*?(?=^## |\\Z)`, "ms");
    if (pilarRe.test(current)) {
        return current.replace(pilarRe, (m) => `${m.trimEnd()}\n\n${block}\n\n`).replace(/\n{3,}/g, "\n\n");
    }
    return `${current.trimEnd()}\n\n${block}\n`;
}
function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function renderSubpageFromTemplate(cluster, block, labels, pluginRoot, now, pilarContent) {
    const template = (0, cluster_io_1.loadTemplate)(pluginRoot, "project/brain/topic-clusters/_cluster-subpage.md.template");
    if (!template)
        return null;
    const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
    const heading = `${icon}${cluster.yaml.nome}`;
    const resumo = cluster.yaml.tese || cluster.yaml.context || `Cluster ${cluster.yaml.nome}.`;
    const pilarLine = pilarContent
        ? `[${pilarContent.fm.title || pilarContent.slug}](../../conteudos/${pilarContent.origem}/${pilarContent.slug}.md)${cluster.yaml.pilar?.keyword ? ` — ${cluster.yaml.pilar.keyword}` : ""}`
        : cluster.yaml.pilar?.slug
            ? `_${cluster.yaml.pilar.slug}_${cluster.yaml.pilar.keyword ? ` — ${cluster.yaml.pilar.keyword}` : ""} (planejado)`
            : "_pilar a definir_";
    const plannedActions = (cluster.yaml.planned_satellites || [])
        .map((p) => `- ${labels.criar} \`${p.slug}\`${p.note ? ` — ${p.note}` : ""}.`)
        .join("\n") || "- —";
    return template
        .replace(/<Nome do Cluster>/g, cluster.yaml.nome)
        .replace(/<YYYY-MM-DD>/g, now)
        .replace(/<heading>/g, heading)
        .replace(/<resumo>/g, resumo)
        .replace(/<pilar_line>/g, pilarLine)
        .replace(/<content_block>/g, block)
        .replace(/<next_actions>/g, plannedActions)
        .replace(/<evidence_block>/g, "—");
}
function updateClusterStats(cluster, inputs) {
    const published = (inputs.contentsByCluster.get(cluster.slug) || []).length;
    const planned = (cluster.yaml.planned_satellites || []).length;
    return {
        ...cluster.yaml,
        contract_version: cluster_types_1.CONTRACT_VERSION,
        stats: {
            publicados: published,
            planejados: planned,
            updated: inputs.now,
        },
    };
}
function syncCluster(cluster, inputs, options) {
    const lints = [];
    const labels = inputs.labels;
    const resolvedPilarSlug = resolvePilarSlug(cluster, inputs);
    const rows = (0, cluster_render_1.buildContentRows)({
        cluster,
        labels,
        contentsByCluster: inputs.contentsByCluster,
        resolvedPilarSlug,
    });
    const block = (0, cluster_render_1.renderContentBlock)({
        cluster,
        labels,
        contentsByCluster: inputs.contentsByCluster,
        resolvedPilarSlug,
    });
    const fingerprint = fingerprintOf(`${cluster.slug}:${rows.length}:${block}`);
    const previous = cluster_io_1.fingerprintIO.read(inputs.projectRoot, cluster.slug);
    const targetPath = (0, cluster_io_1.subpagePath)(inputs.projectRoot, cluster.slug);
    if (previous === fingerprint && (0, node_fs_1.existsSync)(targetPath)) {
        return { changed: [], noop: true, lints };
    }
    const existing = (0, cluster_io_1.loadSubpage)(inputs.projectRoot, cluster.slug);
    const pilarContent = resolvedPilarSlug
        ? (inputs.contentsByCluster.get(cluster.slug) || []).find((c) => c.slug === resolvedPilarSlug) || null
        : null;
    let nextContent;
    let detectedLint = null;
    if (!existing) {
        nextContent =
            renderSubpageFromTemplate(cluster, block, labels, inputs.pluginRoot, inputs.now, pilarContent) ||
                buildFallbackSubpage(cluster, block, labels, inputs.now);
    }
    else {
        const result = applyContentBlock(existing, block, labels);
        nextContent = result.next;
        detectedLint = result.lint;
    }
    if (detectedLint) {
        lints.push({
            code: detectedLint,
            severity: detectedLint === "cluster.table.corrupt" ? "block" : "warn",
            message: `tabela materializada de "${cluster.slug}" reconstruída (${detectedLint})`,
            context: { cluster: cluster.slug },
        });
    }
    const changed = [];
    if (!options.check) {
        if (!options.dryRun) {
            const out = (0, cluster_io_1.writeFileIfChanged)(targetPath, nextContent);
            if (out.changed)
                changed.push(targetPath);
            const nextYaml = updateClusterStats(cluster, inputs);
            const yamlText = (0, yaml_1.stringify)(nextYaml, { lineWidth: 0 });
            const yamlOut = (0, cluster_io_1.writeFileIfChanged)(cluster.filePath, yamlText);
            if (yamlOut.changed)
                changed.push(cluster.filePath);
            cluster_io_1.fingerprintIO.write(inputs.projectRoot, cluster.slug, fingerprint);
        }
    }
    return { changed, noop: false, lints };
}
function buildFallbackSubpage(cluster, block, labels, now) {
    const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
    const fm = `---\ntitle: "${cluster.yaml.nome}"\ncontract_version: ${cluster_types_1.CONTRACT_VERSION}\nupdated: "${now}"\n---\n\n`;
    return `${fm}# ${icon}${cluster.yaml.nome}\n\n## ${labels.resumo_section}\n\n${cluster.yaml.context || cluster.yaml.tese || ""}\n\n## ${labels.tese_section}\n\n—\n\n## ${labels.pilar_section}\n\n${cluster.yaml.pilar?.slug ? `_${cluster.yaml.pilar.slug}_` : "_pilar a definir_"}\n\n${block}\n\n## ${labels.proximas_acoes}\n\n—\n\n## ${labels.evidencia_section}\n\n—\n`;
}
function syncIndex(inputs, options) {
    const labels = inputs.labels;
    const block = (0, cluster_render_1.renderIndexBlock)({
        clusters: inputs.clusters,
        labels,
        contentsByCluster: inputs.contentsByCluster,
        orphanCount: inputs.orphanContents.length,
        plannedCount: inputs.clusters.reduce((acc, c) => acc + (c.yaml.planned_satellites || []).length, 0),
        publishedCount: inputs.contents.length - inputs.orphanContents.length,
        syncTimestamp: inputs.now,
    });
    const filePath = (0, cluster_io_1.indexPath)(inputs.projectRoot);
    const lints = [];
    let current = (0, node_fs_1.existsSync)(filePath) ? (0, node_fs_1.readFileSync)(filePath, "utf8") : "";
    let next;
    if (!current) {
        next = `---\ntitle: "Topic Clusters"\ncontract_version: ${cluster_types_1.CONTRACT_VERSION}\nupdated: "${inputs.now}"\n---\n\n# Topic Clusters\n\n${block}\n`;
    }
    else {
        const beginIdx = current.indexOf(cluster_types_1.SENTINELS.indexBegin);
        const endIdx = current.indexOf(cluster_types_1.SENTINELS.indexEnd);
        if (beginIdx >= 0 && endIdx >= 0 && endIdx > beginIdx) {
            const before = current.slice(0, beginIdx).replace(/\s+$/, "");
            const after = current.slice(endIdx + cluster_types_1.SENTINELS.indexEnd.length).replace(/^\s+/, "");
            next = `${before}\n\n${block}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim() + "\n";
        }
        else {
            lints.push({
                code: "cluster.table.sentinel-missing",
                severity: "warn",
                message: "índice topic-clusters.md sem sentinels — reconstruído",
                context: {},
            });
            const titleMatch = current.match(/^#\s.*$/m);
            if (titleMatch) {
                const stripped = current
                    .replace(/^## (Painel|Panel)[\s\S]*?(?=^## |\Z)/m, "")
                    .replace(new RegExp(`^## (${escapeRegex(inputs.labels.clusters_ativos)}|Clusters ativos|Active clusters)[\\s\\S]*?(?=^## |\\Z)`, "m"), "")
                    .replace(/\n{3,}/g, "\n\n");
                next = stripped.replace(/^(#\s.*)$/m, (m) => `${m.trim()}\n\n${block}\n`);
            }
            else {
                next = `${current.trimEnd()}\n\n${block}\n`;
            }
        }
    }
    if (options.check || options.dryRun) {
        return { changed: [], noop: current === next, lints };
    }
    const out = (0, cluster_io_1.writeFileIfChanged)(filePath, next);
    return { changed: out.changed ? [filePath] : [], noop: !out.changed, lints };
}
async function clusterSync(options) {
    const start = Date.now();
    const inputs = resolveInputs(options);
    const allLints = [];
    const changedFiles = [];
    let allNoop = true;
    const lintsGlobal = detectLints(inputs, options.cluster);
    allLints.push(...lintsGlobal);
    const targetClusters = options.cluster
        ? inputs.clusters.filter((c) => c.slug === options.cluster)
        : inputs.clusters;
    for (const cluster of targetClusters) {
        const res = syncCluster(cluster, inputs, options);
        changedFiles.push(...res.changed);
        if (!res.noop)
            allNoop = false;
        allLints.push(...res.lints);
    }
    const indexRes = syncIndex(inputs, options);
    changedFiles.push(...indexRes.changed);
    if (!indexRes.noop)
        allNoop = false;
    allLints.push(...indexRes.lints);
    const hasBlock = allLints.some((l) => l.severity === "block");
    const exitCode = options.check
        ? hasBlock || !allNoop
            ? 1
            : 0
        : hasBlock
            ? 0
            : 0;
    return {
        ok: !hasBlock,
        exitCode,
        changedFiles,
        noop: allNoop,
        lints: allLints,
        stats: {
            clustersConsidered: targetClusters.length,
            contentsConsidered: inputs.contents.length,
            durationMs: Date.now() - start,
        },
    };
}
function parseArgs(argv) {
    const args = {
        root: process.cwd(),
        check: false,
        dryRun: false,
        verbose: false,
    };
    for (const arg of argv) {
        if (arg === "--check")
            args.check = true;
        else if (arg === "--dry-run")
            args.dryRun = true;
        else if (arg === "--verbose")
            args.verbose = true;
        else if (arg.startsWith("--cluster="))
            args.cluster = arg.slice(10);
        else if (arg.startsWith("--root="))
            args.root = arg.slice(7);
        else if (arg.startsWith("--language=")) {
            const v = arg.slice(11);
            args.language = (v === "en" ? "en" : "pt-BR");
        }
    }
    return args;
}
async function runCli(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const result = await clusterSync({
        root: args.root,
        cluster: args.cluster,
        check: args.check,
        dryRun: args.dryRun,
        language: args.language,
        verbose: args.verbose,
    });
    const out = {
        ok: result.ok,
        noop: result.noop,
        changedFiles: result.changedFiles,
        lints: result.lints,
        stats: result.stats,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return result.exitCode;
}
if (require.main === module) {
    runCli().then((code) => {
        process.exitCode = code;
    });
}
