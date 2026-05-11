export const slugify = (title: string, id: string): string => {
  const base = (title || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const shortId = id.slice(0, 8);
  return base ? `${base}-${shortId}` : shortId;
};

export const extractShortId = (slug: string): string => {
  const parts = slug.split('-');
  return parts[parts.length - 1] || '';
};

/**
 * Build an internal path for a page.
 *
 * - Anonymous / local-only: `/local/<slug>` — makes the URL explicitly
 *   non-shareable.
 * - Signed-in user: `/<slug>` — pages are replicated to cloud storage and the
 *   URL is the same across devices (for the same account).
 *
 * The scheme is decided client-side via isSignedIn() — callers read auth
 * state from `useStackUser()` or check `authClient.useSession()` directly
 * and pass the current flag.
 */
export const pagePath = (slug: string, signedIn: boolean = false): string =>
  signedIn ? `/${slug}` : `/local/${slug}`;

