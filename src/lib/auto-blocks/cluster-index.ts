import { createHash } from "node:crypto";
import type {
  AutoBlockInputs,
  AutoBlockParseError,
  AutoBlockRenderResult,
  AutoBlockType,
} from "../auto-block-registry";

function fingerprint(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

function shortenTitle(title: string | undefined | null): string {
  if (!title) return "";
  if (title.length <= 60) return title;
  const cut = title.search(/[:—–-]\s/);
  if (cut > 0 && cut < 65) return title.slice(0, cut).trim();
  return title;
}

interface Params {
  // No required params — index covers all active clusters.
  // Optional: filter by area if user wants a scoped index.
  area?: string;
}

export const clusterIndex: AutoBlockType<Params> = {
  name: "agentic-cluster-index",
  version: 1,
  parseParams(yaml): Params | AutoBlockParseError {
    const area =
      typeof yaml.area === "string" && yaml.area.trim() ? yaml.area.trim() : undefined;
    return { area };
  },
  render(params, inputs): AutoBlockRenderResult {
    const all = inputs.clusters.filter((c) => c.yaml.status === "active");
    const matching = params.area
      ? all.filter((c) => c.yaml.area === params.area)
      : all;

    const labels = inputs.labels;
    const totalPublished = inputs.contents.length - inputs.orphanContents.length;
    const totalPlanned = matching.reduce(
      (sum, c) => sum + (c.yaml.planned_satellites?.length || 0),
      0,
    );

    const panelLines = [
      `## ${labels.painel}`,
      "",
      `| Indicador | Valor |`,
      `| --- | --- |`,
      `| ${labels.clusters_ativos} | ${matching.length} |`,
      `| ${labels.conteudos_publicados} | ${totalPublished} |`,
      `| ${labels.satelites_planejados} | ${totalPlanned} |`,
      `| ${labels.orfaos} | ${inputs.orphanContents.length} |`,
      `| ${labels.ultima_sync} | ${inputs.now} |`,
    ];

    const header = `| ${labels.cluster_col} | ${labels.area_col} | ${labels.pilar_col} | ${labels.publicados_col} | ${labels.planejados_col} |`;
    const divider = "| --- | --- | --- | --- | --- |";
    const rows = matching.map((cluster) => {
      const published = inputs.contentsByCluster.get(cluster.slug) || [];
      const planned = cluster.yaml.planned_satellites?.length || 0;
      const pilarContent = cluster.yaml.pilar?.slug
        ? published.find((c) => c.slug === cluster.yaml.pilar?.slug)
        : null;
      const pilarLink = pilarContent
        ? `[${shortenTitle(pilarContent.fm.title) || pilarContent.slug}](../conteudos/${pilarContent.origem}/${pilarContent.slug}.md)`
        : cluster.yaml.pilar?.slug
          ? `_${cluster.yaml.pilar.slug}_`
          : "—";
      const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
      const displayName = cluster.yaml.nome || cluster.slug;
      const clusterLink = `[${icon}${displayName}](topic-clusters/${cluster.slug}.md)`;
      const area = cluster.yaml.area_nome || cluster.yaml.area || "—";
      return `| ${clusterLink} | ${area} | ${pilarLink} | ${published.length} | ${planned} |`;
    });

    const tableSection = [
      `## ${labels.clusters_ativos}`,
      "",
      matching.length === 0 ? "<!-- Nenhum cluster ativo. -->" : `${header}\n${divider}\n${rows.join("\n")}`,
    ];

    const materialized = [...panelLines, "", ...tableSection].join("\n");
    return { materialized, fingerprint: fingerprint(materialized) };
  },
};
