import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { buildProjectTree } from '@/lib/project-files';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json(buildProjectTree({ projectRoot: projectRoot() }));
}
