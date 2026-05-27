import { createHash } from "node:crypto";
import type {
  AutoBlockInputs,
  AutoBlockParseError,
  AutoBlockRenderResult,
  AutoBlockType,
} from "../auto-block-registry";
import { renderContentTable } from "../cluster-render";

interface Params {
  cluster: string;
}

function fingerprint(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

export const clusterContent: AutoBlockType<Params> = {
  name: "agentic-cluster-content",
  version: 1,
  parseParams(yaml): Params | AutoBlockParseError {
    const cluster =
      typeof yaml.cluster === "string" && yaml.cluster.trim() ? yaml.cluster.trim() : null;
    if (!cluster) return { error: "missing required param 'cluster'" };
    return { cluster };
  },
  render(params, inputs): AutoBlockRenderResult {
    const cluster = inputs.clusterBySlug.get(params.cluster);
    if (!cluster) {
      const materialized = `_Cluster \`${params.cluster}\` não encontrado._`;
      return { materialized, fingerprint: fingerprint(materialized) };
    }
    const resolvedPilarSlug = cluster.yaml.pilar?.slug ?? null;
    const table = renderContentTable({
      cluster,
      labels: inputs.labels,
      contentsByCluster: inputs.contentsByCluster,
      resolvedPilarSlug,
    });
    return { materialized: table, fingerprint: fingerprint(table) };
  },
};
