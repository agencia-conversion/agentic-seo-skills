import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { addPlannedSatellite } from '@/lib/cluster-mutations';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const result = addPlannedSatellite(projectRoot(), slug, {
    slug: String(body.slug || '').trim(),
    keyword: String(body.keyword || '').trim(),
    display_title: body.display_title ? String(body.display_title).trim() : undefined,
    volume: typeof body.volume === 'number' ? body.volume : undefined,
    intent: body.intent ? String(body.intent) : undefined,
    role: body.role === 'pillar' ? 'pillar' : 'satellite',
    action: body.action ? String(body.action) : undefined,
    note: body.note ? String(body.note) : undefined,
  });
  if (result.ok) {
    if (body.syncWait === true) {
      await runClusterSyncHook(projectRoot(), `clusters/${slug}/cluster.yaml`);
    } else {
      void runClusterSyncHook(projectRoot(), `clusters/${slug}/cluster.yaml`).catch(() => {});
    }
  }
  return NextResponse.json(result);
}
