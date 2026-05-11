'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/features/workspace/store';
import {
  LOCALE_COOKIE,
  LocalePreference,
  SupportedLocale,
  TranslationKey,
  formatDateForLocale,
  resolvePreferredLocale,
  translate,
} from '@/lib/i18n';

interface I18nContextValue {
  locale: SupportedLocale;
  browserLocale: SupportedLocale;
  preference: LocalePreference;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  formatDate: (value: number | Date, options?: Intl.DateTimeFormatOptions) => string;
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
  const [browserLocale, setBrowserLocale] = useState<SupportedLocale>(initialLocale);

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

  const locale = preference === 'system' ? browserLocale : preference;

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

  const value = useMemo(
    () => ({ locale, browserLocale, preference, t, formatDate }),
    [locale, browserLocale, preference, t, formatDate]
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
