import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { readProjectSettings, updateProjectSettings } from '@/lib/project-files';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json(readProjectSettings({ projectRoot: projectRoot() }));
}

export async function PATCH(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json();
  return NextResponse.json(updateProjectSettings({ projectRoot: projectRoot(), language: body.language }));
}
