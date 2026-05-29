import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import { appendBypassDecision } from '@/lib/project-files';

export const dynamic = 'force-dynamic';

// Companion replacement for the legacy 127.0.0.1/handoff dataforseo-bypass flow.
// Appends a deliberate type:decision bypass entry to project/brain/log.md.
export async function POST(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-json' }, { status: 400 });
  }
  const result = appendBypassDecision({
    projectRoot: projectRoot(),
    reason: body?.reason,
    consequence: body?.consequence,
    approver: body?.approver,
    workflow: body?.workflow,
    step: body?.step,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
