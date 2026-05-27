import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { parse as parseYaml } from 'yaml';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { updateCluster } from '@/lib/cluster-management';
import { updateContentClusterMembership } from '@/lib/content-mutations';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

function readCluster(projectRootPath: string, slug: string): Record<string, any> | null {
  const yamlPath = join(projectRootPath, 'clusters', slug, 'cluster.yaml');
  if (!existsSync(yamlPath)) return null;
  try {
    const parsed = parseYaml(readFileSync(yamlPath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : null;
  } catch {
    return null;
  }
}

function normalizeRole(value: unknown): 'pillar' | 'satellite' | null {
  if (value === null || value === '' || value === false) return null;
  if (value === 'pillar') return 'pillar';
  return 'satellite';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contentSlug: string }> },
) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { contentSlug } = await params;
  const body = await req.json().catch(() => ({}));
  const clusterSlug = String(body.cluster_slug || body.clusterSlug || '').trim();
  if (!clusterSlug) return NextResponse.json({ ok: false, reason: 'missing-cluster' }, { status: 400 });

  const root = projectRoot();
  const cluster = readCluster(root, clusterSlug);
  if (!cluster) return NextResponse.json({ ok: false, reason: 'cluster-not-found' }, { status: 404 });

  const role = normalizeRole(body.role);
  const pillarSlug =
    cluster.pillar && typeof cluster.pillar === 'object' && !Array.isArray(cluster.pillar)
      ? String((cluster.pillar as Record<string, unknown>).slug || '')
      : '';
  if (role !== 'pillar' && cluster.status === 'active' && pillarSlug === contentSlug) {
    return NextResponse.json({ ok: false, reason: 'active-pillar-required' }, { status: 400 });
  }

  const result = role === 'pillar'
    ? updateCluster(root, clusterSlug, { pillar_slug: contentSlug })
    : updateContentClusterMembership(root, contentSlug, clusterSlug, role);

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const affected = 'affected' in result ? result.affected : [result.path];
  const target = affected.find((path) => path.startsWith('clusters/')) || affected[0];
  const clusterSync = body.syncWait === false
    ? { queued: true }
    : await runClusterSyncHook(root, target);
  if (body.syncWait === false) {
    void runClusterSyncHook(root, target).catch(() => {});
  }
  return NextResponse.json({ ...result, clusterSync });
}
