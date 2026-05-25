import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { addPlannedSatellite } from '@/lib/cluster-mutations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const result = addPlannedSatellite(projectRoot(), slug, {
    slug: String(body.slug || '').trim(),
    keyword: String(body.keyword || '').trim(),
    display_title: body.display_title ? String(body.display_title).trim() : undefined,
    volume: typeof body.volume === 'number' ? body.volume : undefined,
    intent: body.intent ? String(body.intent) : undefined,
    papel: body.papel === 'pilar' ? 'pilar' : 'satelite',
    acao: body.acao ? String(body.acao) : undefined,
    note: body.note ? String(body.note) : undefined,
  });
  return NextResponse.json(result);
}
