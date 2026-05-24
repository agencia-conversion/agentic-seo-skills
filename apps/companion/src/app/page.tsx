'use client';

import { useI18n } from '@/components/i18n-provider';

export default function MissingTokenPage() {
  const { t } = useI18n();
  return (
    <main className="h-screen w-full bg-background text-notion-text flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">{t('appBrand.name')}</h1>
        <p className="text-sm text-notion-text-muted">{t('appBrand.missingToken')}</p>
      </div>
    </main>
  );
}
