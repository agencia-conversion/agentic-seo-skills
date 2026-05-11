import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { createProjectFile } from '@/lib/project-files';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    createProjectFile({
      projectRoot: projectRoot(),
      kind: body.kind === 'content' ? 'content' : 'workbench',
      title: body.title || 'Nova página',
    })
  );
}
