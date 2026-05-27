"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterContent = void 0;
const node_crypto_1 = require("node:crypto");
const cluster_render_1 = require("../cluster-render");
function fingerprint(text) {
    return (0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}
exports.clusterContent = {
    name: "agentic-cluster-content",
    version: 1,
    parseParams(yaml) {
        const cluster = typeof yaml.cluster === "string" && yaml.cluster.trim() ? yaml.cluster.trim() : null;
        if (!cluster)
            return { error: "missing required param 'cluster'" };
        return { cluster };
    },
    render(params, inputs) {
        const cluster = inputs.clusterBySlug.get(params.cluster);
        if (!cluster) {
            const materialized = `_Cluster \`${params.cluster}\` não encontrado._`;
            return { materialized, fingerprint: fingerprint(materialized) };
        }
        const resolvedPilarSlug = cluster.yaml.pilar?.slug ?? null;
        const table = (0, cluster_render_1.renderContentTable)({
            cluster,
            labels: inputs.labels,
            contentsByCluster: inputs.contentsByCluster,
            resolvedPilarSlug,
        });
        return { materialized: table, fingerprint: fingerprint(table) };
    },
};
