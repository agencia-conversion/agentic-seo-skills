import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { duplicateContent } from '@/lib/content-trash';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contentSlug: string }> },
) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { contentSlug } = await params;
  const body = await req.json().catch(() => ({}));
  const result = duplicateContent(projectRoot(), contentSlug);
  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }
  if (body.syncWait === true) {
    const clusterSync = await runClusterSyncHook(projectRoot(), result.newPath);
    return NextResponse.json({ ...result, clusterSync });
  }
  void runClusterSyncHook(projectRoot(), result.newPath).catch(() => {});
  return NextResponse.json(result);
}
