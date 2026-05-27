import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { parseFrontmatter, appendLogEntry } from "./brain-page.mjs";
import { loadBrainSubpageTemplate } from "./brain-templates.mjs";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function writeYamlFile(filePath, data) {
  ensureDir(filePath);
  writeFileSync(filePath, yamlStringify(data, { lineWidth: 0 }), "utf8");
}

export function writeClusterYaml(root, entry) {
  const filePath = join(root, "project", "clusters", entry.slug, "cluster.yaml");
  let existing = {};
  if (existsSync(filePath)) {
    try {
      existing = yamlParse(readFileSync(filePath, "utf8")) || {};
    } catch {}
  }
  const yaml = {
    ...existing,
    ...entry.yaml,
    provenance: {
      ...(existing.provenance || {}),
      ...(entry.yaml.provenance || {}),
      promoted_at: todayIso(),
      promoted_by: "Diego Ivo",
    },
  };
  if (existing.icon && !entry.yaml.icon) yaml.icon = existing.icon;
  writeYamlFile(filePath, yaml);
  return `project/clusters/${entry.slug}/cluster.yaml`;
}

function rewriteFrontmatterToClusters(text, clusters) {
  const { data, body, raw } = parseFrontmatter(text);
  const lines = raw.split(/\r?\n/);
  const out = [];
  let inDropBlock = false;
  let replaced = false;
  const clustersBlock = ["clusters:", ...clusters.map((slug) => `  - ${slug}`)];
  for (const line of lines) {
    if (inDropBlock) {
      if (/^\s/.test(line)) continue;
      inDropBlock = false;
    }
    if (/^area\s*:/.test(line)) {
      if (!replaced) {
        out.push(...clustersBlock);
        replaced = true;
      }
      inDropBlock = true;
      continue;
    }
    if (/^clusters\s*:/.test(line)) {
      if (!replaced) {
        out.push(...clustersBlock);
        replaced = true;
      }
      inDropBlock = true;
      continue;
    }
    out.push(line);
  }
  if (!replaced) out.push(...clustersBlock);
  return `---\n${out.join("\n").replace(/\n+$/, "")}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`;
}

export function applyContentFrontmatter(root, update) {
  if (!update.add_clusters || update.add_clusters.length === 0) return null;
  const filePath = join(root, update.path);
  if (!existsSync(filePath)) return null;
  const current = readFileSync(filePath, "utf8");
  const next = rewriteFrontmatterToClusters(current, update.add_clusters);
  writeFileSync(filePath, next, "utf8");
  return update.path;
}

function shortenTitle(title) {
  if (!title) return title;
  if (title.length <= 40) return title;
  const cut = title.search(/[:—–-]\s/);
  if (cut > 0 && cut < 50) return title.slice(0, cut).trim();
  return title;
}

export function renderKeyword(keyword, volume) {
  if (!keyword) return "—";
  if (typeof volume === "number" && volume > 0) return `${keyword} (${volume})`;
  return keyword;
}

function buildContentsTableLines(entry, publishedByCluster) {
  const yaml = entry.yaml;
  const slug = entry.slug;
  const published = publishedByCluster.get(slug) || [];
  const satellitesByKey = new Map();
  for (const sat of yaml.satellites || []) {
    if (sat?.slug) satellitesByKey.set(sat.slug, sat);
  }
  const rows = [];
  const pillarContent = published.find((c) => c.role === "pillar");
  if (pillarContent) {
    const pillarShort = yaml.pillar?.display_title || shortenTitle(pillarContent.title);
    const link = `[${pillarShort}](../../contents/${pillarContent.origin}/${pillarContent.slug}.md)`;
    rows.push({
      role: "Pilar",
      content: link,
      keyword: renderKeyword(yaml.pillar?.keyword, yaml.pillar?.volume),
      intent: pillarContent.intent || yaml.pillar?.intent || "—",
      status: "publicado",
      action: "manter",
      atualizado: pillarContent.published_at || "—",
    });
  } else if (yaml.pillar?.slug) {
    rows.push({
      role: "Pilar",
      content: `_${yaml.pillar.slug}_`,
      keyword: renderKeyword(yaml.pillar?.keyword, yaml.pillar?.volume),
      intent: yaml.pillar?.intent || "—",
      status: "planejado",
      action: "criar",
      atualizado: "—",
    });
  }
  for (const content of published) {
    if (content.role === "pillar") continue;
    const sat = satellitesByKey.get(content.slug) || {};
    const titleShort = sat.display_title || shortenTitle(content.title);
    rows.push({
      role: "Satélite",
      content: `[${titleShort}](../../contents/${content.origin}/${content.slug}.md)`,
      keyword: renderKeyword(sat.keyword, sat.volume),
      intent: sat.intent || content.intent || "—",
      status: "publicado",
      action: sat.action || "manter",
      atualizado: content.published_at || "—",
    });
  }
  for (const sat of yaml.satellites || []) {
    if (sat.status === "published") continue;
    rows.push({
      role: sat.role === "pillar" ? "Pilar" : "Satélite",
      content: `_${sat.slug}_`,
      keyword: renderKeyword(sat.keyword, sat.volume),
      intent: sat.intent || "—",
      status: sat.status || "planejado",
      action: sat.action || "criar",
      atualizado: "—",
    });
  }
  const tableLines = [
    "| Papel | Conteúdo | Keyword | Intent | Status | Ação | Atualizado |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    tableLines.push(
      `| ${row.role} | ${row.content} | ${row.keyword} | ${row.intent} | ${row.status} | ${row.action} | ${row.atualizado} |`,
    );
  }
  if (rows.length === 0) {
    tableLines.push("| — | — | — | — | — | — | — |");
  }
  return tableLines;
}

function pluginRootFromHere() {
  // clusters-apply.mjs lives at scripts/lib/clusters-apply.mjs — plugin root is two levels up.
  return join(dirname(new URL(import.meta.url).pathname), "..", "..");
}

function buildPillarLine(yaml, publishedPillar) {
  if (publishedPillar) {
    const pillarShort = yaml.pillar?.display_title || shortenTitle(publishedPillar.title);
    return `[${pillarShort}](../../contents/${publishedPillar.origin}/${publishedPillar.slug}.md)`;
  }
  if (yaml.pillar?.slug) {
    return `_${yaml.pillar.slug}_ — pilar planejado, conteúdo a criar.`;
  }
  return "_pilar a definir_";
}

function buildNextActionsBlock(plannedSatellites) {
  if (plannedSatellites.length === 0) {
    return "- Cluster com cobertura completa do escopo declarado neste momento.";
  }
  return plannedSatellites
    .map((sat) => {
      const verb = sat.action === "review" ? "Revisar" : "Criar";
      return `- ${verb} \`${sat.slug}\`${sat.note ? ` — ${sat.note}` : ""}.`;
    })
    .join("\n");
}

function buildEvidenceBlock(yaml) {
  const refs = (yaml.provenance?.source_refs || []).map((ref) => `- ${ref}`);
  return refs.length ? refs.join("\n") : "";
}

function buildClusterSubpage(entry, publishedByCluster) {
  const yaml = entry.yaml;
  const icon = typeof yaml.icon === "string" && yaml.icon.trim() ? yaml.icon.trim() : null;
  const published = publishedByCluster.get(entry.slug) || [];
  const plannedSatellites = (yaml.satellites || []).filter((s) => s.status === "planned");
  const heading = icon ? `${icon} ${yaml.name}` : yaml.name;
  const pillarContent = published.find((c) => c.role === "pillar");
  const contentsTable = buildContentsTableLines(entry, publishedByCluster).join("\n");
  const nextActions = buildNextActionsBlock(plannedSatellites);
  const evidenceExtra = buildEvidenceBlock(yaml);
  const rendered = loadBrainSubpageTemplate(pluginRootFromHere(), "topic-clusters", {
    title: yaml.name,
    updated: todayIso(),
    parent_slug: "topic-clusters",
    parent_label: "Topic Clusters",
    heading,
    resumo: yaml.context || `Cluster ${yaml.name}.`,
    area: yaml.area || "",
    pilar_line: buildPillarLine(yaml, pillarContent),
    contents_table: contentsTable,
    next_actions: nextActions,
    provenance: yaml.provenance?.source || "site-crawl",
  });
  if (!rendered) {
    // Defensive fallback if template is missing on disk.
    throw new Error("Missing topic-clusters subpage template at templates/project/brain/topic-clusters/_subpage-template.md");
  }
  return evidenceExtra ? `${rendered.replace(/\s*$/, "\n")}${evidenceExtra}\n` : rendered;
}

export function updateContentsSection(filePath, entry, publishedByCluster) {
  if (!existsSync(filePath)) {
    ensureDir(filePath);
    writeFileSync(filePath, buildClusterSubpage(entry, publishedByCluster), "utf8");
    return { mode: "created" };
  }
  const current = readFileSync(filePath, "utf8");
  const tableLines = buildContentsTableLines(entry, publishedByCluster);
  const contentsBlock = ["## Conteúdos", "", ...tableLines, ""].join("\n");
  const regex = /^## Conteúdos[\s\S]*?(?=^## |\Z)/m;
  if (regex.test(current)) {
    const next = current.replace(regex, `${contentsBlock}\n`);
    writeFileSync(filePath, next, "utf8");
    return { mode: "patched" };
  }
  const pillarRegex = /^(## Pilar[\s\S]*?)(?=^## )/m;
  if (pillarRegex.test(current)) {
    const next = current.replace(pillarRegex, (block) => `${block}${contentsBlock}\n\n`);
    writeFileSync(filePath, next, "utf8");
    return { mode: "inserted-after-pillar" };
  }
  const next = current.replace(/\s*$/, "\n\n") + contentsBlock + "\n";
  writeFileSync(filePath, next, "utf8");
  return { mode: "appended" };
}

export function writeBrainSubpages(root, plan, publishedByCluster) {
  const written = [];
  for (const entry of plan.clusters_to_create) {
    const filePath = join(root, "project", "brain", "topic-clusters", `${entry.slug}.md`);
    ensureDir(filePath);
    writeFileSync(filePath, buildClusterSubpage(entry, publishedByCluster), "utf8");
    written.push(`project/brain/topic-clusters/${entry.slug}.md`);
  }
  return written;
}

function humanArea(entry) {
  if (typeof entry.yaml.area_name === "string" && entry.yaml.area_name.trim()) {
    return entry.yaml.area_name.trim();
  }
  const slug = entry.yaml.area || "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildBrainIndex(plan, publishedByCluster) {
  const total = plan.summary.contents_to_update;
  const planned = plan.clusters_to_create.reduce(
    (acc, entry) => acc + (entry.yaml.stats?.planned || 0),
    0,
  );
  const lines = [
    "---",
    `title: "Topic Clusters"`,
    `updated: "${todayIso()}"`,
    "---",
    "",
    "# Topic Clusters",
    "",
    "Cada Topic Cluster organiza um tema editorial em torno de um conteúdo pilar e satélites que cobrem subtemas relacionados. Use a tabela abaixo para navegar entre os clusters ativos — cada nome leva à página do cluster com a tabela completa de conteúdos publicados e planejados.",
    "",
    "## Painel",
    "",
    "| Indicador | Valor |",
    "| --- | --- |",
    `| Clusters ativos | ${plan.clusters_to_create.length} |`,
    `| Conteúdos publicados | ${total} |`,
    `| Conteúdos planejados | ${planned} |`,
    "",
    "## Clusters ativos",
    "",
    "| Cluster | Área | Pilar | Cobertura |",
    "| --- | --- | --- | --- |",
  ];
  for (const entry of plan.clusters_to_create) {
    const published = publishedByCluster.get(entry.slug) || [];
    const pillar = published.find((c) => c.role === "pillar");
    const pillarShort = pillar ? entry.yaml.pillar?.display_title || shortenTitle(pillar.title) : "";
    const pillarLink = pillar
      ? `[${pillarShort}](../contents/${pillar.origin}/${pillar.slug}.md)`
      : entry.yaml.pillar?.slug
        ? `_${entry.yaml.pillar.slug}_`
        : "—";
    const planned = entry.yaml.stats?.planned || 0;
    const cover =
      planned > 0
        ? `${entry.yaml.stats.published || 0} publicados, ${planned} planejado${planned > 1 ? "s" : ""}`
        : `${entry.yaml.stats?.published || 0} publicados`;
    const icon = typeof entry.yaml.icon === "string" && entry.yaml.icon.trim() ? entry.yaml.icon.trim() : null;
    const clusterLabel = icon ? `${icon} ${entry.yaml.name}` : entry.yaml.name;
    lines.push(
      `| [${clusterLabel}](topic-clusters/${entry.slug}.md) | ${humanArea(entry)} | ${pillarLink} | ${cover} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function writeBrainIndex(root, plan, publishedByCluster) {
  const filePath = join(root, "project", "brain", "topic-clusters.md");
  ensureDir(filePath);
  writeFileSync(filePath, buildBrainIndex(plan, publishedByCluster), "utf8");
  return "project/brain/topic-clusters.md";
}

export function logMigrationEntry(root, touched) {
  appendLogEntry(join(root, "project", "brain", "log.md"), {
    date: todayIso(),
    type: "decision",
    title: "Refator clusters-as-spine — cutover de dados aplicado (Fase 4)",
    scope: "project/brain/topic-clusters.md, project/brain/topic-clusters/, project/brain/editorial.md, project/contents/blog/, project/clusters/",
    decision:
      `Migração clusters-spine aplicada. ${touched.clusters.length} clusters criados (${touched.clusters.join(", ")}), ${touched.contents.length} conteúdos com frontmatter atualizado (area: → clusters:[]), ${touched.subpages.length} subpáginas brain criadas, índice brain/topic-clusters.md reescrito, brain/editorial.md simplificado (remove '### Conteúdos publicados' por área). Tag git pre-cluster-migration criada antes do apply.`,
    evidence: "project/workbench/migrations/clusters-spine/plan.yaml, .context/backups/project-pre-cluster-migration-*.tar.gz, tag git pre-cluster-migration",
    approver: "Diego Ivo",
    notes: "Fase 4 de 6 do refator clusters-as-spine. Próxima fase (5): brain-keeper + content-seo + agentic-seo + project-init atualizados.",
  });
}
