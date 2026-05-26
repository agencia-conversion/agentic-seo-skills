import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { listProjectContents } from '@/lib/contents';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json(
    listProjectContents({
      projectRoot: projectRoot(),
      page: Number(req.nextUrl.searchParams.get('page') || 1),
      pageSize: Number(req.nextUrl.searchParams.get('pageSize') || 25),
      query: req.nextUrl.searchParams.get('query') || '',
      origin: req.nextUrl.searchParams.get('origin') || '',
      topicCluster: req.nextUrl.searchParams.get('topicCluster') || '',
      sort: req.nextUrl.searchParams.get('sort') || '',
      direction: req.nextUrl.searchParams.get('direction') || '',
    })
  );
}
