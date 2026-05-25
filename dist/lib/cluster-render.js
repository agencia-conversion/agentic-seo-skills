"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContentRows = buildContentRows;
exports.renderContentTable = renderContentTable;
exports.renderContentBlock = renderContentBlock;
exports.renderIndexBlock = renderIndexBlock;
const cluster_types_1 = require("./cluster-types");
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
function renderKeyword(keyword, volume) {
    if (!keyword)
        return "—";
    if (typeof volume === "number" && volume > 0) {
        const display = volume >= 1000 ? `${Math.round(volume / 100) / 10}k` : `${volume}`;
        return `${keyword} (${display})`;
    }
    return keyword;
}
function statusLabel(value, labels) {
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
function acaoLabel(value, labels) {
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
function relPathToContent(content) {
    return `../../conteudos/${content.origem}/${content.slug}.md`;
}
function papelLabel(value, labels) {
    return value === "pilar" ? labels.pilar : labels.satelite;
}
function tambemEmCol(content, clusterSlug) {
    const others = (content.fm.clusters || []).filter((c) => c !== clusterSlug);
    if (others.length === 0)
        return "—";
    return others.join(", ");
}
function publishedRow(content, cluster, labels, forcePilar, override) {
    const fmPapel = content.fm.papel?.[cluster.slug] || "satelite";
    const papel = forcePilar ? "pilar" : fmPapel;
    const title = override?.display_title || shortenTitle(content.fm.title) || content.slug;
    const link = `[${title}](${relPathToContent(content)})`;
    const keyword = override?.keyword ??
        (forcePilar ? cluster.yaml.pilar?.keyword : undefined) ??
        undefined;
    const volume = override?.volume ??
        (forcePilar ? cluster.yaml.pilar?.volume : undefined) ??
        undefined;
    const intent = override?.intent ||
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
function plannedRow(planned, labels) {
    const papel = planned.papel || "satelite";
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
function pilarPlannedRow(cluster, labels) {
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
function buildContentRows(input) {
    const { cluster, labels, contentsByCluster, resolvedPilarSlug } = input;
    const rows = [];
    const published = contentsByCluster.get(cluster.slug) || [];
    const overrides = cluster.yaml.satelite_overrides || {};
    const pilarContent = resolvedPilarSlug
        ? published.find((c) => c.slug === resolvedPilarSlug)
        : null;
    if (pilarContent) {
        rows.push(publishedRow(pilarContent, cluster, labels, true, overrides[pilarContent.slug]));
    }
    else if (cluster.yaml.pilar?.slug && cluster.yaml.status === "active") {
        rows.push(pilarPlannedRow(cluster.yaml, labels));
    }
    const sortedPublished = [...published].sort((a, b) => (a.fm.title || a.slug).localeCompare(b.fm.title || b.slug));
    for (const content of sortedPublished) {
        if (pilarContent && content.slug === pilarContent.slug)
            continue;
        rows.push(publishedRow(content, cluster, labels, false, overrides[content.slug]));
    }
    for (const planned of cluster.yaml.planned_satellites || []) {
        rows.push(plannedRow(planned, labels));
    }
    return rows;
}
function renderContentTable(input) {
    const { labels } = input;
    const rows = buildContentRows(input);
    const header = `| ${labels.papel} | ${labels.conteudo} | ${labels.keyword} | ${labels.intent} | ${labels.status} | ${labels.acao} | ${labels.updated} | ${labels.tambem_em} |`;
    const divider = "| --- | --- | --- | --- | --- | --- | --- | --- |";
    if (rows.length === 0) {
        return `${header}\n${divider}\n| — | — | — | — | — | — | — | — |`;
    }
    const body = rows
        .map((r) => `| ${r.papel} | ${r.conteudo} | ${r.keyword} | ${r.intent} | ${r.status} | ${r.acao} | ${r.updated} | ${r.tambem_em} |`)
        .join("\n");
    return `${header}\n${divider}\n${body}`;
}
function renderContentBlock(input) {
    const table = renderContentTable(input);
    return [
        cluster_types_1.SENTINELS.contentBegin,
        `## ${input.labels.conteudos_section}`,
        "",
        table,
        "",
        cluster_types_1.SENTINELS.contentEnd,
    ].join("\n");
}
function indexClusterRow(cluster, labels, contentsByCluster) {
    const published = contentsByCluster.get(cluster.slug) || [];
    const planned = (cluster.yaml.planned_satellites || []).length;
    const pilarContent = cluster.yaml.pilar?.slug
        ? published.find((c) => c.slug === cluster.yaml.pilar?.slug)
        : null;
    const pilarLink = pilarContent
        ? `[${shortenTitle(pilarContent.fm.title) || pilarContent.slug}](../conteudos/${pilarContent.origem}/${pilarContent.slug}.md)`
        : cluster.yaml.pilar?.slug
            ? `_${cluster.yaml.pilar.slug}_`
            : "—";
    const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
    const clusterLink = `[${icon}${cluster.yaml.nome}](topic-clusters/${cluster.slug}.md)`;
    const area = cluster.yaml.area_nome || cluster.yaml.area || "—";
    return `| ${clusterLink} | ${area} | ${pilarLink} | ${published.length} | ${planned} |`;
}
function renderIndexBlock(input) {
    const { clusters, labels, contentsByCluster, orphanCount, plannedCount, publishedCount, syncTimestamp, } = input;
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
    const rows = activeClusters.length === 0
        ? "<!-- Nenhum cluster ativo. -->"
        : activeClusters
            .map((c) => indexClusterRow(c, labels, contentsByCluster))
            .join("\n");
    const tableBlock = activeClusters.length === 0
        ? `## ${labels.clusters_ativos}\n\n${rows}`
        : `## ${labels.clusters_ativos}\n\n${header}\n${divider}\n${rows}`;
    return [
        cluster_types_1.SENTINELS.indexBegin,
        panel,
        "",
        tableBlock,
        "",
        cluster_types_1.SENTINELS.indexEnd,
    ].join("\n");
}
