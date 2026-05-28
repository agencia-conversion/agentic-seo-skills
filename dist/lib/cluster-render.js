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
function cleanString(value) {
    const cleaned = String(value ?? "").trim();
    return cleaned || undefined;
}
function cleanVolume(value) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0)
        return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0)
            return parsed;
    }
    return undefined;
}
function statusLabel(value, labels) {
    switch (value) {
        case "published":
            return labels.published;
        case "planned":
            return labels.planned;
        default:
            return value || "—";
    }
}
function actionLabel(value, labels) {
    switch (value) {
        case "keep":
            return labels.keep;
        case "create":
            return labels.create;
        case "review":
            return labels.review;
        case "briefing":
            return labels.briefing;
        default:
            return value || "—";
    }
}
function relPathToContent(content) {
    return `../../contents/${content.origin}/${content.slug}.md`;
}
function roleLabel(value, labels) {
    return value === "pillar" ? labels.pillar : labels.satellite;
}
function alsoInCol(content, clusterSlug) {
    const others = (content.fm.clusters || []).filter((c) => c !== clusterSlug);
    if (others.length === 0)
        return "—";
    return others.join(", ");
}
function publishedRow(content, cluster, labels, forcePillar, override) {
    const fmRole = content.fm.role?.[cluster.slug] || "satellite";
    const role = forcePillar ? "pillar" : fmRole;
    const title = override?.display_title || shortenTitle(content.fm.title) || content.slug;
    const link = `[${title}](${relPathToContent(content)})`;
    const keyword = override?.keyword ??
        cleanString(content.fm.keyword) ??
        (forcePillar ? cluster.yaml.pillar?.keyword : undefined) ??
        undefined;
    const volume = override?.volume ??
        cleanVolume(content.fm.volume) ??
        (forcePillar ? cluster.yaml.pillar?.volume : undefined) ??
        undefined;
    const intent = override?.intent ||
        cleanString(content.fm.intent) ||
        (forcePillar ? cluster.yaml.pillar?.intent : undefined) ||
        "—";
    return {
        role: roleLabel(role, labels),
        content: link,
        keyword: renderKeyword(keyword, volume),
        intent: String(intent),
        status: labels.published,
        action: "—",
        updated: content.fm.published_at || "—",
        also_in: alsoInCol(content, cluster.slug),
    };
}
function plannedRow(planned, labels) {
    const role = planned.role || "satellite";
    return {
        role: roleLabel(role, labels),
        content: `_${planned.slug}_`,
        keyword: renderKeyword(planned.keyword, planned.volume),
        intent: String(planned.intent || "—"),
        status: labels.planned,
        action: labels.briefing,
        updated: "—",
        also_in: "—",
    };
}
function pillarPlannedRow(cluster, labels) {
    const p = cluster.pillar;
    if (!p) {
        return {
            role: labels.pillar,
            content: "—",
            keyword: "—",
            intent: "—",
            status: labels.planned,
            action: labels.briefing,
            updated: "—",
            also_in: "—",
        };
    }
    return {
        role: labels.pillar,
        content: `_${p.slug}_`,
        keyword: renderKeyword(p.keyword, p.volume),
        intent: String(p.intent || "—"),
        status: labels.planned,
        action: labels.briefing,
        updated: "—",
        also_in: "—",
    };
}
function buildContentRows(input) {
    const { cluster, labels, contentsByCluster, resolvedPillarSlug } = input;
    const rows = [];
    const published = contentsByCluster.get(cluster.slug) || [];
    const overrides = cluster.yaml.satellite_overrides || {};
    const pillarContent = resolvedPillarSlug
        ? published.find((c) => c.slug === resolvedPillarSlug)
        : null;
    if (pillarContent) {
        rows.push(publishedRow(pillarContent, cluster, labels, true, overrides[pillarContent.slug]));
    }
    else if (cluster.yaml.pillar?.slug && cluster.yaml.status === "active") {
        rows.push(pillarPlannedRow(cluster.yaml, labels));
    }
    const sortedPublished = [...published].sort((a, b) => (a.fm.title || a.slug).localeCompare(b.fm.title || b.slug));
    for (const content of sortedPublished) {
        if (pillarContent && content.slug === pillarContent.slug)
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
    const header = `| ${labels.role} | ${labels.content} | ${labels.keyword} | ${labels.intent} | ${labels.status} | ${labels.action} | ${labels.updated} | ${labels.also_in} |`;
    const divider = "| --- | --- | --- | --- | --- | --- | --- | --- |";
    if (rows.length === 0) {
        return `${header}\n${divider}\n| — | — | — | — | — | — | — | — |`;
    }
    const body = rows
        .map((r) => `| ${r.role} | ${r.content} | ${r.keyword} | ${r.intent} | ${r.status} | ${r.action} | ${r.updated} | ${r.also_in} |`)
        .join("\n");
    return `${header}\n${divider}\n${body}`;
}
function renderContentBlock(input) {
    const table = renderContentTable(input);
    return [
        cluster_types_1.SENTINELS.contentBegin,
        `## ${input.labels.contents_section}`,
        "",
        table,
        "",
        cluster_types_1.SENTINELS.contentEnd,
    ].join("\n");
}
function indexClusterRow(cluster, labels, contentsByCluster) {
    const published = contentsByCluster.get(cluster.slug) || [];
    const planned = (cluster.yaml.planned_satellites || []).length;
    const pillarContent = cluster.yaml.pillar?.slug
        ? published.find((c) => c.slug === cluster.yaml.pillar?.slug)
        : null;
    const pillarLink = pillarContent
        ? `[${shortenTitle(pillarContent.fm.title) || pillarContent.slug}](../contents/${pillarContent.origin}/${pillarContent.slug}.md)`
        : cluster.yaml.pillar?.slug
            ? `_${cluster.yaml.pillar.slug}_`
            : "—";
    const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
    const clusterLink = `[${icon}${cluster.yaml.name}](topic-clusters/${cluster.slug}.md)`;
    const area = cluster.yaml.area_name || cluster.yaml.area || "—";
    return `| ${clusterLink} | ${area} | ${pillarLink} | ${published.length} | ${planned} |`;
}
function renderIndexBlock(input) {
    const { clusters, labels, contentsByCluster, orphanCount, plannedCount, publishedCount, syncTimestamp, } = input;
    const activeClusters = clusters.filter((c) => c.yaml.status === "active");
    const panel = [
        `## ${labels.panel}`,
        "",
        `| Indicador | Valor |`,
        `| --- | --- |`,
        `| ${labels.active_clusters} | ${activeClusters.length} |`,
        `| ${labels.published_contents} | ${publishedCount} |`,
        `| ${labels.planned_satellites} | ${plannedCount} |`,
        `| ${labels.orphans} | ${orphanCount} |`,
        `| ${labels.last_sync} | ${syncTimestamp} |`,
    ].join("\n");
    const header = `| ${labels.cluster_col} | ${labels.area_col} | ${labels.pillar_col} | ${labels.published_col} | ${labels.planned_col} |`;
    const divider = "| --- | --- | --- | --- | --- |";
    const rows = activeClusters.length === 0
        ? "<!-- Nenhum cluster ativo. -->"
        : activeClusters
            .map((c) => indexClusterRow(c, labels, contentsByCluster))
            .join("\n");
    const tableBlock = activeClusters.length === 0
        ? `## ${labels.active_clusters}\n\n${rows}`
        : `## ${labels.active_clusters}\n\n${header}\n${divider}\n${rows}`;
    return [
        cluster_types_1.SENTINELS.indexBegin,
        panel,
        "",
        tableBlock,
        "",
        cluster_types_1.SENTINELS.indexEnd,
    ].join("\n");
}
