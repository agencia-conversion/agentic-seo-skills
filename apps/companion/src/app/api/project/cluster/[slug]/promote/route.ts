import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { promoteClusterDraft } from '@/lib/cluster-management';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

// Promote a draft cluster to active without the legacy approve-cluster handoff.
// Mirrors scripts/promote-drafts.mjs: draft.yaml -> cluster.yaml (status
// active), draft archived, cluster-sync run, approval logged, rollback on
// write failure (handled inside promoteClusterDraft).
export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await context.params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const root = projectRoot();
  const result = promoteClusterDraft(root, slug, {
    approver: typeof body?.approver === 'string' ? body.approver : undefined,
  });
  if (!result.ok) {
    const status = result.reason === 'draft-not-found' ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  // Run cluster-sync so the brain subpage + auto-table materialize, mirroring
  // the create path. `syncWait: false` queues it without blocking the response.
  let clusterSync: unknown;
  if (body?.syncWait === false) {
    void runClusterSyncHook(root, result.sync_target).catch(() => {});
    clusterSync = { queued: true };
  } else {
    clusterSync = await runClusterSyncHook(root, result.sync_target);
  }
  return NextResponse.json({ ...result, clusterSync });
}
