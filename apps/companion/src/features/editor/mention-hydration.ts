export interface MentionHydrationState {
  text: string;
  broken: boolean;
  title: string;
  slug: string | null;
}

export interface MentionHydrationPage {
  id: string;
  title: string;
  icon: string | null;
  slug: string;
  trashed?: unknown;
}

export function resolveMentionHydration(pageId: string | null, pages: MentionHydrationPage[], alias?: string | null): MentionHydrationState {
  if (!pageId) {
    return {
      text: '@unknown',
      broken: true,
      title: 'This page is unavailable',
      slug: null,
    };
  }

  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page || page.trashed) {
    return {
      text: page?.title ? `@${page.title}` : '@removed',
      broken: true,
      title: 'This page is unavailable',
      slug: null,
    };
  }

  return {
    text: `${page.icon ? `${page.icon} ` : ''}@${alias || page.title || 'Untitled'}`,
    broken: false,
    title: page.title || 'Untitled',
    slug: page.slug,
  };
}
