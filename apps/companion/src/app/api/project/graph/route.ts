import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { buildGraph } from '@/lib/graph-builder';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const payload = buildGraph(projectRoot());
  return NextResponse.json({ ok: true, ...payload });
}
