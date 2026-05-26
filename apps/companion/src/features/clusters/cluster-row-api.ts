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
      body: JSON.stringify({ slug, keyword: title, syncWait: true }),
    },
  );
  if (!res.ok) return { ok: false, reason: `http-${res.status}` };
  return res.json();
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
  if (!res.ok) return { ok: false, reason: `http-${res.status}` };
  return res.json();
}

export async function patchContentMetadata(
  contentSlug: string,
  field: 'keyword' | 'intent' | 'volume',
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
  if (!res.ok) return { ok: false, reason: `http-${res.status}` };
  return res.json();
}
