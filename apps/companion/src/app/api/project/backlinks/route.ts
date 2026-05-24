import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { backlinksFor, buildBacklinkIndex, outgoingFor } from '@/lib/backlink-index';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const path = req.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ ok: false, reason: 'missing-path' }, { status: 400 });
  }
  const index = buildBacklinkIndex(projectRoot());
  const incoming = backlinksFor(index, path);
  const outgoing = outgoingFor(index, path).map((link) => ({
    rawTarget: link.rawTarget,
    resolved: link.resolved,
    line: link.line,
    type: link.type,
    alias: link.alias,
    anchor: link.anchor,
    broken: link.resolved === null && link.type !== 'markdown',
  }));
  return NextResponse.json({
    ok: true,
    path,
    incoming: incoming.map((entry) => ({
      source: entry.source,
      line: entry.line,
      context: entry.context,
      type: entry.type,
      alias: entry.alias,
      anchor: entry.anchor,
    })),
    outgoing,
    totalIncoming: incoming.length,
    totalOutgoing: outgoing.length,
  });
}
