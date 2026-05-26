import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { readProjectFile, saveProjectFile } from '@/lib/project-files';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json(
    readProjectFile({
      projectRoot: projectRoot(),
      fileRel: req.nextUrl.searchParams.get('path'),
    })
  );
}

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json();
  const saveResult = saveProjectFile({
    projectRoot: projectRoot(),
    fileRel: body.path,
    expectedHash: body.hash,
    title: body.title,
    body: body.body,
    frontmatter: body.frontmatter,
    frontmatterRaw: body.frontmatterRaw,
    ui: body.ui,
    approver: body.approver,
    notes: body.notes,
  });
  let clusterSyncMeta: { queued?: boolean; ran?: boolean; ok?: boolean; noop?: boolean; lints?: unknown[] } | null = null;
  if (
    saveResult &&
    (saveResult as { ok?: boolean }).ok &&
    typeof body.path === 'string'
  ) {
    if (body.syncWait === true) {
      clusterSyncMeta = await runClusterSyncHook(projectRoot(), body.path);
    } else {
      clusterSyncMeta = { queued: true };
      void runClusterSyncHook(projectRoot(), body.path).catch(() => {});
    }
  }
  return NextResponse.json({ ...saveResult, clusterSync: clusterSyncMeta });
}
