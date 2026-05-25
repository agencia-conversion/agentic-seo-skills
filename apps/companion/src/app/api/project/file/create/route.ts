import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { createProjectFile } from '@/lib/project-files';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json().catch(() => ({}));
  const requested = String(body.kind || '');
  const kind: 'workbench' | 'content' | 'brain-subpage' =
    requested === 'content' ? 'content' : requested === 'brain-subpage' ? 'brain-subpage' : 'workbench';
  const clusters = Array.isArray(body.clusters)
    ? (body.clusters as unknown[]).map(String).filter((s) => s.length > 0)
    : undefined;
  const result = createProjectFile({
    projectRoot: projectRoot(),
    kind,
    title: body.title || 'Nova página',
    parentPath: body.parentPath ? String(body.parentPath) : undefined,
    origem: body.origem ? String(body.origem) : undefined,
    clusters,
  });
  if (kind === 'content' && clusters && clusters.length > 0 && result && (result as { ok?: boolean }).ok) {
    const path = (result as { path?: string }).path;
    if (path) {
      if (body.syncWait === true) {
        await runClusterSyncHook(projectRoot(), path);
      } else {
        void runClusterSyncHook(projectRoot(), path).catch(() => {});
      }
    }
  }
  return NextResponse.json(result);
}
