import { NextRequest, NextResponse } from 'next/server';

export function rejectUnlessLocal(req: NextRequest) {
  const expectedToken = process.env.AGENTIC_SEO_COMPANION_TOKEN;
  if (!expectedToken) return NextResponse.json({ ok: false, reason: 'missing-server-token' }, { status: 500 });

  const token = req.headers.get('x-companion-token') || req.nextUrl.searchParams.get('token');
  if (token !== expectedToken) {
    return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  }

  const host = req.headers.get('host') || '';
  if (!/^127\.0\.0\.1:\d+$/.test(host) && !/^localhost:\d+$/.test(host)) {
    return NextResponse.json({ ok: false, reason: 'invalid-host' }, { status: 403 });
  }

  const origin = req.headers.get('origin');
  if (origin && origin !== `http://${host}`) {
    return NextResponse.json({ ok: false, reason: 'invalid-origin' }, { status: 403 });
  }

  return null;
}

export function projectRoot() {
  return process.env.AGENTIC_SEO_PROJECT_ROOT || 'project';
}
