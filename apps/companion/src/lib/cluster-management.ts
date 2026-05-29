import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { findContentBySlug, updateContentClusterMembership } from './content-mutations';
import { normalizeClusterYaml } from './cluster-yaml';
import { suggestClusterIcon } from '@/features/clusters/suggest-cluster-icon';

const ORIGINS = ['blog', 'linkedin', 'podcast', 'other'] as const;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ClusterSummary {
  slug: string;
  name: string;
  icon: string | null;
  thesis: string | null;
  status: string;
  pillar_slug: string | null;
  pillar_title: string | null;
  pillar_path: string | null;
  published: number;
  planned: number;
  updated: string | null;
}

interface ContentRecord {
  slug: string;
  title: string;
  path: string;
  clusters: string[];
  keyword: string | null;
  intent: string | null;
  volume: number | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function parseFm(text: string): { fm: Record<string, any>; body: string } {
  const match = text.match(FM_RE);
  if (!match) return { fm: {}, body: text };
  try {
    const parsed = parseYaml(match[1]);
    return {
      fm: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {},
      body: match[2] || '',
    };
  } catch {
    return { fm: {}, body: match[2] || '' };
  }
}

function writeMd(filePath: string, fm: Record<string, any>, body: string) {
  writeFileSync(filePath, `---\n${stringifyYaml(fm, { lineWidth: 0 }).trimEnd()}\n---\n${body.replace(/^\n*/, '\n')}`, 'utf8');
}

function appendLog(projectRoot: string, title: string, scope: string, decision: string, evidence: string) {
  const logFile = join(resolve(projectRoot), 'brain', 'log.md');
  if (!existsSync(logFile)) return;
  const lines = [
    '',
    '',
    `## ${todayIso()} - ${title}`,
    '',
    '- type: decision',
    `- scope: ${scope}`,
    `- decision: ${decision}`,
    `- evidence: ${evidence}`,
    '- approver: user',
  ];
  appendFileSync(logFile, `${lines.join('\n')}\n`, 'utf8');
}

function readClusters(projectRoot: string): Array<{ filePath: string; data: Record<string, any> }> {
  const root = resolve(projectRoot);
  const clustersRoot = join(root, 'clusters');
  if (!existsSync(clustersRoot)) return [];
  const out: Array<{ filePath: string; data: Record<string, any> }> = [];
  for (const name of readdirSync(clustersRoot)) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const filePath = join(clustersRoot, name, 'cluster.yaml');
    if (!existsSync(filePath)) continue;
    try {
      const data = normalizeClusterYaml(parseYaml(readFileSync(filePath, 'utf8'))) as Record<string, any>;
      if (data?.slug) out.push({ filePath, data });
    } catch {
      // Skip malformed clusters so the table can still load.
    }
  }
  return out.sort((a, b) => String(a.data.name || a.data.slug).localeCompare(String(b.data.name || b.data.slug), 'pt-BR'));
}

function scanContents(projectRoot: string): ContentRecord[] {
  const root = resolve(projectRoot);
  const out: ContentRecord[] = [];
  for (const origin of ORIGINS) {
    const dir = join(root, 'contents', origin);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const filePath = join(dir, name);
      try {
        const { fm } = parseFm(readFileSync(filePath, 'utf8'));
        const keywordPrincipal = fm.keyword_principal && typeof fm.keyword_principal === 'object' && !Array.isArray(fm.keyword_principal)
          ? fm.keyword_principal as Record<string, unknown>
          : {};
        out.push({
          slug: slugify(fm.slug || basename(name, '.md')),
          title: String(fm.title || basename(name, '.md')),
          path: relative(root, filePath).split(sep).join('/'),
          clusters: Array.isArray(fm.clusters) ? fm.clusters.map(String) : [],
          keyword: String(fm.keyword || keywordPrincipal.keyword || '').trim() || null,
          intent: String(fm.intent || '').trim() || null,
          volume: typeof fm.volume === 'number' ? fm.volume : Number.isFinite(Number(fm.volume)) ? Number(fm.volume) : null,
        });
      } catch {
        // Ignore malformed content.
      }
    }
  }
  return out;
}

export function readClusterSummaries(projectRoot: string): ClusterSummary[] {
  const contents = scanContents(projectRoot);
  return readClusters(projectRoot).map(({ data }) => {
    const slug = String(data.slug);
    const pillarSlug = data.pillar?.slug ? String(data.pillar.slug) : null;
    const pillar = pillarSlug ? contents.find((content) => content.slug === pillarSlug) || null : null;
    const published = contents.filter((content) => content.clusters.includes(slug));
    const planned = Array.isArray(data.planned_satellites) ? data.planned_satellites.length : 0;
    return {
      slug,
      name: String(data.name || slug),
      icon: typeof data.icon === 'string' && data.icon ? data.icon : null,
      thesis: typeof data.thesis === 'string' ? data.thesis : typeof data.context === 'string' ? data.context : null,
      status: typeof data.status === 'string' ? data.status : 'drafting',
      pillar_slug: pillarSlug,
      pillar_title: pillar?.title || pillarSlug,
      pillar_path: pillar?.path || null,
      published: published.length,
      planned,
      updated: data.stats?.updated ? String(data.stats.updated) : null,
    };
  });
}

function uniqueContentPath(projectRoot: string, origin: string, slug: string) {
  const root = resolve(projectRoot);
  let candidate = join(root, 'contents', origin, `${slug}.md`);
  let index = 2;
  while (existsSync(candidate)) {
    candidate = join(root, 'contents', origin, `${slug}-${index}.md`);
    index++;
  }
  return candidate;
}

function createContentPillar(projectRoot: string, clusterSlug: string, title: string, origin = 'blog'): ContentRecord {
  const safeOrigin = (ORIGINS as readonly string[]).includes(origin) ? origin : 'blog';
  const slug = slugify(title);
  const filePath = uniqueContentPath(projectRoot, safeOrigin, slug);
  mkdirSync(dirname(filePath), { recursive: true });
  const finalSlug = basename(filePath, '.md');
  // No fabricated keyword: a freshly materialized pillar has no researched
  // keyword yet, so we omit it. This keeps the cluster-create path identical
  // to the inline-CTA path (postPublishedContent) and the Keyword column
  // renders "—" until DataForSEO / the user supplies a real keyword.
  const fm = {
    contract_version: 1,
    title,
    slug: finalSlug,
    published_at: '',
    source_url: '',
    origin: safeOrigin,
    keyword: '',
    intent: 'informational',
    clusters: [clusterSlug],
    role: { [clusterSlug]: 'pillar' },
  };
  writeMd(filePath, fm, '\n');
  return {
    slug: finalSlug,
    title,
    path: relative(resolve(projectRoot), filePath).split(sep).join('/'),
    clusters: [clusterSlug],
    keyword: null,
    intent: 'informational',
    volume: null,
  };
}

function ensureUniquePillar(projectRoot: string, clusterSlug: string, pillarSlug: string) {
  const owner = readClusters(projectRoot).find(({ data }) => data.slug !== clusterSlug && data.pillar?.slug === pillarSlug);
  return owner ? String(owner.data.slug) : null;
}

export function createCluster(projectRoot: string, input: Record<string, unknown>) {
  const name = String(input.name || input.title || '').trim();
  const slug = slugify(input.slug || name);
  if (!name || !slug) return { ok: false as const, reason: 'invalid-name' };
  const root = resolve(projectRoot);
  const yamlPath = join(root, 'clusters', slug, 'cluster.yaml');
  const draftPath = join(root, 'clusters', slug, 'draft.yaml');
  if (existsSync(yamlPath) || existsSync(draftPath)) return { ok: false as const, reason: 'cluster-exists' };

  // The human-facing UI creates clusters directly active and integrated with
  // content (escrita direta autorizada). The legacy draft-only path — used by
  // the agent's approve-cluster handoff — is gated behind an explicit flag so
  // the two semantics never diverge silently. See docs/clusters.md.
  const draftOnly = input.draft === true;

  const existingPillar = slugify(input.pillar_slug);
  let pillarSlug = existingPillar;
  let pillarTitle = String(input.pillar_title || name).trim() || name;
  let pillarPath: string | null = null;
  let createdPillarPath: string | null = null;

  if (existingPillar) {
    const located = findContentBySlug(projectRoot, existingPillar);
    if (!located) return { ok: false as const, reason: 'pillar-not-found' };
    pillarSlug = located.slug;
    pillarPath = located.relPath;
    try {
      const parsed = parseFm(readFileSync(located.filePath, 'utf8'));
      pillarTitle = String(parsed.fm.title || pillarTitle).trim() || pillarTitle;
    } catch {
      pillarTitle = pillarTitle || located.slug;
    }
  }
  if (!pillarSlug) pillarSlug = slugify(pillarTitle);

  // A content can only be the pillar of a single cluster. Guard before writing
  // anything to disk so the unique-pillar lint never fires post-write.
  if (!draftOnly && existingPillar) {
    const conflict = ensureUniquePillar(projectRoot, slug, pillarSlug);
    if (conflict) return { ok: false as const, reason: `unique-pillar-violation:${conflict}` };
  }

  // Pre-select a deterministic emoji from the cluster name when the caller did
  // not pick one, so the cluster never starts iconless. The user can override
  // the suggestion in the create modal.
  const icon = String(input.icon || '').trim() || suggestClusterIcon(name);

  const data = {
    contract_version: 1,
    slug,
    name,
    icon,
    status: draftOnly ? 'draft' : 'active',
    thesis: String(input.thesis || '').trim() || `Cluster ${name}.`,
    pillar: {
      // No fabricated keyword: the pillar keyword is resolved from the
      // content's own frontmatter (or supplied later), never seeded from the
      // pillar title. Seeding it produced a phantom keyword in the table.
      slug: pillarSlug,
      keyword: '',
      intent: 'informational',
      volume: null,
      volume_source: null,
    },
    planned_satellites: [],
    satellite_overrides: {},
    stats: { published: 0, planned: 0, updated: todayIso() },
    provenance: draftOnly
      ? { created_at: todayIso(), created_by: 'companion', requires_promotion: true }
      : { created_at: todayIso(), created_by: 'companion' },
    evidence: [],
  };

  if (draftOnly) {
    mkdirSync(dirname(draftPath), { recursive: true });
    writeFileSync(draftPath, stringifyYaml(data, { lineWidth: 0 }), 'utf8');
    appendLog(projectRoot, `Draft de cluster ${name} criado no Companion`, `clusters/${slug}/draft.yaml`, `Proposta de cluster "${name}" criada no Companion. Brain e conteúdos não foram alterados antes de promoção.`, `clusters/${slug}/draft.yaml`);
    return { ok: true as const, cluster: data, affected: [`clusters/${slug}/draft.yaml`], draft_path: `clusters/${slug}/draft.yaml` };
  }

  // Active path. When no existing content was supplied, materialize a fresh
  // pillar so the cluster has a content spine from the start (caminho B).
  if (!existingPillar) {
    const pillar = createContentPillar(projectRoot, slug, pillarTitle);
    pillarSlug = pillar.slug;
    pillarPath = pillar.path;
    createdPillarPath = pillar.path;
    data.pillar.slug = pillarSlug;
  }

  mkdirSync(dirname(yamlPath), { recursive: true });
  writeFileSync(yamlPath, stringifyYaml(data, { lineWidth: 0 }), 'utf8');

  // For an existing content (caminho A), write the affiliation into the pillar
  // frontmatter so the chip + role render and cluster-sync can pick it up.
  if (existingPillar) {
    const membership = updateContentClusterMembership(projectRoot, pillarSlug, slug, 'pillar');
    if (!membership.ok) return membership;
    pillarPath = membership.path;
  }

  const affected = [`clusters/${slug}/cluster.yaml`];
  if (pillarPath) affected.push(pillarPath);

  appendLog(
    projectRoot,
    `Cluster ${name} criado no Companion`,
    `clusters/${slug}/cluster.yaml`,
    `Cluster ativo "${name}" criado no Companion Web com pilar "${pillarSlug}".`,
    affected.join(', '),
  );
  return {
    ok: true as const,
    cluster: data,
    affected,
    pillar_slug: pillarSlug,
    pillar_path: pillarPath,
    created_pillar_path: createdPillarPath,
  };
}

export function updateCluster(projectRoot: string, slug: string, updates: Record<string, unknown>) {
  const entry = readClusters(projectRoot).find(({ data }) => data.slug === slug);
  if (!entry) return { ok: false as const, reason: 'cluster-not-found' };
  // Name is required: reject empty/whitespace renames before touching disk so
  // downstream sync (which rewrites the brain subpage title from the YAML
  // name) never inherits a blank label.
  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    const candidate = String(updates.name ?? '').trim();
    if (!candidate) return { ok: false as const, reason: 'invalid-name' };
  }
  const next = { ...entry.data };
  for (const field of ['name', 'icon', 'thesis', 'status'] as const) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      const value = String(updates[field] ?? '').trim();
      if (field === 'status') next.status = value || next.status || 'drafting';
      else if (value) next[field] = value;
      else delete next[field];
    }
  }
  if (updates.pillar_slug !== undefined) {
    const pillarSlug = slugify(updates.pillar_slug);
    if (!pillarSlug) return { ok: false as const, reason: 'invalid-pillar' };
    const conflict = ensureUniquePillar(projectRoot, slug, pillarSlug);
    if (conflict) return { ok: false as const, reason: `unique-pillar-violation:${conflict}` };
    const oldPillarSlug =
      next.pillar && typeof next.pillar === 'object' && typeof next.pillar.slug === 'string'
        ? next.pillar.slug
        : '';
    const membership = updateContentClusterMembership(projectRoot, pillarSlug, slug, 'pillar');
    if (!membership.ok) return membership;
    const affected = [`clusters/${slug}/cluster.yaml`, membership.path];
    if (oldPillarSlug && oldPillarSlug !== pillarSlug) {
      const demotion = updateContentClusterMembership(projectRoot, oldPillarSlug, slug, 'satellite');
      if (demotion.ok) affected.push(demotion.path);
    }
    next.pillar = {
      ...(next.pillar || {}),
      slug: pillarSlug,
    };
    next.contract_version = 1;
    next.stats = { ...(next.stats || {}), updated: todayIso() };
    writeFileSync(entry.filePath, stringifyYaml(next, { lineWidth: 0 }), 'utf8');
    appendLog(projectRoot, `Cluster ${slug} atualizado no Companion`, `clusters/${slug}/cluster.yaml`, `Pilar do cluster "${slug}" atualizado para "${pillarSlug}" no Companion Web.`, affected.join(', '));
    return { ok: true as const, cluster: next, affected };
  }
  next.contract_version = 1;
  next.stats = { ...(next.stats || {}), updated: todayIso() };
  writeFileSync(entry.filePath, stringifyYaml(next, { lineWidth: 0 }), 'utf8');
  appendLog(projectRoot, `Cluster ${slug} atualizado no Companion`, `clusters/${slug}/cluster.yaml`, `Metadados do cluster "${slug}" atualizados no Companion Web.`, `clusters/${slug}/cluster.yaml`);
  return { ok: true as const, cluster: next, affected: [`clusters/${slug}/cluster.yaml`] };
}

function appendApprovalLog(
  projectRoot: string,
  title: string,
  scope: string,
  decision: string,
  evidence: string,
  approver: string,
) {
  const logFile = join(resolve(projectRoot), 'brain', 'log.md');
  if (!existsSync(logFile)) return;
  const today = todayIso();
  const lines = [
    '',
    '',
    `## ${today} - ${title}`,
    '',
    '- type: approval',
    `- scope: ${scope}`,
    `- decision: ${decision}`,
    `- evidence: ${evidence}`,
    `- approver: ${approver}`,
    `- approved_at: ${today}`,
  ];
  appendFileSync(logFile, `${lines.join('\n')}\n`, 'utf8');
}

export type PromoteClusterDraftResult =
  | {
      ok: true;
      slug: string;
      cluster: Record<string, any>;
      affected: string[];
      archived_path: string;
      sync_target: string;
    }
  | { ok: false; reason: string };

// Promote a draft cluster (status: draft/hypothesis) to an active cluster.yaml.
// Mirrors scripts/promote-drafts.mjs but scoped to a single cluster and driven
// from the Companion UI, so the legacy approve-cluster handoff is no longer
// required. The caller is responsible for running cluster-sync against
// `sync_target`. On any write failure we roll back so the draft is never lost.
export function promoteClusterDraft(
  projectRoot: string,
  slug: string,
  options: { approver?: string } = {},
): PromoteClusterDraftResult {
  const root = resolve(projectRoot);
  const safeSlug = slugify(slug);
  if (!safeSlug) return { ok: false as const, reason: 'invalid-slug' };
  const dir = join(root, 'clusters', safeSlug);
  const draftPath = join(dir, 'draft.yaml');
  const clusterPath = join(dir, 'cluster.yaml');
  if (!existsSync(draftPath)) return { ok: false as const, reason: 'draft-not-found' };
  if (existsSync(clusterPath)) return { ok: false as const, reason: 'cluster-already-active' };

  let draft: Record<string, any>;
  try {
    const parsed = parseYaml(readFileSync(draftPath, 'utf8'));
    draft = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, any>) : {};
  } catch (err) {
    return { ok: false as const, reason: `draft-parse:${(err as Error).message}` };
  }

  const today = todayIso();
  const approver = String(options.approver || 'user').trim() || 'user';
  const provenance = { ...(draft.provenance || {}) } as Record<string, unknown>;
  delete provenance.requires_promotion;
  delete provenance.bypass;
  const next: Record<string, any> = {
    ...draft,
    contract_version: 1,
    status: 'active',
    provenance: { ...provenance, promoted_at: today, promoted_by: approver },
    stats: { ...(draft.stats || {}), updated: today },
  };

  const archivedPath = draftPath.replace(/\.yaml$/, `.archived-${today}.yaml`);
  let wroteCluster = false;
  let archivedDraft = false;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(clusterPath, stringifyYaml(next, { lineWidth: 0 }), 'utf8');
    wroteCluster = true;
    renameSync(draftPath, archivedPath);
    archivedDraft = true;
  } catch (err) {
    // Rollback: restore the draft and remove a partially written cluster.yaml
    // so a failed promotion never destroys the proposal.
    try {
      if (archivedDraft && existsSync(archivedPath) && !existsSync(draftPath)) {
        renameSync(archivedPath, draftPath);
      }
      if (wroteCluster && existsSync(clusterPath)) {
        renameSync(clusterPath, `${clusterPath}.failed-${today}`);
      }
    } catch {
      // Best-effort rollback; surface the original failure regardless.
    }
    return { ok: false as const, reason: `promote-write:${(err as Error).message}` };
  }

  const clusterRel = `clusters/${safeSlug}/cluster.yaml`;
  const archivedRel = `clusters/${safeSlug}/${basename(archivedPath)}`;
  const affected = [clusterRel, archivedRel];
  appendApprovalLog(
    projectRoot,
    `Cluster ${next.name || safeSlug} promovido para active no Companion`,
    clusterRel,
    `Draft "${safeSlug}" promovido para status active no Companion Web. Draft arquivado em ${archivedRel}.`,
    affected.join(', '),
    approver,
  );

  return {
    ok: true as const,
    slug: safeSlug,
    cluster: next,
    affected,
    archived_path: archivedRel,
    sync_target: clusterRel,
  };
}
