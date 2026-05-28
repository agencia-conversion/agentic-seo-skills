declare const companionRoutes: {
  cleanProjectFilePath(value: unknown): string;
  companionSlugForPath(projectFilePath: unknown): string;
  normalizeCompanionSlug(value: unknown): string;
  companionPathForPath(projectFilePath: unknown): string;
  companionUrlForPath(baseUrl: unknown, projectFilePath: unknown): string | null;
  companionTargetForPath(projectFilePath: unknown, baseUrl?: unknown): {
    companion_slug: string;
    companion_path: string;
    companion_url?: string;
  };
  companionSlugMatches(slug: string | null | undefined, pageSlug: string): boolean;
};

export = companionRoutes;
