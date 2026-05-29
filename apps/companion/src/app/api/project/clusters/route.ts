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
  const root = projectRoot();
  const result = createCluster(root, body);
  if (result.ok) {
    const syncTarget = result.affected.find((path) => path.endsWith('/cluster.yaml'));
    let clusterSync: unknown;
    if (!syncTarget) {
      // Draft-only path: there is no active cluster.yaml to sync yet; promotion
      // happens through the agent's approve-cluster handoff.
      clusterSync = { skipped: true, reason: 'draft-requires-promotion' };
    } else if (body.syncWait === false) {
      void runClusterSyncHook(root, syncTarget).catch(() => {});
      clusterSync = { queued: true };
    } else {
      clusterSync = await runClusterSyncHook(root, syncTarget);
    }
    return NextResponse.json({ ...result, clusterSync });
  }
  return NextResponse.json(result, { status: 400 });
}
