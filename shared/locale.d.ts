export type SupportedLanguage = "pt-BR" | "en";

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[];

export function asciiFold(value: string | null | undefined): string;
export function slugify(value: string | null | undefined): string;

export function normalizeLanguage(value: unknown, fallback?: SupportedLanguage): SupportedLanguage;
export function getProjectLanguage(projectDir: string, fallback?: SupportedLanguage): SupportedLanguage;

export function canonicalKeyword(value: string | null | undefined): string;

export function formatNumber(
  value: number | string | null | undefined,
  locale?: SupportedLanguage | string,
  options?: Intl.NumberFormatOptions,
): string;

export function formatPercent(
  value: number | string | null | undefined,
  locale?: SupportedLanguage | string,
  options?: Intl.NumberFormatOptions,
): string;

export function formatCompactNumber(
  value: number | string | null | undefined,
  locale?: SupportedLanguage | string,
  options?: Intl.NumberFormatOptions,
): string;
