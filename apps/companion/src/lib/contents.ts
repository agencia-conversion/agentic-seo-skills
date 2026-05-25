import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { parseFrontmatter } from './project-files';

const CONTENT_ORIGINS = ['blog', 'linkedin', 'podcast', 'outros'] as const;
const NONE_CLUSTER = '__none__';

interface ClusterContentMeta {
  keyword?: string | null;
  volume?: number | null;
  display_title?: string | null;
}

interface TopicCluster {
  id: string;
  title: string;
  path: string;
  aliases: Set<string>;
  pageSlugs: Set<string>;
  metaBySlug: Map<string, ClusterContentMeta>;
}

function sha256(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function clean(value: unknown) {
  return String(value ?? '').replace(/^["']|["']$/g, '').trim();
}

function slugify(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function walkMarkdown(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkMarkdown(root, full));
    if (st.isFile() && name.endsWith('.md')) out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function titleFromPath(path: string) {
  return basename(path, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseClusterFile(filePath: string): any {
  const text = readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.yaml')) return parseYaml(text);
  return JSON.parse(text);
}

function buildClusterIndexEntry(data: any, filePath: string, root: string): TopicCluster | null {
  const folder = basename(resolve(filePath, '..'));
  const id =
    slugify(data.slug || data.seed_slug || data.pilar?.slug || data.pillar?.slug || folder) || slugify(folder);
  if (!id) return null;
  const title = clean(data.nome || data.pilar?.keyword || data.pillar?.title || data.seed || id) || id;
  const aliases = new Set(
    [
      id,
      slugify(title),
      slugify(data.seed),
      slugify(data.pilar?.slug),
      slugify(data.pillar?.slug),
      slugify(data.seed_slug),
      slugify(data.slug),
    ].filter(Boolean),
  );
  const pageSlugs = new Set<string>();
  const metaBySlug = new Map<string, ClusterContentMeta>();
  if (data.pilar?.slug) {
    const slug = slugify(data.pilar.slug);
    if (slug) {
      pageSlugs.add(slug);
      metaBySlug.set(slug, {
        keyword: data.pilar.keyword || null,
        volume: typeof data.pilar.volume === 'number' ? data.pilar.volume : null,
        display_title: data.pilar.display_title || null,
      });
    }
  }
  for (const value of [data.pillar?.slug, data.pillar?.title, data.seed]) {
    const slug = slugify(value);
    if (slug) pageSlugs.add(slug);
  }
  const items = Array.isArray(data.satelites)
    ? data.satelites
    : Array.isArray(data.supporting_pages)
      ? data.supporting_pages
      : [];
  for (const page of items) {
    const slug = slugify(page?.slug);
    if (slug) {
      pageSlugs.add(slug);
      metaBySlug.set(slug, {
        keyword: page.keyword || page.keyword_principal?.keyword || null,
        volume: typeof page.volume === 'number' ? page.volume : null,
        display_title: page.display_title || null,
      });
    }
    for (const value of [page?.title, page?.keyword, page?.keyword_principal?.keyword]) {
      const extra = slugify(value);
      if (extra) pageSlugs.add(extra);
    }
  }
  return {
    id,
    title,
    path: relative(root, filePath).split(sep).join('/'),
    aliases,
    pageSlugs,
    metaBySlug,
  };
}

function readTopicClusters(projectRoot: string): TopicCluster[] {
  const root = resolve(projectRoot);
  const clustersRoot = resolve(root, 'clusters');
  if (!existsSync(clustersRoot)) return [];
  const realRoot = realpathSync(root);
  const seen = new Set<string>();
  const out: TopicCluster[] = [];
  for (const child of walkClusterFiles(clustersRoot)) {
    const filePath = resolve(clustersRoot, child);
    const realFile = realpathSync(filePath);
    if (!realFile.startsWith(`${realRoot}${sep}`)) continue;
    try {
      const data = parseClusterFile(filePath);
      const entry = buildClusterIndexEntry(data, filePath, root);
      if (!entry || seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    } catch {
      // Ignore malformed cluster drafts; the content index should remain usable.
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

function walkClusterFiles(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkClusterFiles(root, full));
    if (st.isFile() && (name === 'cluster.json' || name === 'cluster.yaml')) {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out;
}

function frontmatterClusterSlugs(frontmatter: Record<string, any>): string[] {
  const out: string[] = [];
  const raw = frontmatter.clusters;
  if (Array.isArray(raw)) {
    for (const value of raw) {
      const slug = slugify(value);
      if (slug) out.push(slug);
    }
  }
  for (const key of ['topic_cluster', 'topicCluster', 'cluster']) {
    const slug = slugify(frontmatter[key]);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

function inferClusters(
  frontmatter: Record<string, any>,
  contentSlug: string,
  clusters: TopicCluster[],
): Array<TopicCluster | { id: string; title: string; path: string | null }> {
  const declared = frontmatterClusterSlugs(frontmatter);
  const matched: Array<TopicCluster | { id: string; title: string; path: string | null }> = [];
  const seen = new Set<string>();
  const pushMatch = (entry: TopicCluster | { id: string; title: string; path: string | null }) => {
    if (!entry || seen.has(entry.id)) return;
    seen.add(entry.id);
    matched.push(entry);
  };
  for (const slug of declared) {
    const entry =
      clusters.find((cluster) => cluster.id === slug || cluster.aliases.has(slug)) ||
      ({ id: slug, title: slug, path: null } as { id: string; title: string; path: string | null });
    pushMatch(entry);
  }
  if (matched.length === 0) {
    const area = slugify(frontmatter.area);
    const slug = slugify(frontmatter.slug || contentSlug);
    const fallback = clusters.find((cluster) => cluster.aliases.has(area) || cluster.pageSlugs.has(slug));
    if (fallback) pushMatch(fallback);
  }
  return matched;
}

function normalizeClusterFilter(topicCluster: string | string[]): string[] {
  if (!topicCluster) return [];
  if (Array.isArray(topicCluster)) return topicCluster.map((value) => String(value).trim()).filter(Boolean);
  return String(topicCluster)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function listProjectContents({
  projectRoot,
  page = 1,
  pageSize = 25,
  query = '',
  origin = '',
  topicCluster = '',
}: {
  projectRoot: string;
  page?: number;
  pageSize?: number;
  query?: string;
  origin?: string;
  topicCluster?: string;
}) {
  const root = resolve(projectRoot);
  const clusters = readTopicClusters(root);
  const rows: any[] = [];
  for (const contentOrigin of CONTENT_ORIGINS) {
    const dir = resolve(root, 'conteudos', contentOrigin);
    if (!existsSync(dir)) continue;
    const realDir = realpathSync(dir);
    if (!realDir.startsWith(`${realpathSync(root)}${sep}`)) continue;
    for (const child of walkMarkdown(dir)) {
      const path = `conteudos/${contentOrigin}/${child}`;
      const filePath = resolve(root, path);
      const realFile = realpathSync(filePath);
      if (!realFile.startsWith(`${realDir}${sep}`)) continue;
      const text = readFileSync(filePath, 'utf8');
      const { data: frontmatter, body } = parseFrontmatter(text);
      const contentSlug = clean(frontmatter.slug) || basename(child, '.md');
      const matches = inferClusters(frontmatter, contentSlug, clusters);
      const primary = matches[0] || null;
      let keyword: string | null = null;
      let keywordVolume: number | null = null;
      for (const match of matches) {
        const cluster = clusters.find((c) => c.id === match.id);
        const meta = cluster?.metaBySlug.get(contentSlug);
        if (meta?.keyword) {
          keyword = meta.keyword;
          keywordVolume = meta.volume ?? null;
          break;
        }
      }
      rows.push({
        id: sha256(path),
        path,
        title: clean(frontmatter.title) || titleFromPath(path),
        slug: contentSlug,
        origin: clean(frontmatter.origem || frontmatter.origin) || contentOrigin,
        area: clean(frontmatter.area),
        topic_cluster: primary?.id || null,
        topicClusterTitle: primary?.title || null,
        topicClusterPath: primary?.path || null,
        topic_clusters: matches.map((entry) => entry.id),
        topicClusterTitles: matches.map((entry) => entry.title),
        topicClusterPaths: matches.map((entry) => entry.path),
        keyword,
        keyword_volume: keywordVolume,
        published_at: clean(frontmatter.published_at),
        updated: clean(frontmatter.updated || frontmatter.updated_at),
        status: clean(frontmatter.status) || (clean(frontmatter.published_at) ? 'published' : 'draft'),
        excerpt: body.replace(/\s+/g, ' ').trim().slice(0, 180),
        hash: sha256(text),
      });
    }
  }

  const q = query.trim().toLowerCase();
  const requestedOrigin = origin.trim();
  const clusterFilters = normalizeClusterFilter(topicCluster);
  let filtered = rows;
  if (requestedOrigin) filtered = filtered.filter((row) => row.origin === requestedOrigin);
  if (clusterFilters.length > 0) {
    filtered = filtered.filter((row) =>
      clusterFilters.some((selected) =>
        selected === NONE_CLUSTER ? row.topic_clusters.length === 0 : row.topic_clusters.includes(selected),
      ),
    );
  }
  if (q) {
    filtered = filtered.filter((row) =>
      [row.title, row.path, row.origin, row.area, row.topicClusterTitle, ...(row.topicClusterTitles || []), row.status, row.excerpt].some(
        (value) => String(value || '').toLowerCase().includes(q),
      ),
    );
  }
  filtered.sort((a, b) => String(b.updated || b.published_at || b.path).localeCompare(String(a.updated || a.published_at || a.path)));

  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safePageSize;
  const assignedCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.topic_clusters.length === 0) {
      assignedCounts.set(NONE_CLUSTER, (assignedCounts.get(NONE_CLUSTER) || 0) + 1);
      continue;
    }
    for (const id of row.topic_clusters) {
      assignedCounts.set(id, (assignedCounts.get(id) || 0) + 1);
    }
  }
  const clusterOptions = [
    ...clusters.map((cluster) => ({ id: cluster.id, title: cluster.title, count: assignedCounts.get(cluster.id) || 0 })),
    ...(assignedCounts.get(NONE_CLUSTER) ? [{ id: NONE_CLUSTER, title: 'Sem cluster', count: assignedCounts.get(NONE_CLUSTER) || 0 }] : []),
  ];

  return {
    ok: true,
    page: safePage,
    pageSize: safePageSize,
    total: filtered.length,
    origins: CONTENT_ORIGINS.map((id) => ({ id, count: rows.filter((row) => row.origin === id).length })),
    topicClusters: clusterOptions,
    items: filtered.slice(start, start + safePageSize),
  };
}
