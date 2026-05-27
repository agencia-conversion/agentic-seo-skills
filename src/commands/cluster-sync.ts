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
  Papel,
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
    if (content.fm.papel) {
      for (const key of Object.keys(content.fm.papel)) {
        if (!clusters.includes(key)) {
          lints.push({
            code: "content.papel-orphan",
            severity: "warn",
            message: `${content.slug} declara papel para "${key}" mas não está em clusters:[]`,
            context: { content: content.relPath, papel_cluster: key },
          });
        }
      }
    }
  }

  const pilarOwners = new Map<string, string[]>();
  for (const cluster of inputs.clusters) {
    if (filterCluster && cluster.slug !== filterCluster) continue;
    if (cluster.yaml.status === "active" && !cluster.yaml.pilar?.slug) {
      lints.push({
        code: "cluster.pilar.missing",
        severity: "block",
        message: `cluster "${cluster.slug}" ativo sem pilar`,
        context: { cluster: cluster.slug },
      });
    }
    const pilarSlug = cluster.yaml.pilar?.slug;
    if (pilarSlug) {
      if (!pilarOwners.has(pilarSlug)) pilarOwners.set(pilarSlug, []);
      pilarOwners.get(pilarSlug)!.push(cluster.slug);
      const pilarContent = inputs.contents.find((c) => c.slug === pilarSlug);
      if (pilarContent) {
        const declared = pilarContent.fm.papel?.[cluster.slug];
        if (declared && declared !== "pilar") {
          lints.push({
            code: "cluster.pilar.divergence",
            severity: "warn",
            message: `pilar do cluster "${cluster.slug}" diverge: frontmatter de ${pilarSlug} diz "${declared}"`,
            context: { cluster: cluster.slug, content: pilarSlug, declared },
          });
        }
        if (!(pilarContent.fm.clusters || []).includes(cluster.slug)) {
          lints.push({
            code: "cluster.pilar.divergence",
            severity: "warn",
            message: `pilar "${pilarSlug}" não declara cluster "${cluster.slug}" em clusters:[]`,
            context: { cluster: cluster.slug, content: pilarSlug },
          });
        }
      }
    }
    const overrideSlugs = Object.keys(cluster.yaml.satelite_overrides || {});
    for (const slug of overrideSlugs) {
      const c = inputs.contents.find((x) => x.slug === slug);
      if (!c || !(c.fm.clusters || []).includes(cluster.slug)) {
        lints.push({
          code: "cluster.override.orphan",
          severity: "warn",
          message: `satelite_overrides em "${cluster.slug}" referencia "${slug}" sem conteúdo publicado vinculado`,
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
  for (const [slug, owners] of pilarOwners.entries()) {
    if (owners.length > 1) {
      lints.push({
        code: "cluster.unique-pilar",
        severity: "block",
        message: `conteúdo "${slug}" é pilar de múltiplos clusters: ${owners.join(", ")}`,
        context: { content: slug, clusters: owners },
      });
    }
  }
  return lints;
}

function resolvePilarSlug(
  cluster: ClusterRecord,
  inputs: ResolvedInputs,
): string | null {
  const declared = cluster.yaml.pilar?.slug;
  if (!declared) return null;
  const published = inputs.contentsByCluster.get(cluster.slug) || [];
  return published.find((c) => c.slug === declared)?.slug || null;
}

function applyContentBlock(
  current: string,
  block: string,
  labels: { pilar_section: string },
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
  labels: { pilar_section: string },
): string {
  const pilarRe = new RegExp(`^## ${escapeRegex(labels.pilar_section)}.*?(?=^## |\\Z)`, "ms");
  if (pilarRe.test(current)) {
    return current.replace(pilarRe, (m) => `${m.trimEnd()}\n\n${block}\n\n`).replace(/\n{3,}/g, "\n\n");
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
  pilarContent: ContentRecord | null,
): string | null {
  const template = loadTemplate(
    pluginRoot,
    "project/brain/topic-clusters/_cluster-subpage.md.template",
  );
  if (!template) return null;
  const icon = cluster.yaml.icon ? `${cluster.yaml.icon} ` : "";
  const heading = `${icon}${cluster.yaml.nome}`;
  const resumo = cluster.yaml.tese || cluster.yaml.context || `Cluster ${cluster.yaml.nome}.`;
  const pilarLine = pilarContent
    ? `[${pilarContent.fm.title || pilarContent.slug}](../../conteudos/${pilarContent.origem}/${pilarContent.slug}.md)${cluster.yaml.pilar?.keyword ? ` — ${cluster.yaml.pilar.keyword}` : ""}`
    : cluster.yaml.pilar?.slug
      ? `_${cluster.yaml.pilar.slug}_${cluster.yaml.pilar.keyword ? ` — ${cluster.yaml.pilar.keyword}` : ""} (planejado)`
      : "_pilar a definir_";
  const plannedActions = (cluster.yaml.planned_satellites || [])
    .map((p) => `- ${labels.criar} \`${p.slug}\`${p.note ? ` — ${p.note}` : ""}.`)
    .join("\n") || "- —";
  return template
    .replace(/<Nome do Cluster>/g, cluster.yaml.nome)
    .replace(/<YYYY-MM-DD>/g, now)
    .replace(/<heading>/g, heading)
    .replace(/<resumo>/g, resumo)
    .replace(/<pilar_line>/g, pilarLine)
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
      publicados: published,
      planejados: planned,
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
  const resolvedPilarSlug = resolvePilarSlug(cluster, inputs);
  const rows = buildContentRows({
    cluster,
    labels,
    contentsByCluster: inputs.contentsByCluster,
    resolvedPilarSlug,
  });
  const block = renderContentBlock({
    cluster,
    labels,
    contentsByCluster: inputs.contentsByCluster,
    resolvedPilarSlug,
  });
  const fingerprint = fingerprintOf(`${cluster.slug}:${rows.length}:${block}`);
  const previous = fingerprintIO.read(inputs.projectRoot, cluster.slug);
  const targetPath = subpagePath(inputs.projectRoot, cluster.slug);

  if (previous === fingerprint && existsSync(targetPath)) {
    return { changed: [], noop: true, lints };
  }

  const existing = loadSubpage(inputs.projectRoot, cluster.slug);
  const pilarContent = resolvedPilarSlug
    ? (inputs.contentsByCluster.get(cluster.slug) || []).find(
        (c) => c.slug === resolvedPilarSlug,
      ) || null
    : null;
  let nextContent: string;
  let detectedLint: string | null = null;
  if (!existing) {
    nextContent =
      renderSubpageFromTemplate(cluster, block, labels, inputs.pluginRoot, inputs.now, pilarContent) ||
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
  const fm = `---\ntitle: "${cluster.yaml.nome}"\ncontract_version: ${CONTRACT_VERSION}\nupdated: "${now}"\n---\n\n`;
  return `${fm}# ${icon}${cluster.yaml.nome}\n\n## ${labels.resumo_section}\n\n${cluster.yaml.context || cluster.yaml.tese || ""}\n\n## ${labels.tese_section}\n\n—\n\n## ${labels.pilar_section}\n\n${cluster.yaml.pilar?.slug ? `_${cluster.yaml.pilar.slug}_` : "_pilar a definir_"}\n\n${block}\n\n## ${labels.proximas_acoes}\n\n—\n\n## ${labels.evidencia_section}\n\n—\n`;
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
            new RegExp(`^## (${escapeRegex(inputs.labels.clusters_ativos)}|Clusters ativos|Active clusters)[\\s\\S]*?(?=^## |\\Z)`, "m"),
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
