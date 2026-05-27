"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clustersByArea = void 0;
const auto_block_render_1 = require("../auto-block-render");
function shortenTitle(title) {
    if (!title)
        return title;
    const trimmed = title.trim();
    if (trimmed.length <= 60)
        return trimmed;
    const cut = trimmed.slice(0, 57).replace(/\s+\S*$/, "");
    return `${cut}…`;
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
        key: "name",
        label: () => "Nome",
        read: (cluster) => cluster.yaml.name || cluster.slug,
        write: (cluster, value) => ({
            filePath: cluster.filePath,
            source: "cluster-yaml",
            fieldPath: "name",
            before: cluster.yaml.name ?? null,
            after: typeof value === "string" ? value.trim() : null,
        }),
        parseCell: (cell) => cell.trim(),
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
exports.clustersByArea = {
    name: "agentic-clusters-by-area",
    version: 1,
    parseParams(yaml) {
        const area = typeof yaml.area === "string" && yaml.area.trim() ? yaml.area.trim() : null;
        if (!area)
            return { error: "missing required param 'area'" };
        const rawOrder = typeof yaml.order === "string" ? yaml.order.trim() : "";
        const order = rawOrder === "published desc" || rawOrder === "published-desc"
            ? "published-desc"
            : rawOrder === "published asc" || rawOrder === "published-asc"
                ? "published-asc"
                : "name-asc";
        return { area, order };
    },
    rows(params, inputs) {
        const matching = inputs.clusters.filter((c) => c.yaml.area === params.area && c.yaml.status === "active");
        return [...matching].sort((a, b) => {
            if (params.order === "published-desc" || params.order === "published-asc") {
                const ac = inputs.contentsByCluster.get(a.slug)?.length || 0;
                const bc = inputs.contentsByCluster.get(b.slug)?.length || 0;
                return params.order === "published-desc" ? bc - ac : ac - bc;
            }
            const an = a.yaml.name || a.slug;
            const bn = b.yaml.name || b.slug;
            return an.localeCompare(bn, "pt-BR");
        });
    },
    rowKey(cluster) {
        return cluster.slug;
    },
    columns,
    rowMutationPolicy: "reject",
    rowMutation(params, ctx) {
        if (ctx.action !== "move-to-block")
            return null;
        const targetArea = ctx.targetParams?.area;
        if (typeof targetArea !== "string" || !targetArea.trim())
            return null;
        return {
            filePath: "",
            source: "cluster-yaml",
            fieldPath: `clusters.${ctx.rowKey}.area`,
            before: params.area,
            after: targetArea.trim(),
        };
    },
    render(params, inputs) {
        const rows = this.rows(params, inputs);
        const materialized = (0, auto_block_render_1.renderDeclarativeTable)({
            columns,
            rows,
            params,
            inputs,
            emptyMessage: "_Nenhum cluster ativo nesta área._",
        });
        return { materialized, fingerprint: (0, auto_block_render_1.fingerprint)(materialized) };
    },
};
