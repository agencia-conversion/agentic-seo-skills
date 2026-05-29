"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clustersByArea = exports.clusters = void 0;
const auto_block_render_1 = require("../auto-block-render");
function parseOrder(yaml) {
    const rawOrder = typeof yaml.order === "string" ? yaml.order.trim() : "";
    if (rawOrder === "published desc" || rawOrder === "published-desc") {
        return "published-desc";
    }
    if (rawOrder === "published asc" || rawOrder === "published-asc") {
        return "published-asc";
    }
    return "name-asc";
}
function activeClusters(inputs, order) {
    const active = inputs.clusters.filter((c) => c.yaml.status === "active");
    return [...active].sort((a, b) => {
        if (order === "published-desc" || order === "published-asc") {
            const ac = inputs.contentsByCluster.get(a.slug)?.length || 0;
            const bc = inputs.contentsByCluster.get(b.slug)?.length || 0;
            return order === "published-desc" ? bc - ac : ac - bc;
        }
        const an = a.yaml.name || a.slug;
        const bn = b.yaml.name || b.slug;
        return an.localeCompare(bn, "pt-BR");
    });
}
function pillarLink(cluster, inputs) {
    const published = inputs.contentsByCluster.get(cluster.slug) || [];
    const pillarContent = cluster.yaml.pillar?.slug
        ? published.find((c) => c.slug === cluster.yaml.pillar?.slug)
        : null;
    if (pillarContent) {
        const title = shortenTitle(pillarContent.fm.title) || pillarContent.slug;
        return `[${title}](../contents/${pillarContent.origin}/${pillarContent.slug}.md)`;
    }
    if (cluster.yaml.pillar?.slug)
        return `_${cluster.yaml.pillar.slug}_`;
    return "—";
}
function shortenTitle(title) {
    if (!title)
        return title;
    const trimmed = title.trim();
    if (trimmed.length <= 60)
        return trimmed;
    const cut = trimmed.slice(0, 57).replace(/\s+\S*$/, "");
    return `${cut}…`;
}
const columns = [
    {
        key: "cluster",
        label: (l) => l.cluster_col,
        read: (cluster) => {
            const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
            const displayName = cluster.yaml.name || cluster.slug;
            return `[${icon}${displayName}](topic-clusters/${cluster.slug}.md)`;
        },
        derived: true,
    },
    {
        key: "pillar",
        label: (l) => l.pillar_col,
        read: (cluster, _params, inputs) => pillarLink(cluster, inputs),
        derived: true,
    },
    {
        key: "published",
        label: (l) => l.published_col,
        read: (cluster, _params, inputs) => String(inputs.contentsByCluster.get(cluster.slug)?.length || 0),
        derived: true,
    },
    {
        key: "planned",
        label: (l) => l.planned_col,
        read: (cluster) => String(cluster.yaml.planned_satellites?.length || 0),
        derived: true,
    },
];
function render(params, inputs) {
    const rows = activeClusters(inputs, params.order);
    const materialized = (0, auto_block_render_1.renderDeclarativeTable)({
        columns,
        rows,
        params,
        inputs,
        emptyMessage: "_Nenhum cluster ativo._",
    });
    return { materialized, fingerprint: (0, auto_block_render_1.fingerprint)(materialized) };
}
// Canonical block: one flat table of all active clusters, sorted by name-asc.
exports.clusters = {
    name: "agentic-clusters",
    version: 1,
    parseParams(yaml) {
        return { order: parseOrder(yaml) };
    },
    rows(params, inputs) {
        return activeClusters(inputs, params.order);
    },
    rowKey(cluster) {
        return cluster.slug;
    },
    columns,
    rowMutationPolicy: "reject",
    render,
};
// Deprecated alias. Kept so brain pages authored with `agentic-clusters-by-area`
// (which used to require an `area` param) keep rendering after the model lost the
// área concept. The `area` param is parsed but ignored; output is the full flat
// table, identical to `agentic-clusters`.
exports.clustersByArea = {
    ...exports.clusters,
    name: "agentic-clusters-by-area",
};
