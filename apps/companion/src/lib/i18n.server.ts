import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, LocalePreference, SupportedLocale, resolveLocale, resolvePreferredLocale } from './i18n';

export async function getServerLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const preferred = cookieStore.get(LOCALE_COOKIE)?.value as LocalePreference | undefined;
  if (preferred && preferred !== 'system') {
    return resolveLocale(preferred) || 'en';
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language') || '';
  const candidates = acceptLanguage
    .split(',')
    .map((entry) => entry.split(';')[0]?.trim())
    .filter(Boolean);

  return resolvePreferredLocale(candidates);
}
