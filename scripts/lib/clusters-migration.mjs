import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parse as yamlParse } from "yaml";
import { parseFrontmatter } from "./brain-page.mjs";
import { normalizeClusterYaml } from "./cluster-yaml.mjs";

function readExistingClusterIcon(slug) {
  const file = join(process.cwd(), "project", "clusters", slug, "cluster.yaml");
  if (!existsSync(file)) return null;
  try {
    const data = normalizeClusterYaml(yamlParse(readFileSync(file, "utf8")));
    return typeof data?.icon === "string" && data.icon.trim() ? data.icon.trim() : null;
  } catch {
    return null;
  }
}

export function readClusterJson(seedPath) {
  if (!existsSync(seedPath)) throw new Error(`cluster.json não encontrado em ${seedPath}`);
  return JSON.parse(readFileSync(seedPath, "utf8"));
}

export function readContents(blogDir) {
  if (!existsSync(blogDir)) return [];
  return readdirSync(blogDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const path = join(blogDir, name);
      const text = readFileSync(path, "utf8");
      const { data: fm } = parseFrontmatter(text);
      return { name, path, frontmatter: fm, slug: fm.slug || basename(name, ".md") };
    });
}

function inferPillarSlug(subCluster) {
  const published = subCluster.topics.find((t) => t.status === "published");
  return published?.slug || subCluster.topics[0]?.slug || null;
}

export function buildClusterEntries(rawClusters, contents) {
  const bySlug = new Map(contents.map((c) => [c.slug, c]));
  return rawClusters.map((sub) => {
    const pillarSlug = inferPillarSlug(sub);
    const satellites = sub.topics
      .filter((t) => t.slug !== pillarSlug)
      .map((t) => ({
        slug: t.slug,
        role: "satellite",
        status: bySlug.has(t.slug) ? "published" : "planned",
        intent: t.intent || null,
        keyword: t.topic,
        volume: null,
        volume_source: null,
        action: bySlug.has(t.slug) ? "keep" : "create",
        note: t.note || null,
      }));
    const existingIcon = readExistingClusterIcon(sub.slug);
    return {
      slug: sub.slug,
      target_path: `project/clusters/${sub.slug}/cluster.yaml`,
      yaml: {
        slug: sub.slug,
        name: sub.name,
        ...(existingIcon ? { icon: existingIcon } : {}),
        area: sub.area,
        status: "active",
        context: sub.context,
        pillar: pillarSlug
          ? {
              slug: pillarSlug,
              keyword: sub.topics.find((t) => t.slug === pillarSlug)?.topic || sub.name,
              volume: null,
              volume_source: null,
            }
          : null,
        satellites,
        stats: {
          total_keywords: sub.topics.length,
          published: sub.topics.filter((t) => bySlug.has(t.slug)).length,
          planned: sub.topics.filter((t) => !bySlug.has(t.slug)).length,
        },
        provenance: {
          origin: "site-derived-agentic-seo",
          migrated_at: new Date().toISOString().slice(0, 10),
          source: "project/clusters/site-derived-agentic-seo/cluster.json",
        },
      },
    };
  });
}

export function buildContentUpdates(contents, clusterEntries) {
  const areaToCluster = new Map(clusterEntries.map((e) => [e.yaml.area, e.slug]));
  return contents.map((c) => {
    const area = c.frontmatter.area || null;
    const inferred = area ? areaToCluster.get(area) : null;
    const ownerCluster = clusterEntries.find(
      (e) => e.yaml.pillar?.slug === c.slug || e.yaml.satellites.some((s) => s.slug === c.slug),
    );
    const cluster = ownerCluster?.slug || inferred;
    const role = ownerCluster?.yaml.pillar?.slug === c.slug ? "pillar" : "satellite";
    return {
      path: `project/contents/blog/${c.name}`,
      current_area: area,
      add_clusters: cluster ? [cluster] : [],
      role: cluster ? { [cluster]: role } : null,
      remove_area_field: "Fase 4 (não nesta)",
      blocker: cluster ? null : "Conteúdo sem cluster correspondente; revisão humana necessária",
    };
  });
}

export function buildBrainPlan(clusterEntries) {
  return {
    brain_topic_clusters_index: {
      path: "project/brain/topic-clusters.md",
      from: "monólito com 5 seções `## <Cluster>` + tabela (77 linhas)",
      to: "índice curto com tabela de clusters + Painel + Próximas ações",
      preview_header: ["# Topic Clusters", "## Painel", "## Clusters ativos", "## Próximas ações"],
    },
    brain_topic_clusters_subpages: clusterEntries.map((e) => ({
      path: `project/brain/topic-clusters/${e.slug}.md`,
      sections: ["Resumo", "Pilar", "Conteúdos (tabela)", "Próximas ações", "Evidência"],
    })),
    brain_editorial: {
      path: "project/brain/editorial.md",
      from: "5 áreas com `### Conteúdos publicados` listando conteúdos",
      to: "5 áreas com tese/diferenciação/audiência/provas; remove `### Conteúdos publicados` (vivem no cluster)",
    },
  };
}

export function buildPlan({ mode, seedPath, blogDir }) {
  const raw = readClusterJson(seedPath);
  const contents = readContents(blogDir);
  const clusterEntries = buildClusterEntries(raw.clusters, contents);
  const contentUpdates = buildContentUpdates(contents, clusterEntries);
  const brainPlan = buildBrainPlan(clusterEntries);
  const blockers = contentUpdates.filter((u) => u.blocker).map((u) => u.blocker);
  return {
    status: "dry-run",
    mode,
    generated_at: new Date().toISOString(),
    inputs: {
      cluster_json: "project/clusters/site-derived-agentic-seo/cluster.json",
      blog_dir: `project/contents/blog/ (${contents.length} arquivos)`,
      brain_topic_clusters: "project/brain/topic-clusters.md",
      brain_editorial: "project/brain/editorial.md",
    },
    summary: {
      clusters_to_create: clusterEntries.length,
      contents_to_update: contentUpdates.length,
      brain_subpages_to_create: clusterEntries.length,
      brain_pages_to_rewrite: 2,
      blockers: blockers.length,
    },
    clusters_to_create: clusterEntries,
    contents_to_update: contentUpdates,
    brain_plan: brainPlan,
    blockers,
    notes: [
      "Pilar inferido por convenção: primeiro topic com status: published em cada sub-cluster.",
      "`area:` no frontmatter de conteúdo é mantido nesta fase; remoção é Fase 4.",
      "Conteúdos com `status: source-only` no cluster.json (sem .md em contents/blog/) ficam como `status: planned` no cluster.yaml.",
      "`status: active` é atribuído provisoriamente; a Fase 4 (handoff humano `review-changes`) confirma promoção.",
    ],
  };
}
