import companionRoutes from '../../../../shared/companion-routes.js';

const { companionSlugForPath, companionSlugMatches, normalizeCompanionSlug } = companionRoutes;

export function projectPageSlug(path: string) {
  return companionSlugForPath(path);
}

export function projectSlugMatches(slug: string | null | undefined, pageSlug: string) {
  return companionSlugMatches(slug, pageSlug);
}

export function normalizeProjectRouteSlug(value: string | null | undefined) {
  return normalizeCompanionSlug(value || '');
}
