import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as yamlParse } from 'yaml';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

interface ClusterEntry {
  slug: string;
  name: string;
  icon?: string;
  status?: string;
  area?: string;
  pillar_slug?: string;
}

function readClusters(root: string): ClusterEntry[] {
  const absRoot = resolve(process.cwd(), root);
  const dir = join(absRoot, 'clusters');
  if (!existsSync(dir)) return [];
  const out: ClusterEntry[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const yamlPath = join(dir, name, 'cluster.yaml');
    if (!existsSync(yamlPath)) continue;
    try {
      const data = yamlParse(readFileSync(yamlPath, 'utf8')) as Record<string, unknown>;
      if (data && typeof data.slug === 'string' && typeof data.name === 'string') {
        out.push({
          slug: data.slug,
          name: data.name,
          icon: typeof data.icon === 'string' ? data.icon : undefined,
          status: typeof data.status === 'string' ? data.status : undefined,
          area: typeof data.area === 'string' ? data.area : undefined,
          pillar_slug:
            data.pillar && typeof data.pillar === 'object' && !Array.isArray(data.pillar) && typeof (data.pillar as Record<string, unknown>).slug === 'string'
              ? String((data.pillar as Record<string, unknown>).slug)
              : undefined,
        });
      }
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const clusters = readClusters(projectRoot());
  return NextResponse.json({ ok: true, clusters });
}
