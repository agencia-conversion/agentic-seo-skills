import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { buildTagIndex } from '@/lib/tag-index';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const index = buildTagIndex(projectRoot());
  return NextResponse.json({
    ok: true,
    total: index.total,
    tags: index.tags,
  });
}
