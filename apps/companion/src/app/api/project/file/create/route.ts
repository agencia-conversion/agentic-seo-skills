import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { createProjectFile } from '@/lib/project-files';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json().catch(() => ({}));
  const requested = String(body.kind || '');
  const kind: 'workbench' | 'content' | 'brain-subpage' =
    requested === 'content' ? 'content' : requested === 'brain-subpage' ? 'brain-subpage' : 'workbench';
  return NextResponse.json(
    createProjectFile({
      projectRoot: projectRoot(),
      kind,
      title: body.title || 'Nova página',
      parentPath: body.parentPath ? String(body.parentPath) : undefined,
    })
  );
}
