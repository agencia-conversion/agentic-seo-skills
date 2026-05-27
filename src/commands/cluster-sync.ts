import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";
import { CONTRACT_VERSION, SENTINELS } from "../lib/cluster-types";
import type {
  ClusterRecord,
  ClusterYaml,
  ContentRecord,
  Lint,
  Role,
  SyncOptions,
  SyncResult,
} from "../lib/cluster-types";
import {
  fingerprintIO,
  indexPath,
  loadClusters,
  loadContents,
  loadSubpage,
  loadTemplate,
  readProjectLanguage,
  serializeFrontmatter,
  subpagePath,
  writeFileIfChanged,
} from "../lib/cluster-io";
import {
  buildContentRows,
  renderContentBlock,
  renderIndexBlock,
} from "../lib/cluster-render";
import {
  CLUSTER_LABELS,
  getLabels,
  resolveLanguage,
  type Language,
} from "../lib/cluster-labels";
import { scanAndSyncAutoBlocks } from "../lib/auto-block-scanner";
import { registerBuiltinAutoBlocks } from "../lib/auto-blocks";

registerBuiltinAutoBlocks();

interface ResolvedInputs {
  clusters: ClusterRecord[];
  clusterBySlug: Map<string, ClusterRecord>;
  contents: ContentRecord[];
  contentsByCluster: Map<string, ContentRecord[]>;
  orphanContents: ContentRecord[];
  language: Language;
  labels: ReturnType<typeof getLabels>;
  pluginRoot: string;
  projectRoot: string;
  now: string;
}

function defaultNow(): string {
  return new Date().toISOString().slice(0, 10);
}

function fingerprintOf(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

function findProjectRoot(root: string): string {
  if (existsSync(join(root, ".agentic-seo", "project.json"))) return root;
  if (existsSync(join(root, "project", ".agentic-seo", "project.json"))) {
    return join(root, "project");
  }
  if (existsSync(join(root, "project"))) return join(root, "project");
  return root;
}

function findPluginRoot(start: string): string {
  let current = start;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(current, "plugin.json"))) return current;
    if (existsSync(join(current, ".claude-plugin", "plugin.json"))) return current;
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return start;
}

function indexContentsByCluster(
  contents: ContentRecord[],
): { map: Map<string, ContentRecord[]>; orphans: ContentRecord[] } {
  const map = new Map<string, ContentRecord[]>();
  const orphans: ContentRecord[] = [];
  for (const content of contents) {
    const clusters = content.fm.clusters || [];
    if (clusters.length === 0) {
      orphans.push(content);
      continue;
    }
    for (const slug of clusters) {
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug)!.push(content);
    }
  }
  return { map, orphans };
}

function resolveInputs(options: SyncOptions): ResolvedInputs {
  const projectRoot = findProjectRoot(options.root);
  const pluginRoot = findPluginRoot(projectRoot);
  const clusters = loadClusters(projectRoot);
  const contents = loadContents(projectRoot);
  const language = (options.language ||
    resolveLanguage(readProjectLanguage(projectRoot))) as Language;
  const labels = getLabels(language);
  const { map, orphans } = indexContentsByCluster(contents);
  const clusterBySlug = new Map(clusters.map((c) => [c.slug, c]));
  return {
    clusters,
    clusterBySlug,
    contents,
    contentsByCluster: map,
    orphanContents: orphans,
    language,
    labels,
    pluginRoot,
    projectRoot,
    now: (options.now || defaultNow)(),
  };
}

function detectLints(
  inputs: ResolvedInputs,
  filterCluster?: string,
): Lint[] {
  const lints: Lint[] = [];
  const clusterSlugs = new Set(inputs.clusters.map((c) => c.slug));

  for (const content of inputs.contents) {
    const clusters = content.fm.clusters || [];
    if (clusters.length === 0) {
      lints.push({
        code: "content.no-clusters",
        severity: "warn",
        message: `${content.relPath} sem clusters declarados`,
        context: { content: content.relPath },
      });
      continue;
    }
    if (clusters.length >= 4) {
      lints.push({
        code: "content.cluster-fanout",
        severity: "warn",
        message: `${content.slug} declara ${clusters.length} clusters`,
        context: { content: content.relPath, count: clusters.length },
      });
    }
    for (const slug of clusters) {
      if (!clusterSlugs.has(slug)) {
        lints.push({
          code: "content.cluster-missing",
          severity: "block",
          message: `${content.slug} declara cluster "${slug}" que não existe`,
          context: { content: content.relPath, slug },
        });
      }
    }
    if (content.fm.role) {
      for (const key of Object.keys(content.fm.role)) {
        if (!clusters.includes(key)) {
          lints.push({
            code: "content.role-orphan",
            severity: "warn",
            message: `${content.slug} declara role para "${key}" mas não está em clusters:[]`,
            context: { content: content.relPath, role_cluster: key },
          });
        }
      }
    }
  }

  const pillarOwners = new Map<string, string[]>();
  for (const cluster of inputs.clusters) {
    if (filterCluster && cluster.slug !== filterCluster) continue;
    if (cluster.yaml.status === "active" && !cluster.yaml.pillar?.slug) {
      lints.push({
        code: "cluster.pillar.missing",
        severity: "block",
        message: `cluster "${cluster.slug}" ativo sem pillar`,
        context: { cluster: cluster.slug },
      });
    }
    const pillarSlug = cluster.yaml.pillar?.slug;
    if (pillarSlug) {
      if (!pillarOwners.has(pillarSlug)) pillarOwners.set(pillarSlug, []);
      pillarOwners.get(pillarSlug)!.push(cluster.slug);
      const pillarContent = inputs.contents.find((c) => c.slug === pillarSlug);
      if (pillarContent) {
        const declared = pillarContent.fm.role?.[cluster.slug];
        if (declared && declared !== "pillar") {
          lints.push({
            code: "cluster.pillar.divergence",
            severity: "warn",
            message: `pillar do cluster "${cluster.slug}" diverge: frontmatter de ${pillarSlug} diz "${declared}"`,
            context: { cluster: cluster.slug, content: pillarSlug, declared },
          });
        }
        if (!(pillarContent.fm.clusters || []).includes(cluster.slug)) {
          lints.push({
            code: "cluster.pillar.divergence",
            severity: "warn",
            message: `pillar "${pillarSlug}" não declara cluster "${cluster.slug}" em clusters:[]`,
            context: { cluster: cluster.slug, content: pillarSlug },
          });
        }
      }
    }
    const overrideSlugs = Object.keys(cluster.yaml.satellite_overrides || {});
    for (const slug of overrideSlugs) {
      const c = inputs.contents.find((x) => x.slug === slug);
      if (!c || !(c.fm.clusters || []).includes(cluster.slug)) {
        lints.push({
          code: "cluster.override.orphan",
          severity: "warn",
          message: `satellite_overrides em "${cluster.slug}" referencia "${slug}" sem conteúdo publicado vinculado`,
          context: { cluster: cluster.slug, content_slug: slug },
        });
      }
    }
    for (const planned of cluster.yaml.planned_satellites || []) {
      const collision = inputs.contents.find((c) => c.slug === planned.slug);
      if (collision && (collision.fm.clusters || []).includes(cluster.slug)) {
        lints.push({
          code: "cluster.planned-collision",
          severity: "warn",
          message: `planned_satellite "${planned.slug}" colide com conteúdo publicado`,
          context: { cluster: cluster.slug, slug: planned.slug },
        });
      }
    }
  }
  for (const [slug, owners] of pillarOwners.entries()) {
    if (owners.length > 1) {
      lints.push({
        code: "cluster.unique-pillar",
        severity: "block",
        message: `conteúdo "${slug}" é pillar de múltiplos clusters: ${owners.join(", ")}`,
        context: { content: slug, clusters: owners },
      });
    }
  }
  return lints;
}

function resolvePillarSlug(
  cluster: ClusterRecord,
  inputs: ResolvedInputs,
): string | null {
  const declared = cluster.yaml.pillar?.slug;
  if (!declared) return null;
  const published = inputs.contentsByCluster.get(cluster.slug) || [];
  return published.find((c) => c.slug === declared)?.slug || null;
}

function applyContentBlock(
  current: string,
  block: string,
  labels: { pillar_section: string },
): { next: string; lint: string | null } {
  const beginIdx = current.indexOf(SENTINELS.contentBegin);
  const endIdx = current.indexOf(SENTINELS.contentEnd);
  if (beginIdx >= 0 && endIdx >= 0 && endIdx > beginIdx) {
    const before = current.slice(0, beginIdx).replace(/\s+$/, "");
    const after = current.slice(endIdx + SENTINELS.contentEnd.length).replace(/^\s+/, "");
    return { next: `${before}\n\n${block}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim() + "\n", lint: null };
  }
  if (beginIdx >= 0 || endIdx >= 0) {
    return { next: rebuildContentSubpage(current, block, labels), lint: "cluster.table.corrupt" };
  }
  return {
    next: rebuildContentSubpage(current, block, labels),
    lint: "cluster.table.sentinel-missing",
  };
}

function rebuildContentSubpage(
  current: string,
  block: string,
  labels: { pillar_section: string },
): string {
  const pillarRe = new RegExp(`^## ${escapeRegex(labels.pillar_section)}.*?(?=^## |\\Z)`, "ms");
  if (pillarRe.test(current)) {
    return current.replace(pillarRe, (m) => `${m.trimEnd()}\n\n${block}\n\n`).replace(/\n{3,}/g, "\n\n");
  }
  return `${current.trimEnd()}\n\n${block}\n`;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSubpageFromTemplate(
  cluster: ClusterRecord,
  block: string,
  labels: ReturnType<typeof getLabels>,
  pluginRoot: string,
  now: string,
  pillarContent: ContentRecord | null,
): string | null {
  const template = loadTemplate(
    pluginRoot,
    "project/brain/topic-clusters/_cluster-subpage.md.template",
  );
  if (!template) return null;
  const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
  const heading = `${icon}${cluster.yaml.name}`;
  const summary = cluster.yaml.thesis || cluster.yaml.context || `Cluster ${cluster.yaml.name}.`;
  const pillarLine = pillarContent
    ? `[${pillarContent.fm.title || pillarContent.slug}](../../contents/${pillarContent.origin}/${pillarContent.slug}.md)${cluster.yaml.pillar?.keyword ? ` — ${cluster.yaml.pillar.keyword}` : ""}`
    : cluster.yaml.pillar?.slug
      ? `_${cluster.yaml.pillar.slug}_${cluster.yaml.pillar.keyword ? ` — ${cluster.yaml.pillar.keyword}` : ""} (planejado)`
      : "_pilar a definir_";
  const plannedActions = (cluster.yaml.planned_satellites || [])
    .map((p) => `- ${labels.create} \`${p.slug}\`${p.note ? ` — ${p.note}` : ""}.`)
    .join("\n") || "- —";
  return template
    .replace(/<Nome do Cluster>/g, cluster.yaml.name)
    .replace(/<YYYY-MM-DD>/g, now)
    .replace(/<heading>/g, heading)
    .replace(/<resumo>/g, summary)
    .replace(/<pilar_line>/g, pillarLine)
    .replace(/<content_block>/g, block)
    .replace(/<next_actions>/g, plannedActions)
    .replace(/<evidence_block>/g, "—");
}

function updateClusterStats(
  cluster: ClusterRecord,
  inputs: ResolvedInputs,
): ClusterYaml {
  const published = (inputs.contentsByCluster.get(cluster.slug) || []).length;
  const planned = (cluster.yaml.planned_satellites || []).length;
  return {
    ...cluster.yaml,
    contract_version: CONTRACT_VERSION,
    stats: {
      published,
      planned,
      updated: inputs.now,
    },
  };
}

function syncCluster(
  cluster: ClusterRecord,
  inputs: ResolvedInputs,
  options: SyncOptions,
): { changed: string[]; noop: boolean; lints: Lint[] } {
  const lints: Lint[] = [];
  const labels = inputs.labels;
  const resolvedPillarSlug = resolvePillarSlug(cluster, inputs);
  const rows = buildContentRows({
    cluster,
    labels,
    contentsByCluster: inputs.contentsByCluster,
    resolvedPillarSlug,
  });
  const block = renderContentBlock({
    cluster,
    labels,
    contentsByCluster: inputs.contentsByCluster,
    resolvedPillarSlug,
  });
  const fingerprint = fingerprintOf(`${cluster.slug}:${rows.length}:${block}`);
  const previous = fingerprintIO.read(inputs.projectRoot, cluster.slug);
  const targetPath = subpagePath(inputs.projectRoot, cluster.slug);

  if (previous === fingerprint && existsSync(targetPath)) {
    return { changed: [], noop: true, lints };
  }

  const existing = loadSubpage(inputs.projectRoot, cluster.slug);
  const pillarContent = resolvedPillarSlug
    ? (inputs.contentsByCluster.get(cluster.slug) || []).find(
        (c) => c.slug === resolvedPillarSlug,
      ) || null
    : null;
  let nextContent: string;
  let detectedLint: string | null = null;
  if (!existing) {
    nextContent =
      renderSubpageFromTemplate(cluster, block, labels, inputs.pluginRoot, inputs.now, pillarContent) ||
      buildFallbackSubpage(cluster, block, labels, inputs.now);
  } else {
    const result = applyContentBlock(existing, block, labels);
    nextContent = result.next;
    detectedLint = result.lint;
  }
  if (detectedLint) {
    lints.push({
      code: detectedLint,
      severity: detectedLint === "cluster.table.corrupt" ? "block" : "warn",
      message: `tabela materializada de "${cluster.slug}" reconstruída (${detectedLint})`,
      context: { cluster: cluster.slug },
    });
  }

  const changed: string[] = [];
  if (!options.check) {
    if (!options.dryRun) {
      const out = writeFileIfChanged(targetPath, nextContent);
      if (out.changed) changed.push(targetPath);
      const nextYaml = updateClusterStats(cluster, inputs);
      const yamlText = yamlStringify(nextYaml, { lineWidth: 0 });
      const yamlOut = writeFileIfChanged(cluster.filePath, yamlText);
      if (yamlOut.changed) changed.push(cluster.filePath);
      fingerprintIO.write(inputs.projectRoot, cluster.slug, fingerprint);
    }
  }

  return { changed, noop: false, lints };
}

function buildFallbackSubpage(
  cluster: ClusterRecord,
  block: string,
  labels: ReturnType<typeof getLabels>,
  now: string,
): string {
  const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
  const fm = `---\ntitle: "${cluster.yaml.name}"\ncontract_version: ${CONTRACT_VERSION}\nupdated: "${now}"\n---\n\n`;
  return `${fm}# ${icon}${cluster.yaml.name}\n\n## ${labels.summary_section}\n\n${cluster.yaml.context || cluster.yaml.thesis || ""}\n\n## ${labels.thesis_section}\n\n—\n\n## ${labels.pillar_section}\n\n${cluster.yaml.pillar?.slug ? `_${cluster.yaml.pillar.slug}_` : "_pilar a definir_"}\n\n${block}\n\n## ${labels.next_actions}\n\n—\n\n## ${labels.evidence_section}\n\n—\n`;
}

function syncIndex(
  inputs: ResolvedInputs,
  options: SyncOptions,
): { changed: string[]; noop: boolean; lints: Lint[] } {
  const labels = inputs.labels;
  const block = renderIndexBlock({
    clusters: inputs.clusters,
    labels,
    contentsByCluster: inputs.contentsByCluster,
    orphanCount: inputs.orphanContents.length,
    plannedCount: inputs.clusters.reduce(
      (acc, c) => acc + (c.yaml.planned_satellites || []).length,
      0,
    ),
    publishedCount: inputs.contents.length - inputs.orphanContents.length,
    syncTimestamp: inputs.now,
  });
  const filePath = indexPath(inputs.projectRoot);
  const lints: Lint[] = [];
  let current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  let next: string;
  if (!current) {
    next = `---\ntitle: "Topic Clusters"\ncontract_version: ${CONTRACT_VERSION}\nupdated: "${inputs.now}"\n---\n\n# Topic Clusters\n\n${block}\n`;
  } else {
    const beginIdx = current.indexOf(SENTINELS.indexBegin);
    const endIdx = current.indexOf(SENTINELS.indexEnd);
    if (beginIdx >= 0 && endIdx >= 0 && endIdx > beginIdx) {
      const before = current.slice(0, beginIdx).replace(/\s+$/, "");
      const after = current.slice(endIdx + SENTINELS.indexEnd.length).replace(/^\s+/, "");
      next = `${before}\n\n${block}\n\n${after}`.replace(/\n{3,}/g, "\n\n").trim() + "\n";
    } else {
      lints.push({
        code: "cluster.table.sentinel-missing",
        severity: "warn",
        message: "índice topic-clusters.md sem sentinels — reconstruído",
        context: {},
      });
      const titleMatch = current.match(/^#\s.*$/m);
      if (titleMatch) {
        const stripped = current
          .replace(/^## (Painel|Panel)[\s\S]*?(?=^## |\Z)/m, "")
          .replace(
            new RegExp(`^## (${escapeRegex(inputs.labels.active_clusters)}|Clusters ativos|Active clusters)[\\s\\S]*?(?=^## |\\Z)`, "m"),
            "",
          )
          .replace(/\n{3,}/g, "\n\n");
        next = stripped.replace(/^(#\s.*)$/m, (m) => `${m.trim()}\n\n${block}\n`);
      } else {
        next = `${current.trimEnd()}\n\n${block}\n`;
      }
    }
  }
  if (options.check || options.dryRun) {
    return { changed: [], noop: current === next, lints };
  }
  const out = writeFileIfChanged(filePath, next);
  return { changed: out.changed ? [filePath] : [], noop: !out.changed, lints };
}

export async function clusterSync(
  options: SyncOptions,
): Promise<SyncResult> {
  const start = Date.now();
  const inputs = resolveInputs(options);
  const allLints: Lint[] = [];
  const changedFiles: string[] = [];
  let allNoop = true;

  const lintsGlobal = detectLints(inputs, options.cluster);
  allLints.push(...lintsGlobal);

  const targetClusters = options.cluster
    ? inputs.clusters.filter((c) => c.slug === options.cluster)
    : inputs.clusters;

  for (const cluster of targetClusters) {
    const res = syncCluster(cluster, inputs, options);
    changedFiles.push(...res.changed);
    if (!res.noop) allNoop = false;
    allLints.push(...res.lints);
  }

  const indexRes = syncIndex(inputs, options);
  changedFiles.push(...indexRes.changed);
  if (!indexRes.noop) allNoop = false;
  allLints.push(...indexRes.lints);

  const autoBlockRes = scanAndSyncAutoBlocks(inputs, {
    dryRun: options.dryRun,
    check: options.check,
  });
  if (autoBlockRes.changedFiles.length > 0) {
    changedFiles.push(...autoBlockRes.changedFiles);
    allNoop = false;
  }
  allLints.push(...autoBlockRes.lints);

  const hasBlock = allLints.some((l) => l.severity === "block");
  const exitCode = options.check
    ? hasBlock || !allNoop
      ? 1
      : 0
    : hasBlock
      ? 0
      : 0;

  return {
    ok: !hasBlock,
    exitCode,
    changedFiles,
    noop: allNoop,
    lints: allLints,
    stats: {
      clustersConsidered: targetClusters.length,
      contentsConsidered: inputs.contents.length,
      durationMs: Date.now() - start,
    },
  };
}

export interface CliArgs {
  root: string;
  cluster?: string;
  check: boolean;
  dryRun: boolean;
  verbose: boolean;
  language?: Language;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    root: process.cwd(),
    check: false,
    dryRun: false,
    verbose: false,
  };
  for (const arg of argv) {
    if (arg === "--check") args.check = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--verbose") args.verbose = true;
    else if (arg.startsWith("--cluster=")) args.cluster = arg.slice(10);
    else if (arg.startsWith("--root=")) args.root = arg.slice(7);
    else if (arg.startsWith("--language=")) {
      const v = arg.slice(11);
      args.language = (v === "en" ? "en" : "pt-BR") as Language;
    }
  }
  return args;
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const result = await clusterSync({
    root: args.root,
    cluster: args.cluster,
    check: args.check,
    dryRun: args.dryRun,
    language: args.language,
    verbose: args.verbose,
  });
  const out = {
    ok: result.ok,
    noop: result.noop,
    changedFiles: result.changedFiles,
    lints: result.lints,
    stats: result.stats,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  return result.exitCode;
}

if (require.main === module) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}

export { CLUSTER_LABELS };
