import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { runClusterSyncHook } from '@/lib/cluster-sync-runner';

export const dynamic = 'force-dynamic';

interface MoveBody {
  area?: string;
  area_name?: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid-slug' }, { status: 400 });
  }
  const body = (await req.json()) as MoveBody;
  const nextArea = typeof body?.area === 'string' ? body.area.trim() : '';
  if (!nextArea) {
    return NextResponse.json({ ok: false, error: 'missing-area' }, { status: 400 });
  }
  const root = projectRoot();
  const yamlPath = join(root, 'clusters', slug, 'cluster.yaml');
  if (!existsSync(yamlPath)) {
    return NextResponse.json({ ok: false, error: 'cluster-not-found' }, { status: 404 });
  }
  let yaml: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(readFileSync(yamlPath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      yaml = parsed as Record<string, unknown>;
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `yaml-parse:${(err as Error).message}` },
      { status: 500 },
    );
  }
  const previousArea = typeof yaml.area === 'string' ? yaml.area : null;
  yaml.area = nextArea;
  if (typeof body?.area_name === 'string') {
    yaml.area_name = body.area_name;
  } else if (body?.area_name === null) {
    delete yaml.area_name;
  }
  try {
    writeFileSync(yamlPath, stringifyYaml(yaml, { lineWidth: 0 }), 'utf8');
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `write-failed:${(err as Error).message}` },
      { status: 500 },
    );
  }
  const syncResult = await runClusterSyncHook(root, `clusters/${slug}/cluster.yaml`);
  return NextResponse.json({
    ok: true,
    slug,
    previous_area: previousArea,
    next_area: nextArea,
    sync: syncResult,
  });
}
