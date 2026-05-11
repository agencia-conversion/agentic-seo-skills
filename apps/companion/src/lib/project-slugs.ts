export function projectPageSlug(path: string) {
  return (
    path
      .replace(/\.md$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toLowerCase() || 'pagina'
  );
}

export function projectSlugMatches(slug: string | null | undefined, pageSlug: string) {
  if (!slug) return false;
  return slug === pageSlug || slug.endsWith(`-${pageSlug}`);
}
