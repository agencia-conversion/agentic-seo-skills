import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

function findPluginRoot(): string | null {
  const candidates = [
    process.env.AGENTIC_SEO_PLUGIN_ROOT,
    process.env.SEO_BRAIN_PLUGIN_ROOT,
    resolve(process.cwd(), '..', '..'),
    process.cwd(),
  ].filter((p): p is string => Boolean(p));
  for (const p of candidates) {
    if (existsSync(join(p, 'scripts', 'auto-block-schema.mjs'))) return p;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');
  if (!kind) return NextResponse.json({ ok: false, error: 'missing kind' }, { status: 400 });
  const pluginRoot = findPluginRoot();
  if (!pluginRoot) {
    return NextResponse.json({ ok: false, error: 'plugin-root-not-found' }, { status: 500 });
  }
  const scriptPath = join(pluginRoot, 'scripts', 'auto-block-schema.mjs');
  const payload = JSON.stringify({ kind, projectRoot: projectRoot() });

  return new Promise<NextResponse>((resolveFn) => {
    const child = spawn(process.execPath, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => {
      resolveFn(NextResponse.json({ ok: false, error: err.message }, { status: 500 }));
    });
    child.on('close', () => {
      try {
        resolveFn(NextResponse.json(JSON.parse(stdout)));
      } catch {
        resolveFn(NextResponse.json({ ok: false, error: stderr || 'parse-error' }, { status: 500 }));
      }
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}
