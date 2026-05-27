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
function pilarLink(cluster, inputs) {
    const published = inputs.contentsByCluster.get(cluster.slug) || [];
    const pilarContent = cluster.yaml.pilar?.slug
        ? published.find((c) => c.slug === cluster.yaml.pilar?.slug)
        : null;
    if (pilarContent) {
        const title = shortenTitle(pilarContent.fm.title) || pilarContent.slug;
        return `[${title}](../conteudos/${pilarContent.origem}/${pilarContent.slug}.md)`;
    }
    if (cluster.yaml.pilar?.slug)
        return `_${cluster.yaml.pilar.slug}_`;
    return "—";
}
const columns = [
    {
        key: "cluster",
        label: (l) => l.cluster_col,
        read: (cluster) => {
            const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
            const displayName = cluster.yaml.nome || cluster.slug;
            return `[${icon}${displayName}](topic-clusters/${cluster.slug}.md)`;
        },
        derived: true,
    },
    {
        key: "nome",
        label: () => "Nome",
        read: (cluster) => cluster.yaml.nome || cluster.slug,
        write: (cluster, value) => ({
            filePath: cluster.filePath,
            source: "cluster-yaml",
            fieldPath: "nome",
            before: cluster.yaml.nome ?? null,
            after: typeof value === "string" ? value.trim() : null,
        }),
        parseCell: (cell) => cell.trim(),
    },
    {
        key: "pilar",
        label: (l) => l.pilar_col,
        read: (cluster, _params, inputs) => pilarLink(cluster, inputs),
        derived: true,
    },
    {
        key: "publicados",
        label: (l) => l.publicados_col,
        read: (cluster, _params, inputs) => String(inputs.contentsByCluster.get(cluster.slug)?.length || 0),
        derived: true,
    },
    {
        key: "planejados",
        label: (l) => l.planejados_col,
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
        const order = rawOrder === "publicados desc" || rawOrder === "publicados-desc"
            ? "publicados-desc"
            : rawOrder === "publicados asc" || rawOrder === "publicados-asc"
                ? "publicados-asc"
                : "name-asc";
        return { area, order };
    },
    rows(params, inputs) {
        const matching = inputs.clusters.filter((c) => c.yaml.area === params.area && c.yaml.status === "active");
        return [...matching].sort((a, b) => {
            if (params.order === "publicados-desc" || params.order === "publicados-asc") {
                const ac = inputs.contentsByCluster.get(a.slug)?.length || 0;
                const bc = inputs.contentsByCluster.get(b.slug)?.length || 0;
                return params.order === "publicados-desc" ? bc - ac : ac - bc;
            }
            const an = a.yaml.nome || a.slug;
            const bn = b.yaml.nome || b.slug;
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
