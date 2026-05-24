import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { executeQuery } from '@/lib/agentic-query';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = await req.json();
  const source = typeof body?.source === 'string' ? body.source : '';
  if (!source) {
    return NextResponse.json({ ok: false, reason: 'missing-source' }, { status: 400 });
  }
  const result = executeQuery(source, projectRoot());
  return NextResponse.json(result);
}
