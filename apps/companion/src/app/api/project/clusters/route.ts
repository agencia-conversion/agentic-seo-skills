import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { createCluster, readClusterSummaries } from '@/lib/cluster-management';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json({ ok: true, clusters: readClusterSummaries(projectRoot()) });
}

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json().catch(() => ({}));
  const result = createCluster(projectRoot(), body);
  if (result.ok) {
    const target = result.affected.find((path) => path.startsWith('clusters/')) || result.affected[0];
    const clusterSync = await runClusterSyncHook(projectRoot(), target);
    return NextResponse.json({ ...result, clusterSync });
  }
  return NextResponse.json(result, { status: 400 });
}
