import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { editClusterRow } from '@/lib/cluster-mutations';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = new Set(['display_title', 'keyword', 'intent', 'acao', 'papel', 'note']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; contentSlug: string }> },
) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug, contentSlug } = await params;
  const body = await req.json().catch(() => ({}));
  const field = String(body.field || '');
  const value = body.value == null ? '' : String(body.value);
  const kind = body.kind === 'planned' ? 'planned' : 'published';
  if (!ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ ok: false, reason: 'invalid-field' }, { status: 400 });
  }
  const result = editClusterRow(projectRoot(), slug, contentSlug, {
    field: field as 'display_title' | 'keyword' | 'intent' | 'acao' | 'papel' | 'note',
    value,
    kind,
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
