import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { deleteProjectFile } from '@/lib/project-files';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    deleteProjectFile({
      projectRoot: projectRoot(),
      fileRel: body.path,
      expectedHash: body.hash,
      dirty: body.dirty === true,
    })
  );
}
