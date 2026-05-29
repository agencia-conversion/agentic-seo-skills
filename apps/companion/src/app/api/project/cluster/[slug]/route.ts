import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as yamlParse } from 'yaml';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { updateCluster } from '@/lib/cluster-management';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

interface ClusterYaml {
  slug?: string;
  name?: string;
  icon?: string;
  status?: string;
  thesis?: string;
  pillar?: { slug?: string; keyword?: string; intent?: string; volume?: number | null };
  planned_satellites?: Array<{
    slug?: string;
    keyword?: string;
    intent?: string;
    volume?: number | null;
    role?: string;
    note?: string | null;
    editorial_status?: string;
  }>;
  satellite_overrides?: Record<string, {
    display_title?: string;
    keyword?: string;
    intent?: string;
    volume?: number | null;
    editorial_status?: string;
  }>;
}

type EditorialStatusOut = 'draft' | 'in-review' | 'approved' | 'published';
const EDITORIAL_STATUS_VALUES: ReadonlyArray<EditorialStatusOut> = ['draft', 'in-review', 'approved', 'published'];

function coerceEditorialStatus(value: unknown, fallback: EditorialStatusOut): EditorialStatusOut {
  if (typeof value === 'string' && (EDITORIAL_STATUS_VALUES as readonly string[]).includes(value)) {
    return value as EditorialStatusOut;
  }
  return fallback;
}

interface ContentRecord {
  slug: string;
  origin: string;
  title: string;
  published_at: string;
  clusters: string[];
  role: Record<string, string>;
  keyword: string;
  intent: string;
  volume: number | null;
}

interface RowOut {
  slug: string;
  role: 'pillar' | 'satellite';
  role_label: string;
  content: { kind: 'published'; title: string; href: string; origin: string } | { kind: 'planned'; slug: string };
  keyword: string;
  keyword_volume: number | null;
  intent: string;
  status: 'published' | 'planned';
  editorial_status: 'draft' | 'in-review' | 'approved' | 'published';
  action: string;
  updated: string;
  also_in: string[];
}

function readClusterYaml(root: string, slug: string): ClusterYaml | null {
  const filePath = join(root, 'clusters', slug, 'cluster.yaml');
  if (!existsSync(filePath)) return null;
  try {
    return yamlParse(readFileSync(filePath, 'utf8')) as ClusterYaml;
  } catch {
    return null;
  }
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const ORIGINS = ['blog', 'linkedin', 'podcast', 'other'];

function parseContentFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(FM_RE);
  if (!m) return {};
  try {
    return (yamlParse(m[1]) as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

function scanContents(root: string): ContentRecord[] {
  const out: ContentRecord[] = [];
  for (const origin of ORIGINS) {
    const dir = join(root, 'contents', origin);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const filePath = join(dir, name);
      try {
        statSync(filePath);
      } catch {
        continue;
      }
      const fm = parseContentFrontmatter(readFileSync(filePath, 'utf8'));
      const slug = String(fm.slug || name.replace(/\.md$/, ''));
      const clusters = Array.isArray(fm.clusters) ? (fm.clusters as unknown[]).map(String) : [];
      const keywordPrincipal =
        fm.keyword_principal && typeof fm.keyword_principal === 'object' && !Array.isArray(fm.keyword_principal)
          ? fm.keyword_principal as Record<string, unknown>
          : {};
      const role = fm.role && typeof fm.role === 'object' && !Array.isArray(fm.role)
        ? Object.fromEntries(Object.entries(fm.role as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
        : {};
      out.push({
        slug,
        origin,
        title: String(fm.title || slug),
        published_at: String(fm.published_at || ''),
        clusters,
        role,
        keyword: String(fm.keyword || keywordPrincipal.keyword || '').trim(),
        intent: String(fm.intent || '').trim(),
        volume: typeof fm.volume === 'number'
          ? fm.volume
          : Number.isFinite(Number(fm.volume))
            ? Number(fm.volume)
            : null,
      });
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function buildRows(yaml: ClusterYaml, contents: ContentRecord[], slug: string): RowOut[] {
  const overrides = yaml.satellite_overrides || {};
  const myContents = contents.filter((c) => c.clusters.includes(slug));
  const pillarSlug = yaml.pillar?.slug;
  const rows: RowOut[] = [];

  const pillarContent = pillarSlug ? myContents.find((c) => c.slug === pillarSlug) : undefined;
  if (pillarContent) {
    const ov = overrides[pillarContent.slug] || {};
    rows.push({
      slug: pillarContent.slug,
      role: 'pillar',
      role_label: 'Pilar',
      content: { kind: 'published', title: ov.display_title || pillarContent.title, href: `contents/${pillarContent.origin}/${pillarContent.slug}.md`, origin: pillarContent.origin },
      keyword: String(ov.keyword || pillarContent.keyword || yaml.pillar?.keyword || ''),
      keyword_volume: typeof (ov.volume ?? pillarContent.volume ?? yaml.pillar?.volume) === 'number'
        ? (ov.volume ?? pillarContent.volume ?? yaml.pillar?.volume) as number
        : null,
      intent: String(ov.intent || pillarContent.intent || yaml.pillar?.intent || ''),
      status: 'published',
      editorial_status: coerceEditorialStatus(ov.editorial_status, 'published'),
      action: '—',
      updated: pillarContent.published_at || '—',
      also_in: pillarContent.clusters.filter((c) => c !== slug),
    });
  } else if (yaml.pillar?.slug && yaml.status === 'active') {
    rows.push({
      slug: yaml.pillar.slug,
      role: 'pillar',
      role_label: 'Pilar',
      content: { kind: 'planned', slug: yaml.pillar.slug },
      keyword: String(yaml.pillar.keyword || ''),
      keyword_volume: typeof yaml.pillar.volume === 'number' ? yaml.pillar.volume : null,
      intent: String(yaml.pillar.intent || ''),
      status: 'planned',
      editorial_status: 'draft',
      action: 'Briefing',
      updated: '—',
      also_in: [],
    });
  }

  for (const content of myContents) {
    if (pillarContent && content.slug === pillarContent.slug) continue;
    const ov = overrides[content.slug] || {};
    rows.push({
      slug: content.slug,
      role: 'satellite',
      role_label: 'Satélite',
      content: { kind: 'published', title: ov.display_title || content.title, href: `contents/${content.origin}/${content.slug}.md`, origin: content.origin },
      keyword: String(ov.keyword || content.keyword || ''),
      keyword_volume: typeof (ov.volume ?? content.volume) === 'number' ? (ov.volume ?? content.volume) as number : null,
      intent: String(ov.intent || content.intent || ''),
      status: 'published',
      editorial_status: coerceEditorialStatus(ov.editorial_status, 'published'),
      action: '—',
      updated: content.published_at || '—',
      also_in: content.clusters.filter((c) => c !== slug),
    });
  }

  for (const planned of yaml.planned_satellites || []) {
    if (!planned.slug) continue;
    rows.push({
      slug: planned.slug,
      role: planned.role === 'pillar' ? 'pillar' : 'satellite',
      role_label: planned.role === 'pillar' ? 'Pilar' : 'Satélite',
      content: { kind: 'planned', slug: planned.slug },
      keyword: String(planned.keyword || ''),
      keyword_volume: typeof planned.volume === 'number' ? planned.volume : null,
      intent: String(planned.intent || ''),
      status: 'planned',
      editorial_status: coerceEditorialStatus(planned.editorial_status, 'draft'),
      action: 'Briefing',
      updated: '—',
      also_in: [],
    });
  }

  return rows;
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await context.params;
  const root = resolve(process.cwd(), projectRoot());
  const yaml = readClusterYaml(root, slug);
  if (!yaml) {
    return NextResponse.json({ ok: false, reason: 'cluster-not-found' }, { status: 404 });
  }
  const contents = scanContents(root);
  const rows = buildRows(yaml, contents, slug);
  return NextResponse.json({
    ok: true,
    cluster: {
      slug,
      name: yaml.name || slug,
      icon: yaml.icon || null,
      status: yaml.status || null,
      thesis: yaml.thesis || null,
      pillar_slug: yaml.pillar?.slug || null,
    },
    rows,
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await context.params;
  const body = await req.json().catch(() => ({}));
  const result = updateCluster(projectRoot(), slug, body);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  const clusterSync = body.syncWait === false
    ? { queued: true }
    : await runClusterSyncHook(projectRoot(), `clusters/${slug}/cluster.yaml`);
  if (body.syncWait === false) {
    void runClusterSyncHook(projectRoot(), `clusters/${slug}/cluster.yaml`).catch(() => {});
  }
  return NextResponse.json({ ...result, clusterSync });
}
