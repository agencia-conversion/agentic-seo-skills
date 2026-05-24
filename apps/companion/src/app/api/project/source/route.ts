import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { readProjectSource, SOURCE_CSP } from '@/lib/source-files';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const requested = req.nextUrl.searchParams.get('path');
  const result = readProjectSource(projectRoot(), requested);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: result.status });
  }
  return new NextResponse(result.body, {
    status: 200,
    headers: {
      'content-type': result.contentType,
      'content-security-policy': SOURCE_CSP,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
    },
  });
}
