"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterIndex = void 0;
const node_crypto_1 = require("node:crypto");
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
exports.clusterIndex = {
    name: "agentic-cluster-index",
    version: 1,
    parseParams() {
        return {};
    },
    render(_params, inputs) {
        const matching = inputs.clusters.filter((c) => c.yaml.status === "active");
        const labels = inputs.labels;
        const totalPublished = inputs.contents.length - inputs.orphanContents.length;
        const totalPlanned = matching.reduce((sum, c) => sum + (c.yaml.planned_satellites?.length || 0), 0);
        const panelLines = [
            `## ${labels.panel}`,
            "",
            `| Indicador | Valor |`,
            `| --- | --- |`,
            `| ${labels.active_clusters} | ${matching.length} |`,
            `| ${labels.published_contents} | ${totalPublished} |`,
            `| ${labels.planned_satellites} | ${totalPlanned} |`,
            `| ${labels.orphans} | ${inputs.orphanContents.length} |`,
            `| ${labels.last_sync} | ${inputs.now} |`,
        ];
        const header = `| ${labels.cluster_col} | ${labels.pillar_col} | ${labels.published_col} | ${labels.planned_col} |`;
        const divider = "| --- | --- | --- | --- |";
        const rows = matching.map((cluster) => {
            const published = inputs.contentsByCluster.get(cluster.slug) || [];
            const planned = cluster.yaml.planned_satellites?.length || 0;
            const pillarContent = cluster.yaml.pillar?.slug
                ? published.find((c) => c.slug === cluster.yaml.pillar?.slug)
                : null;
            const pillarLink = pillarContent
                ? `[${shortenTitle(pillarContent.fm.title) || pillarContent.slug}](../contents/${pillarContent.origin}/${pillarContent.slug}.md)`
                : cluster.yaml.pillar?.slug
                    ? `_${cluster.yaml.pillar.slug}_`
                    : "—";
            const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
            const displayName = cluster.yaml.name || cluster.slug;
            const clusterLink = `[${icon}${displayName}](topic-clusters/${cluster.slug}.md)`;
            // Single flat table: the "área" column was removed from the model.
            return `| ${clusterLink} | ${pillarLink} | ${published.length} | ${planned} |`;
        });
        const tableSection = [
            `## ${labels.active_clusters}`,
            "",
            matching.length === 0 ? "<!-- Nenhum cluster ativo. -->" : `${header}\n${divider}\n${rows.join("\n")}`,
        ];
        const materialized = [...panelLines, "", ...tableSection].join("\n");
        return { materialized, fingerprint: fingerprint(materialized) };
    },
};
