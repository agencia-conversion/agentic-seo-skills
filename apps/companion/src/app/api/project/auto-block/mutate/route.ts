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
    if (existsSync(join(p, 'scripts', 'auto-block-mutate.mjs'))) return p;
  }
  return null;
}

interface CellMutation {
  type: 'cell';
  row: string;
  column: string;
  value: unknown;
}

interface RowMutation {
  type: 'row';
  row: string;
  action: 'move-to-block' | 'reorder' | 'remove' | 'add';
  targetBlockId?: string;
  targetParams?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

interface MutateRequest {
  block_id?: string;
  kind?: string;
  params?: Record<string, unknown>;
  expected_fingerprint?: string;
  mutation?: CellMutation | RowMutation;
  actor?: string;
}

export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const body = (await req.json()) as MutateRequest;
  if (!body?.kind || !body.mutation || !body.params) {
    return NextResponse.json(
      { ok: false, error: 'missing kind/mutation/params' },
      { status: 400 },
    );
  }
  const pluginRoot = findPluginRoot();
  if (!pluginRoot) {
    return NextResponse.json(
      { ok: false, error: 'plugin-root-not-found' },
      { status: 500 },
    );
  }
  const scriptPath = join(pluginRoot, 'scripts', 'auto-block-mutate.mjs');
  const projRoot = projectRoot();
  const payload = JSON.stringify({ ...body, projectRoot: projRoot });

  return new Promise<NextResponse>((resolveFn) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      resolveFn(
        NextResponse.json(
          { ok: false, error: `spawn-error:${err.message}` },
          { status: 500 },
        ),
      );
    });
    child.on('close', () => {
      try {
        const data = JSON.parse(stdout);
        const status = data.conflict ? 409 : data.ok ? 200 : 500;
        resolveFn(NextResponse.json(data, { status }));
      } catch {
        resolveFn(
          NextResponse.json(
            {
              ok: false,
              error: stderr.slice(0, 200) || 'parse-error',
              stdout: stdout.slice(0, 200),
            },
            { status: 500 },
          ),
        );
      }
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}
