"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLUSTER_LABELS = void 0;
exports.resolveLanguage = resolveLanguage;
exports.getLabels = getLabels;
exports.CLUSTER_LABELS = {
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
function resolveLanguage(input) {
    if (input === "en" || input === "en-US" || input === "en-GB")
        return "en";
    return "pt-BR";
}
function getLabels(language) {
    return exports.CLUSTER_LABELS[language];
}
