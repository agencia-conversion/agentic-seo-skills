import type {
  AutoBlockInputs,
  AutoBlockParseError,
  AutoBlockRenderResult,
  AutoBlockType,
  ColumnDef,
} from "../auto-block-registry";
import type { ClusterRecord } from "../cluster-types";
import { fingerprint, renderDeclarativeTable } from "../auto-block-render";

// Single flat table of every active cluster. The "área" concept was removed
// from the model, so this block takes no `area` param. The legacy fence name
// `agentic-clusters-by-area` is kept as a deprecated alias (see below) that
// ignores any `area` param and renders the same full list, so brain pages
// authored before the migration keep rendering instead of breaking.

interface Params {
  order: "name-asc" | "published-desc" | "published-asc";
}

function parseOrder(yaml: Record<string, unknown>): Params["order"] {
  const rawOrder = typeof yaml.order === "string" ? yaml.order.trim() : "";
  if (rawOrder === "published desc" || rawOrder === "published-desc") {
    return "published-desc";
  }
  if (rawOrder === "published asc" || rawOrder === "published-asc") {
    return "published-asc";
  }
  return "name-asc";
}

function activeClusters(inputs: AutoBlockInputs, order: Params["order"]): ClusterRecord[] {
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

function pillarLink(cluster: ClusterRecord, inputs: AutoBlockInputs): string {
  const published = inputs.contentsByCluster.get(cluster.slug) || [];
  const pillarContent = cluster.yaml.pillar?.slug
    ? published.find((c) => c.slug === cluster.yaml.pillar?.slug)
    : null;
  if (pillarContent) {
    const title = shortenTitle(pillarContent.fm.title) || pillarContent.slug;
    return `[${title}](../contents/${pillarContent.origin}/${pillarContent.slug}.md)`;
  }
  if (cluster.yaml.pillar?.slug) return `_${cluster.yaml.pillar.slug}_`;
  return "—";
}

function shortenTitle(title?: string): string | undefined {
  if (!title) return title;
  const trimmed = title.trim();
  if (trimmed.length <= 60) return trimmed;
  const cut = trimmed.slice(0, 57).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

const columns: ColumnDef<Params, ClusterRecord>[] = [
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
    read: (cluster, _params, inputs) =>
      String(inputs.contentsByCluster.get(cluster.slug)?.length || 0),
    derived: true,
  },
  {
    key: "planned",
    label: (l) => l.planned_col,
    read: (cluster) => String(cluster.yaml.planned_satellites?.length || 0),
    derived: true,
  },
];

function render(params: Params, inputs: AutoBlockInputs): AutoBlockRenderResult {
  const rows = activeClusters(inputs, params.order);
  const materialized = renderDeclarativeTable({
    columns,
    rows,
    params,
    inputs,
    emptyMessage: "_Nenhum cluster ativo._",
  });
  return { materialized, fingerprint: fingerprint(materialized) };
}

// Canonical block: one flat table of all active clusters, sorted by name-asc.
export const clusters: AutoBlockType<Params, ClusterRecord> = {
  name: "agentic-clusters",
  version: 1,
  parseParams(yaml): Params | AutoBlockParseError {
    return { order: parseOrder(yaml) };
  },
  rows(params, inputs): ClusterRecord[] {
    return activeClusters(inputs, params.order);
  },
  rowKey(cluster): string {
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
export const clustersByArea: AutoBlockType<Params, ClusterRecord> = {
  ...clusters,
  name: "agentic-clusters-by-area",
};
