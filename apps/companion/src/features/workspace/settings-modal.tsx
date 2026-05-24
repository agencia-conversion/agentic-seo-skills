'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Folder, Globe, HardDrive, Key, Maximize2, X } from 'lucide-react';
import { Select } from '@/components/select';
import { useEscapeKey } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';
import { getLocaleOptions, localeDisplayName, LocalePreference } from '@/lib/i18n';
import { useI18n } from '@/components/i18n-provider';
import { getPageWidthOptions } from './page-width';
import { useWorkspace } from './store';
import { DataForSeoCredentialsForm } from '@/features/credentials/dataforseo-credentials-form';

type SettingsTab = 'general' | 'credentials';

export function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'general',
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const projectName = useWorkspace((s) => s.projectName);
  const projectRoot = useWorkspace((s) => s.projectRoot);
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEscapeKey(() => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTab(initialTab);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen, initialTab]);


  const tabs: Array<{ value: SettingsTab; icon: React.ReactNode; label: string }> = [
    { value: 'general', icon: <Folder className="w-4 h-4" />, label: t('project.local') },
    { value: 'credentials', icon: <Key className="w-4 h-4" />, label: t('credentials.title') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-3xl h-[72vh] bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden flex"
          >
            <nav className="w-56 shrink-0 bg-notion-sidebar border-r border-notion-border py-4 px-2 flex flex-col">
              <div className="px-3 pb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-notion-text">{t('common.settings')}</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-notion-hover rounded transition-colors cursor-pointer"
                  aria-label={t('common.close')}
                >
                  <X className="w-4 h-4 text-notion-text-muted" />
                </button>
              </div>
              <div className="space-y-1">
                {tabs.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setTab(entry.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left',
                      tab === entry.value
                        ? 'bg-notion-active text-notion-text'
                        : 'text-notion-text-muted hover:bg-notion-hover hover:text-notion-text'
                    )}
                  >
                    {entry.icon}
                    {entry.label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="flex-1 overflow-y-auto">
              <div className="px-8 py-6 max-w-xl space-y-8">
                {tab === 'general' ? (
                  <>
                    <div>
                      <h3 className="text-base font-semibold text-notion-text mb-1">{t('project.localProject')}</h3>
                      <p className="text-xs text-notion-text-muted">{t('project.localDescription')}</p>
                    </div>

                    <section className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-notion-text">
                        <HardDrive className="w-4 h-4" />
                        {t('project.filesystem')}
                      </div>
                      <div className="rounded-md border border-notion-border bg-notion-sidebar/60 px-3 py-2">
                        <div className="text-sm text-notion-text truncate">{projectName}</div>
                        <div className="text-xs text-notion-text-muted truncate">{projectRoot}</div>
                      </div>
                    </section>

                    <GeneralSettings />
                  </>
                ) : (
                  <DataForSeoCredentialsForm />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function GeneralSettings() {
  const { locale, browserLocale, t } = useI18n();
  const defaultPageWidth = useWorkspace((s) => s.settings.defaultPageWidth);
  const language = useWorkspace((s) => s.settings.language);
  const setSettings = useWorkspace((s) => s.setSettings);
  const pageWidthOptions = getPageWidthOptions(t);
  const localeOptions = getLocaleOptions(locale);
  const activeBrowserLocaleLabel = localeDisplayName(browserLocale, locale);

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-notion-text">
          <Globe className="w-4 h-4" />
          {t('common.language')}
        </div>
        <div className="border border-notion-border rounded-md px-1 py-0.5 inline-flex min-w-[220px]">
          <Select
            value={language}
            onChange={(value) => setSettings({ language: value as LocalePreference })}
            options={localeOptions}
            className="w-full"
          />
        </div>
        <p className="text-[11px] text-notion-text-muted">{t('settings.languageBrowserHint', { locale: activeBrowserLocaleLabel })}</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-notion-text">
          <Maximize2 className="w-4 h-4" />
          {t('settings.defaultPageWidth')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pageWidthOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSettings({ defaultPageWidth: opt.value })}
              className={cn(
                'flex flex-col gap-0.5 items-start p-3 border rounded-md text-left transition-colors cursor-pointer',
                defaultPageWidth === opt.value
                  ? 'border-notion-text bg-notion-active'
                  : 'border-notion-border hover:bg-notion-hover'
              )}
            >
              <span className="text-sm font-medium text-notion-text flex items-center gap-2">
                {defaultPageWidth === opt.value && <Check className="w-3.5 h-3.5" />}
                {opt.label}
              </span>
              <span className="text-[11px] text-notion-text-muted">{opt.description}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
