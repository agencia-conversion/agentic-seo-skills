"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowKindByPrefix = exports.clusterContent = void 0;
const node_crypto_1 = require("node:crypto");
const auto_block_render_1 = require("../auto-block-render");
function isPublished(row) {
    return row.kind === "published-pillar" || row.kind === "published-satellite";
}
function isPlanned(row) {
    return row.kind === "planned" || row.kind === "planned-pillar";
}
function fingerprint(text) {
    return (0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}
function shortenTitle(title) {
    if (!title)
        return "";
    if (title.length <= 60)
        return title;
    const cut = title.search(/[:—–-]\s/);
    if (cut > 0 && cut < 65)
        return title.slice(0, cut).trim();
    return title;
}
function relPathToContent(content) {
    return `../../contents/${content.origin}/${content.slug}.md`;
}
function cleanString(value) {
    const cleaned = String(value ?? "").trim();
    return cleaned || undefined;
}
function cleanVolume(value) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0)
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0)
            return parsed;
    }
    return undefined;
}
function renderKeyword(keyword, volume) {
    if (!keyword)
        return "—";
    if (typeof volume === "number" && volume > 0) {
        const display = volume >= 1000 ? `${Math.round(volume / 100) / 10}k` : `${volume}`;
        return `${keyword} (${display})`;
    }
    return keyword;
}
function readEffectiveKeyword(row) {
    if (isPublished(row)) {
        const kw = row.override?.keyword ??
            cleanString(row.content.fm.keyword) ??
            (row.kind === "published-pillar" ? row.cluster.yaml.pillar?.keyword : undefined);
        const vol = row.override?.volume ??
            cleanVolume(row.content.fm.volume) ??
            (row.kind === "published-pillar" ? row.cluster.yaml.pillar?.volume : undefined);
        return renderKeyword(kw, vol);
    }
    return renderKeyword(row.planned.keyword, row.planned.volume);
}
function readEffectiveIntent(row) {
    if (isPublished(row)) {
        return String(row.override?.intent ??
            cleanString(row.content.fm.intent) ??
            (row.kind === "published-pillar" ? row.cluster.yaml.pillar?.intent : undefined) ??
            "—");
    }
    return String(row.planned.intent || "—");
}
const columns = [
    {
        key: "role",
        label: (l) => l.role,
        read: (row, _params, inputs) => {
            const isPillar = row.kind === "published-pillar" || row.kind === "planned-pillar";
            return isPillar ? inputs.labels.pillar : inputs.labels.satellite;
        },
        derived: true,
    },
    {
        key: "content",
        label: (l) => l.content,
        read: (row) => {
            if (isPublished(row)) {
                const display = row.override?.display_title ||
                    shortenTitle(row.content.fm.title) ||
                    row.content.slug;
                return `[${display}](${relPathToContent(row.content)})`;
            }
            return `_${row.planned.slug}_`;
        },
        derived: true,
    },
    {
        key: "keyword",
        label: (l) => l.keyword,
        read: (row) => readEffectiveKeyword(row),
        write: (row, newValue) => {
            const value = typeof newValue === "string" ? newValue.trim() : "";
            if (isPublished(row)) {
                return {
                    filePath: row.content.filePath,
                    source: "content-frontmatter",
                    fieldPath: "keyword",
                    before: row.content.fm.keyword ?? null,
                    after: value || null,
                };
            }
            return {
                filePath: row.cluster.filePath,
                source: "cluster-yaml",
                fieldPath: `planned_satellites[${row.index}].keyword`,
                before: row.planned.keyword ?? null,
                after: value || null,
            };
        },
        parseCell: (cell) => {
            // Strip optional "(volume)" tail then trim.
            const stripped = cell.replace(/\s*\(\s*[\d.,k]+\s*\)\s*$/i, "").trim();
            return stripped;
        },
    },
    {
        key: "intent",
        label: (l) => l.intent,
        read: (row) => readEffectiveIntent(row),
        write: (row, newValue) => {
            const value = typeof newValue === "string" ? newValue.trim() : "";
            if (isPublished(row)) {
                return {
                    filePath: row.content.filePath,
                    source: "content-frontmatter",
                    fieldPath: "intent",
                    before: row.content.fm.intent ?? null,
                    after: value || null,
                };
            }
            return {
                filePath: row.cluster.filePath,
                source: "cluster-yaml",
                fieldPath: `planned_satellites[${row.index}].intent`,
                before: row.planned.intent ?? null,
                after: value || null,
            };
        },
        parseCell: (cell) => cell.trim(),
    },
    {
        key: "status",
        label: (l) => l.status,
        read: (row, _params, inputs) => {
            if (isPublished(row))
                return inputs.labels.published;
            return inputs.labels.planned;
        },
        derived: true,
    },
    {
        key: "action",
        label: (l) => l.action,
        read: (row, _params, inputs) => {
            if (isPlanned(row))
                return inputs.labels.briefing;
            return "—";
        },
        derived: true,
    },
    {
        key: "updated",
        label: (l) => l.updated,
        read: (row) => {
            if (isPublished(row))
                return row.content.fm.published_at || "—";
            return "—";
        },
        derived: true,
    },
    {
        key: "also_in",
        label: (l) => l.also_in,
        read: (row) => {
            if (isPublished(row)) {
                const others = (row.content.fm.clusters || []).filter((c) => c !== row.cluster.slug);
                return others.length === 0 ? "—" : others.join(", ");
            }
            return "—";
        },
        derived: true,
    },
];
function buildRows(cluster, inputs) {
    const published = inputs.contentsByCluster.get(cluster.slug) || [];
    const overrides = cluster.yaml.satellite_overrides || {};
    const pillarSlug = cluster.yaml.pillar?.slug ?? null;
    const rows = [];
    const pillarContent = pillarSlug ? published.find((c) => c.slug === pillarSlug) : null;
    if (pillarContent) {
        rows.push({
            kind: "published-pillar",
            cluster,
            content: pillarContent,
            override: overrides[pillarContent.slug],
            role: "pillar",
        });
    }
    const sortedSatellites = [...published]
        .filter((c) => !pillarContent || c.slug !== pillarContent.slug)
        .sort((a, b) => (a.fm.title || a.slug).localeCompare(b.fm.title || b.slug));
    for (const content of sortedSatellites) {
        rows.push({
            kind: "published-satellite",
            cluster,
            content,
            override: overrides[content.slug],
            role: "satellite",
        });
    }
    // Planned satellites (only if pillar isn't a published content; pillarPlannedRow
    // is rendered only when there's a planned pillar without a corresponding content).
    if (!pillarContent && pillarSlug && cluster.yaml.status === "active") {
        const plannedIndex = (cluster.yaml.planned_satellites || []).findIndex((p) => p.slug === pillarSlug);
        if (plannedIndex >= 0) {
            rows.push({
                kind: "planned-pillar",
                cluster,
                planned: cluster.yaml.planned_satellites[plannedIndex],
                index: plannedIndex,
            });
        }
    }
    const planned = cluster.yaml.planned_satellites || [];
    for (let i = 0; i < planned.length; i++) {
        const p = planned[i];
        // Skip pillar planned slug — already emitted above as planned-pillar.
        if (!pillarContent && pillarSlug && p.slug === pillarSlug)
            continue;
        rows.push({ kind: "planned", cluster, planned: p, index: i });
    }
    return rows;
}
const RowKindByPrefix = {
    "pub-pillar": "published-pillar",
    "pub": "published-satellite",
    "plan-pillar": "planned-pillar",
    "plan": "planned",
};
exports.RowKindByPrefix = RowKindByPrefix;
exports.clusterContent = {
    name: "agentic-cluster-content",
    version: 1,
    parseParams(yaml) {
        const cluster = typeof yaml.cluster === "string" && yaml.cluster.trim() ? yaml.cluster.trim() : null;
        if (!cluster)
            return { error: "missing required param 'cluster'" };
        return { cluster };
    },
    rows(params, inputs) {
        const cluster = inputs.clusterBySlug.get(params.cluster);
        if (!cluster)
            return [];
        return buildRows(cluster, inputs);
    },
    rowKey(row) {
        if (isPublished(row)) {
            return row.kind === "published-pillar"
                ? `pub-pillar:${row.content.slug}`
                : `pub:${row.content.slug}`;
        }
        return row.kind === "planned-pillar"
            ? `plan-pillar:${row.planned.slug}`
            : `plan:${row.planned.slug}`;
    },
    columns,
    rowMutationPolicy: "reject",
    render(params, inputs) {
        const cluster = inputs.clusterBySlug.get(params.cluster);
        if (!cluster) {
            const materialized = `_Cluster \`${params.cluster}\` não encontrado._`;
            return { materialized, fingerprint: fingerprint(materialized) };
        }
        const rows = buildRows(cluster, inputs);
        const materialized = (0, auto_block_render_1.renderDeclarativeTable)({
            columns,
            rows,
            params,
            inputs,
            emptyMessage: `| ${inputs.labels.role} | ${inputs.labels.content} | ${inputs.labels.keyword} | ${inputs.labels.intent} | ${inputs.labels.status} | ${inputs.labels.action} | ${inputs.labels.updated} | ${inputs.labels.also_in} |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| — | — | — | — | — | — | — | — |`,
        });
        return { materialized, fingerprint: fingerprint(materialized) };
    },
};
