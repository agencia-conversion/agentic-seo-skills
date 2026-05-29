'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/features/workspace/store';
import {
  LOCALE_COOKIE,
  LocalePreference,
  SupportedLocale,
  TranslationKey,
  formatDateForLocale,
  formatNumberForLocale,
  formatPercentForLocale,
  resolveLocale,
  resolvePreferredLocale,
  translate,
} from '@/lib/i18n';

interface I18nContextValue {
  locale: SupportedLocale;
  browserLocale: SupportedLocale;
  preference: LocalePreference;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  formatDate: (value: number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: SupportedLocale;
}) {
  const preference = useWorkspace((s) => s.settings.language ?? 'system');
  // Read-only project delivery language (project.json). When the local UI
  // preference is 'system', the interface DEFAULTS to the project's language
  // so a pt-BR project shows a pt-BR Companion — without ever writing back to
  // project.json. An explicit local selector choice still overrides it.
  const projectLanguage = useWorkspace((s) => s.projectLanguage);
  const [browserLocale, setBrowserLocale] = useState<SupportedLocale>(initialLocale);

  // When the preference is 'system', resolve the cookie locale into the
  // EFFECTIVE rendered locale only (local component state). This NEVER calls
  // setSettings and NEVER persists a preference or touches project.json —
  // browser/cookie detection affects what we render, not what we store.
  useEffect(() => {
    if (preference !== 'system' || typeof document === 'undefined') return;
    const cookie = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
    const explicit = resolveLocale(cookie?.split('=').slice(1).join('='));
    if (explicit) setBrowserLocale(explicit);
  }, [preference]);

  useEffect(() => {
    const update = () => {
      const languages =
        typeof navigator === 'undefined'
          ? []
          : navigator.languages?.length
            ? navigator.languages
            : [navigator.language];
      setBrowserLocale(resolvePreferredLocale(languages));
    };

    update();
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);

  // When preference is 'system', prefer the project delivery language, then the
  // detected browser locale. An explicit preference ('pt-BR' | 'en') always wins.
  const systemLocale: SupportedLocale =
    projectLanguage === 'pt-BR' || projectLanguage === 'en' ? projectLanguage : browserLocale;
  const locale = preference === 'system' ? systemLocale : preference;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${LOCALE_COOKIE}=${preference}; path=/; max-age=31536000; samesite=lax`;
  }, [locale, preference]);

  const t = useCallback<I18nContextValue['t']>(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const formatDate = useCallback<I18nContextValue['formatDate']>(
    (value, options) => formatDateForLocale(locale, value, options),
    [locale]
  );

  const formatNumber = useCallback<I18nContextValue['formatNumber']>(
    (value, options) => formatNumberForLocale(locale, value, options),
    [locale]
  );

  const formatPercent = useCallback<I18nContextValue['formatPercent']>(
    (value, options) => formatPercentForLocale(locale, value, options),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, browserLocale, preference, t, formatDate, formatNumber, formatPercent }),
    [locale, browserLocale, preference, t, formatDate, formatNumber, formatPercent]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
