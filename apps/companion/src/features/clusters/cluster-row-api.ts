export interface ClusterApiResult {
  ok: boolean;
  reason?: string;
}

export function getCompanionToken(): string | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('token');
  if (param) return param;
  const m = window.location.pathname.match(/^\/project\/([^/]+)/);
  return m ? m[1] : null;
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function readApiResult(res: Response): Promise<ClusterApiResult> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (body && typeof body === 'object') {
    if (res.ok && body.ok !== false) {
      return { ok: true, ...body };
    }
    if (typeof body.reason === 'string') {
      return { ok: false, reason: body.reason };
    }
  }
  return { ok: false, reason: `http-${res.status}` };
}

export async function postSatellite(
  clusterSlug: string,
  title: string,
): Promise<ClusterApiResult> {
  const token = getCompanionToken();
  if (!token) return { ok: false, reason: 'missing-token' };
  const slug = slugify(title);
  if (!slug) return { ok: false, reason: 'invalid-title' };
  const res = await fetch(
    `/api/project/cluster/${encodeURIComponent(clusterSlug)}/satellite?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
      body: JSON.stringify({ slug, syncWait: true }),
    },
  );
  return readApiResult(res);
}

export interface PostPublishedContentInput {
  title: string;
  origin: 'blog' | 'linkedin' | 'podcast' | 'other';
  clusters: string[];
}

export interface PostPublishedContentResult extends ClusterApiResult {
  path?: string;
  slug?: string;
}

// Creates a real published content file under contents/<origin>/<slug>.md
// with the typed title preserved verbatim in frontmatter and the cluster
// linked via clusters: []. Used by inline CTA on cluster pages so the user
// gets a clickable row immediately, not a planned-satellite placeholder.
export async function postPublishedContent(
  input: PostPublishedContentInput,
): Promise<PostPublishedContentResult> {
  const token = getCompanionToken();
  if (!token) return { ok: false, reason: 'missing-token' };
  const title = String(input.title || '').trim();
  if (!title) return { ok: false, reason: 'invalid-title' };
  const res = await fetch(
    `/api/project/file/create?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
      body: JSON.stringify({
        kind: 'content',
        title,
        origin: input.origin,
        clusters: input.clusters,
        syncWait: true,
      }),
    },
  );
  const body = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!res.ok || !body || body.ok === false) {
    const reason = typeof body?.reason === 'string' ? body.reason : `http-${res.status}`;
    return { ok: false, reason };
  }
  const path = typeof body.path === 'string' ? body.path : undefined;
  const slug = path ? path.replace(/\.md$/, '').split('/').pop() : undefined;
  return { ok: true, path, slug };
}

export async function patchRow(
  clusterSlug: string,
  contentSlug: string,
  field: string,
  value: string,
  kind: 'published' | 'planned',
): Promise<ClusterApiResult> {
  const token = getCompanionToken();
  if (!token) return { ok: false, reason: 'missing-token' };
  const res = await fetch(
    `/api/project/cluster/${encodeURIComponent(clusterSlug)}/row/${encodeURIComponent(contentSlug)}?token=${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
      body: JSON.stringify({ field, value, kind, syncWait: true }),
    },
  );
  return readApiResult(res);
}

export async function patchContentMetadata(
  contentSlug: string,
  field: 'title' | 'keyword' | 'intent' | 'volume',
  value: string,
): Promise<ClusterApiResult> {
  const token = getCompanionToken();
  if (!token) return { ok: false, reason: 'missing-token' };
  const res = await fetch(
    `/api/project/content/${encodeURIComponent(contentSlug)}/metadata?token=${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
      body: JSON.stringify({ field, value, syncWait: true }),
    },
  );
  return readApiResult(res);
}
