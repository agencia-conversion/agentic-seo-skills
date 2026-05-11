import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { readProjectFile, saveProjectFile } from '@/lib/project-files';

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
  return NextResponse.json(
    saveProjectFile({
      projectRoot: projectRoot(),
      fileRel: body.path,
      expectedHash: body.hash,
      title: body.title,
      body: body.body,
      approver: body.approver,
      notes: body.notes,
    })
  );
}
