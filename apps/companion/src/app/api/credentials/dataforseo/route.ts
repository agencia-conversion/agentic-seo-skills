import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal } from '@/lib/api-guard';
import { readDataForSeoStatus, saveDataForSeoCredentials } from '@/lib/credentials';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  return NextResponse.json({ ok: true, status: readDataForSeoStatus() });
}

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-json' }, { status: 400 });
  }
  const login = String(body?.login || '').trim();
  const password = String(body?.password || '');
  const mode = String(body?.mode || 'standard');
  const result = await saveDataForSeoCredentials(login, password, mode);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
