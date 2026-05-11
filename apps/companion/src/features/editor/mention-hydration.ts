export interface MentionHydrationState {
  text: string;
  broken: boolean;
  title: string;
  slug: string | null;
  hash: string;
}

export interface MentionHydrationPage {
  id: string;
  title: string;
  icon: string | null;
  slug: string;
  trashed?: unknown;
}

export function resolveMentionHydration(
  pageId: string | null,
  pages: MentionHydrationPage[],
  alias?: string | null,
  anchor?: string | null
): MentionHydrationState {
  if (!pageId) {
    return {
      text: '@unknown',
      broken: true,
      title: 'This page is unavailable',
      slug: null,
      hash: '',
    };
  }

  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page || page.trashed) {
    return {
      text: page?.title ? `@${page.title}` : '@removed',
      broken: true,
      title: 'This page is unavailable',
      slug: null,
      hash: '',
    };
  }

  const anchorClean = String(anchor || '').trim();
  const label = String(alias || anchorClean || page.title || 'Untitled').trim();
  return {
    text: `${page.icon ? `${page.icon} ` : ''}@${label}`,
    broken: false,
    title: anchorClean ? `${page.title || 'Untitled'}#${anchorClean}` : page.title || 'Untitled',
    slug: page.slug,
    hash: anchorClean ? `#${encodeURIComponent(anchorClean)}` : '',
  };
}
