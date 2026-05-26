'use client';

import { useI18n } from './i18n-provider';
import { NoteblockLogo } from './noteblock-logo';
import { cn } from '@/lib/utils';

interface NoteblockBrandProps {
  size?: number;
  textSize?: 'sm' | 'base' | 'lg';
  className?: string;
  showBy?: boolean;
}

export function NoteblockBrand({
  size = 25,
  textSize = 'base',
  className,
  showBy = true,
}: NoteblockBrandProps) {
  return (
    <div
      className={cn(
        'flex w-[232px] max-w-full min-w-0 shrink-0 flex-col items-start overflow-hidden whitespace-nowrap font-display text-notion-text',
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-2 leading-none">
        <NoteblockLogo size={size} className="text-agentic-blue shrink-0" />
        <span
          className={cn(
            'font-semibold lowercase leading-none',
            textSize === 'sm' && 'text-sm',
            textSize === 'base' && 'text-[18px]',
            textSize === 'lg' && 'text-lg'
          )}
        >
          agentic seo
        </span>
      </span>
      {showBy && <NoteblockBrandBy />}
    </div>
  );
}

export function NoteblockBrandBy({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const conversionUrl = locale === 'pt-BR' ? 'https://www.conversion.com.br/' : 'https://conversion.ag';

  return (
    <span className={cn('flex h-[14px] items-center gap-1.5 leading-none', className)}>
      <span className="text-[13px] font-medium leading-none text-notion-text-muted">{t('brand.by')}</span>
      <a
        href={conversionUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('brand.openConversion')}
        title={t('brand.openConversion')}
        data-testid="conversion-brand-link"
        className="h-[14px] w-[92px] shrink-0 bg-notion-text"
        style={{
          WebkitMask: "url('/brand/conversion-logo-sidebar.svg') center / contain no-repeat",
          mask: "url('/brand/conversion-logo-sidebar.svg') center / contain no-repeat",
        }}
      />
    </span>
  );
}
