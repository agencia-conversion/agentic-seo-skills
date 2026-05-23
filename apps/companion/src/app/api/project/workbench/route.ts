import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { listProjectWorkbench } from '@/lib/workbench';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json(
    listProjectWorkbench({
      projectRoot: projectRoot(),
      page: Number(req.nextUrl.searchParams.get('page') || 1),
      pageSize: Number(req.nextUrl.searchParams.get('pageSize') || 25),
      query: req.nextUrl.searchParams.get('q') || '',
    })
  );
}
