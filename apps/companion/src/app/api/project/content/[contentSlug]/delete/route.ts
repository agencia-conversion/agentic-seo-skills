import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { trashContent } from '@/lib/content-trash';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

// POST is used (not DELETE) so it stays consistent with /file/delete and the
// existing companion API surface. Moving the content to Trash/ is treated
// as a recoverable mutation, not a destructive one.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contentSlug: string }> },
) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { contentSlug } = await params;
  const body = await req.json().catch(() => ({}));
  const result = trashContent(projectRoot(), contentSlug);
  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }
  if (body.syncWait === true) {
    const clusterSync = await runClusterSyncHook(projectRoot(), result.originalPath);
    return NextResponse.json({ ...result, clusterSync });
  }
  void runClusterSyncHook(projectRoot(), result.originalPath).catch(() => {});
  return NextResponse.json(result);
}
