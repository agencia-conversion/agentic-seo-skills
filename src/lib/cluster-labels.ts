export type Language = "pt-BR" | "en";

export interface ClusterLabels {
  // Subpage table columns
  role: string;
  content: string;
  keyword: string;
  intent: string;
  status: string;
  action: string;
  updated: string;
  also_in: string;
  // Role values
  pillar: string;
  satellite: string;
  planned: string;
  published: string;
  // Action values
  keep: string;
  create: string;
  review: string;
  briefing: string;
  // Index panel
  panel: string;
  active_clusters: string;
  published_contents: string;
  planned_satellites: string;
  orphans: string;
  last_sync: string;
  cluster_col: string;
  area_col: string;
  pillar_col: string;
  published_col: string;
  planned_col: string;
  next_actions: string;
  contents_section: string;
  summary_section: string;
  thesis_section: string;
  pillar_section: string;
  evidence_section: string;
}

export const CLUSTER_LABELS: Record<Language, ClusterLabels> = {
  "pt-BR": {
    role: "Papel",
    content: "Conteúdo",
    keyword: "Keyword (vol.)",
    intent: "Intenção",
    status: "Status",
    action: "Ação",
    updated: "Atualizado",
    also_in: "Também em",
    pillar: "Pilar",
    satellite: "Satélite",
    planned: "Planejado",
    published: "Publicado",
    keep: "Manter",
    create: "Criar",
    review: "Revisar",
    briefing: "Briefing",
    panel: "Painel",
    active_clusters: "Clusters ativos",
    published_contents: "Conteúdos publicados",
    planned_satellites: "Satélites planejados",
    orphans: "Conteúdos órfãos",
    last_sync: "Última sincronização",
    cluster_col: "Cluster",
    area_col: "Área",
    pillar_col: "Pilar",
    published_col: "Publicados",
    planned_col: "Planejados",
    next_actions: "Próximas ações",
    contents_section: "Conteúdos",
    summary_section: "Resumo",
    thesis_section: "Tese editorial",
    pillar_section: "Pilar",
    evidence_section: "Evidência",
  },
  en: {
    role: "Role",
    content: "Content",
    keyword: "Keyword (vol.)",
    intent: "Intent",
    status: "Status",
    action: "Action",
    updated: "Updated",
    also_in: "Also in",
    pillar: "Pillar",
    satellite: "Satellite",
    planned: "Planned",
    published: "Published",
    keep: "Keep",
    create: "Create",
    review: "Review",
    briefing: "Briefing",
    panel: "Panel",
    active_clusters: "Active clusters",
    published_contents: "Published content",
    planned_satellites: "Planned satellites",
    orphans: "Orphan content",
    last_sync: "Last sync",
    cluster_col: "Cluster",
    area_col: "Area",
    pillar_col: "Pillar",
    published_col: "Published",
    planned_col: "Planned",
    next_actions: "Next actions",
    contents_section: "Content",
    summary_section: "Summary",
    thesis_section: "Editorial thesis",
    pillar_section: "Pillar",
    evidence_section: "Evidence",
  },
};

export function resolveLanguage(input: unknown): Language {
  if (input === "en" || input === "en-US" || input === "en-GB") return "en";
  return "pt-BR";
}

export function getLabels(language: Language): ClusterLabels {
  return CLUSTER_LABELS[language];
}
