import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { brokenList, buildBacklinkIndex } from '@/lib/backlink-index';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const index = buildBacklinkIndex(projectRoot());
  const broken = brokenList(index);
  const bySource = new Map<string, typeof broken>();
  for (const entry of broken) {
    const arr = bySource.get(entry.source) || [];
    arr.push(entry);
    bySource.set(entry.source, arr);
  }
  return NextResponse.json({
    ok: true,
    total: broken.length,
    grouped: Array.from(bySource.entries()).map(([source, entries]) => ({
      source,
      entries,
    })),
    flat: broken,
  });
}
