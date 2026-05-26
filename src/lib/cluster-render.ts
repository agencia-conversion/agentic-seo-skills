import { SENTINELS } from "./cluster-types";
import type {
  ClusterLabels,
  Language,
} from "./cluster-labels";
import type {
  ClusterRecord,
  ClusterYaml,
  ContentRecord,
  Papel,
  PlannedSatellite,
  SateliteOverride,
} from "./cluster-types";

export interface RenderRow {
  papel: string;
  conteudo: string;
  keyword: string;
  intent: string;
  status: string;
  acao: string;
  updated: string;
  tambem_em: string;
}

export interface RenderInputs {
  cluster: ClusterRecord;
  labels: ClusterLabels;
  contentsByCluster: Map<string, ContentRecord[]>;
  resolvedPilarSlug: string | null;
}

export interface IndexInputs {
  clusters: ClusterRecord[];
  labels: ClusterLabels;
  contentsByCluster: Map<string, ContentRecord[]>;
  orphanCount: number;
  plannedCount: number;
  publishedCount: number;
  syncTimestamp: string;
}

function shortenTitle(title: string | undefined | null): string {
  if (!title) return "";
  if (title.length <= 60) return title;
  const cut = title.search(/[:—–-]\s/);
  if (cut > 0 && cut < 65) return title.slice(0, cut).trim();
  return title;
}

function renderKeyword(
  keyword: string | undefined | null,
  volume: number | undefined | null,
): string {
  if (!keyword) return "—";
  if (typeof volume === "number" && volume > 0) {
    const display = volume >= 1000 ? `${Math.round(volume / 100) / 10}k` : `${volume}`;
    return `${keyword} (${display})`;
  }
  return keyword;
}

function cleanString(value: unknown): string | undefined {
  const cleaned = String(value ?? "").trim();
  return cleaned || undefined;
}

function cleanVolume(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function statusLabel(value: string | undefined, labels: ClusterLabels): string {
  switch (value) {
    case "published":
    case "publicado":
      return labels.publicado;
    case "planned":
    case "planejado":
      return labels.planejado;
    default:
      return value || "—";
  }
}

function acaoLabel(value: string | undefined, labels: ClusterLabels): string {
  switch (value) {
    case "manter":
      return labels.manter;
    case "criar":
      return labels.criar;
    case "revisar":
      return labels.revisar;
    case "briefing":
      return labels.briefing;
    default:
      return value || "—";
  }
}

function relPathToContent(content: ContentRecord): string {
  return `../../content/${content.origem}/${content.slug}.md`;
}

function papelLabel(value: Papel, labels: ClusterLabels): string {
  return value === "pilar" ? labels.pilar : labels.satelite;
}

function tambemEmCol(
  content: ContentRecord,
  clusterSlug: string,
): string {
  const others = (content.fm.clusters || []).filter((c) => c !== clusterSlug);
  if (others.length === 0) return "—";
  return others.join(", ");
}

function publishedRow(
  content: ContentRecord,
  cluster: ClusterRecord,
  labels: ClusterLabels,
  forcePilar: boolean,
  override: SateliteOverride | undefined,
): RenderRow {
  const fmPapel = content.fm.papel?.[cluster.slug] || "satelite";
  const papel: Papel = forcePilar ? "pilar" : fmPapel;
  const title = override?.display_title || shortenTitle(content.fm.title) || content.slug;
  const link = `[${title}](${relPathToContent(content)})`;
  const keyword =
    override?.keyword ??
    cleanString(content.fm.keyword) ??
    (forcePilar ? cluster.yaml.pilar?.keyword : undefined) ??
    undefined;
  const volume =
    override?.volume ??
    cleanVolume(content.fm.volume) ??
    (forcePilar ? cluster.yaml.pilar?.volume : undefined) ??
    undefined;
  const intent =
    override?.intent ||
    cleanString(content.fm.intent) ||
    (forcePilar ? cluster.yaml.pilar?.intent : undefined) ||
    "—";
  return {
    papel: papelLabel(papel, labels),
    conteudo: link,
    keyword: renderKeyword(keyword, volume),
    intent: String(intent),
    status: labels.publicado,
    acao: "—",
    updated: content.fm.published_at || "—",
    tambem_em: tambemEmCol(content, cluster.slug),
  };
}

function plannedRow(
  planned: PlannedSatellite,
  labels: ClusterLabels,
): RenderRow {
  const papel: Papel = planned.papel || "satelite";
  return {
    papel: papelLabel(papel, labels),
    conteudo: `_${planned.slug}_`,
    keyword: renderKeyword(planned.keyword, planned.volume),
    intent: String(planned.intent || "—"),
    status: labels.planejado,
    acao: labels.briefing,
    updated: "—",
    tambem_em: "—",
  };
}

function pilarPlannedRow(
  cluster: ClusterYaml,
  labels: ClusterLabels,
): RenderRow {
  const p = cluster.pilar;
  if (!p) {
    return {
      papel: labels.pilar,
      conteudo: "—",
      keyword: "—",
      intent: "—",
      status: labels.planejado,
      acao: labels.briefing,
      updated: "—",
      tambem_em: "—",
    };
  }
  return {
    papel: labels.pilar,
    conteudo: `_${p.slug}_`,
    keyword: renderKeyword(p.keyword, p.volume),
    intent: String(p.intent || "—"),
    status: labels.planejado,
    acao: labels.briefing,
    updated: "—",
    tambem_em: "—",
  };
}

export function buildContentRows(input: RenderInputs): RenderRow[] {
  const { cluster, labels, contentsByCluster, resolvedPilarSlug } = input;
  const rows: RenderRow[] = [];
  const published = contentsByCluster.get(cluster.slug) || [];
  const overrides = cluster.yaml.satelite_overrides || {};

  const pilarContent = resolvedPilarSlug
    ? published.find((c) => c.slug === resolvedPilarSlug)
    : null;

  if (pilarContent) {
    rows.push(
      publishedRow(pilarContent, cluster, labels, true, overrides[pilarContent.slug]),
    );
  } else if (cluster.yaml.pilar?.slug && cluster.yaml.status === "active") {
    rows.push(pilarPlannedRow(cluster.yaml, labels));
  }

  const sortedPublished = [...published].sort((a, b) =>
    (a.fm.title || a.slug).localeCompare(b.fm.title || b.slug),
  );
  for (const content of sortedPublished) {
    if (pilarContent && content.slug === pilarContent.slug) continue;
    rows.push(publishedRow(content, cluster, labels, false, overrides[content.slug]));
  }

  for (const planned of cluster.yaml.planned_satellites || []) {
    rows.push(plannedRow(planned, labels));
  }

  return rows;
}

export function renderContentTable(input: RenderInputs): string {
  const { labels } = input;
  const rows = buildContentRows(input);
  const header = `| ${labels.papel} | ${labels.conteudo} | ${labels.keyword} | ${labels.intent} | ${labels.status} | ${labels.acao} | ${labels.updated} | ${labels.tambem_em} |`;
  const divider = "| --- | --- | --- | --- | --- | --- | --- | --- |";
  if (rows.length === 0) {
    return `${header}\n${divider}\n| — | — | — | — | — | — | — | — |`;
  }
  const body = rows
    .map(
      (r) =>
        `| ${r.papel} | ${r.conteudo} | ${r.keyword} | ${r.intent} | ${r.status} | ${r.acao} | ${r.updated} | ${r.tambem_em} |`,
    )
    .join("\n");
  return `${header}\n${divider}\n${body}`;
}

export function renderContentBlock(input: RenderInputs): string {
  const table = renderContentTable(input);
  return [
    SENTINELS.contentBegin,
    `## ${input.labels.conteudos_section}`,
    "",
    table,
    "",
    SENTINELS.contentEnd,
  ].join("\n");
}

function indexClusterRow(
  cluster: ClusterRecord,
  labels: ClusterLabels,
  contentsByCluster: Map<string, ContentRecord[]>,
): string {
  const published = contentsByCluster.get(cluster.slug) || [];
  const planned = (cluster.yaml.planned_satellites || []).length;
  const pilarContent = cluster.yaml.pilar?.slug
    ? published.find((c) => c.slug === cluster.yaml.pilar?.slug)
    : null;
  const pilarLink = pilarContent
    ? `[${shortenTitle(pilarContent.fm.title) || pilarContent.slug}](../content/${pilarContent.origem}/${pilarContent.slug}.md)`
    : cluster.yaml.pilar?.slug
      ? `_${cluster.yaml.pilar.slug}_`
      : "—";
  const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
  const clusterLink = `[${icon}${cluster.yaml.nome}](topic-clusters/${cluster.slug}.md)`;
  const area = cluster.yaml.area_nome || cluster.yaml.area || "—";
  return `| ${clusterLink} | ${area} | ${pilarLink} | ${published.length} | ${planned} |`;
}

export function renderIndexBlock(input: IndexInputs): string {
  const {
    clusters,
    labels,
    contentsByCluster,
    orphanCount,
    plannedCount,
    publishedCount,
    syncTimestamp,
  } = input;
  const activeClusters = clusters.filter((c) => c.yaml.status === "active");
  const panel = [
    `## ${labels.painel}`,
    "",
    `| Indicador | Valor |`,
    `| --- | --- |`,
    `| ${labels.clusters_ativos} | ${activeClusters.length} |`,
    `| ${labels.conteudos_publicados} | ${publishedCount} |`,
    `| ${labels.satelites_planejados} | ${plannedCount} |`,
    `| ${labels.orfaos} | ${orphanCount} |`,
    `| ${labels.ultima_sync} | ${syncTimestamp} |`,
  ].join("\n");

  const header = `| ${labels.cluster_col} | ${labels.area_col} | ${labels.pilar_col} | ${labels.publicados_col} | ${labels.planejados_col} |`;
  const divider = "| --- | --- | --- | --- | --- |";
  const rows =
    activeClusters.length === 0
      ? "<!-- Nenhum cluster ativo. -->"
      : activeClusters
          .map((c) => indexClusterRow(c, labels, contentsByCluster))
          .join("\n");
  const tableBlock =
    activeClusters.length === 0
      ? `## ${labels.clusters_ativos}\n\n${rows}`
      : `## ${labels.clusters_ativos}\n\n${header}\n${divider}\n${rows}`;

  return [
    SENTINELS.indexBegin,
    panel,
    "",
    tableBlock,
    "",
    SENTINELS.indexEnd,
  ].join("\n");
}
