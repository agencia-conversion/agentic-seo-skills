export type Language = "pt-BR" | "en";

export interface ClusterLabels {
  // Subpage table columns
  papel: string;
  conteudo: string;
  keyword: string;
  intent: string;
  status: string;
  acao: string;
  updated: string;
  tambem_em: string;
  // Role values
  pilar: string;
  satelite: string;
  planejado: string;
  publicado: string;
  // Action values
  manter: string;
  criar: string;
  revisar: string;
  briefing: string;
  // Index panel
  painel: string;
  clusters_ativos: string;
  conteudos_publicados: string;
  satelites_planejados: string;
  orfaos: string;
  ultima_sync: string;
  cluster_col: string;
  area_col: string;
  pilar_col: string;
  publicados_col: string;
  planejados_col: string;
  proximas_acoes: string;
  conteudos_section: string;
  resumo_section: string;
  tese_section: string;
  pilar_section: string;
  evidencia_section: string;
}

export const CLUSTER_LABELS: Record<Language, ClusterLabels> = {
  "pt-BR": {
    papel: "Papel",
    conteudo: "Conteúdo",
    keyword: "Keyword (vol.)",
    intent: "Intenção",
    status: "Status",
    acao: "Ação",
    updated: "Atualizado",
    tambem_em: "Também em",
    pilar: "Pilar",
    satelite: "Satélite",
    planejado: "Planejado",
    publicado: "Publicado",
    manter: "Manter",
    criar: "Criar",
    revisar: "Revisar",
    briefing: "Briefing",
    painel: "Painel",
    clusters_ativos: "Clusters ativos",
    conteudos_publicados: "Conteúdos publicados",
    satelites_planejados: "Satélites planejados",
    orfaos: "Conteúdos órfãos",
    ultima_sync: "Última sincronização",
    cluster_col: "Cluster",
    area_col: "Área",
    pilar_col: "Pilar",
    publicados_col: "Publicados",
    planejados_col: "Planejados",
    proximas_acoes: "Próximas ações",
    conteudos_section: "Conteúdos",
    resumo_section: "Resumo",
    tese_section: "Tese editorial",
    pilar_section: "Pilar",
    evidencia_section: "Evidência",
  },
  en: {
    papel: "Role",
    conteudo: "Content",
    keyword: "Keyword (vol.)",
    intent: "Intent",
    status: "Status",
    acao: "Action",
    updated: "Updated",
    tambem_em: "Also in",
    pilar: "Pillar",
    satelite: "Satellite",
    planejado: "Planned",
    publicado: "Published",
    manter: "Keep",
    criar: "Create",
    revisar: "Review",
    briefing: "Briefing",
    painel: "Panel",
    clusters_ativos: "Active clusters",
    conteudos_publicados: "Published content",
    satelites_planejados: "Planned satellites",
    orfaos: "Orphan content",
    ultima_sync: "Last sync",
    cluster_col: "Cluster",
    area_col: "Area",
    pilar_col: "Pillar",
    publicados_col: "Published",
    planejados_col: "Planned",
    proximas_acoes: "Next actions",
    conteudos_section: "Content",
    resumo_section: "Summary",
    tese_section: "Editorial thesis",
    pilar_section: "Pillar",
    evidencia_section: "Evidence",
  },
};

export function resolveLanguage(input: unknown): Language {
  if (input === "en" || input === "en-US" || input === "en-GB") return "en";
  return "pt-BR";
}

export function getLabels(language: Language): ClusterLabels {
  return CLUSTER_LABELS[language];
}
