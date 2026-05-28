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
    if (existsSync(join(p, 'scripts', 'auto-block-expand.mjs'))) return p;
  }
  return null;
}

interface ExpandRequest {
  kind?: string;
  params?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = (await req.json()) as ExpandRequest;
  const kind = typeof body?.kind === 'string' ? body.kind : '';
  const params = body?.params && typeof body.params === 'object' ? body.params : {};
  if (!kind) {
    return NextResponse.json({ ok: false, error: 'missing kind' }, { status: 400 });
  }
  const pluginRoot = findPluginRoot();
  if (!pluginRoot) {
    return NextResponse.json(
      { ok: false, error: 'plugin-root-not-found' },
      { status: 500 },
    );
  }
  const scriptPath = join(pluginRoot, 'scripts', 'auto-block-expand.mjs');
  const projRoot = projectRoot();
  const payload = JSON.stringify({ kind, params, projectRoot: projRoot });

  return new Promise<NextResponse>((resolveFn) => {
    const child = spawn(process.execPath, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      resolveFn(NextResponse.json({ ok: false, error: `spawn-error:${err.message}` }, { status: 500 }));
    });
    child.on('close', () => {
      try {
        const data = JSON.parse(stdout);
        resolveFn(NextResponse.json(data));
      } catch {
        resolveFn(
          NextResponse.json(
            { ok: false, error: stderr.slice(0, 200) || 'parse-error', stdout: stdout.slice(0, 200) },
            { status: 500 },
          ),
        );
      }
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}
