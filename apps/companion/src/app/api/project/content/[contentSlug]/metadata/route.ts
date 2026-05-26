import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { updateContentMetadata } from '@/lib/content-mutations';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = new Set(['title', 'keyword', 'intent', 'volume']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contentSlug: string }> },
) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { contentSlug } = await params;
  const body = await req.json().catch(() => ({}));
  const field = String(body.field || '');
  if (!ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ ok: false, reason: 'invalid-field' }, { status: 400 });
  }
  const result = updateContentMetadata(projectRoot(), contentSlug, {
    [field]: body.value == null ? '' : String(body.value),
  });
  if (result.ok) {
    if (body.syncWait === true) {
      const clusterSync = await runClusterSyncHook(projectRoot(), result.path);
      return NextResponse.json({ ...result, clusterSync });
    }
    void runClusterSyncHook(projectRoot(), result.path).catch(() => {});
  }
  return NextResponse.json(result);
}
