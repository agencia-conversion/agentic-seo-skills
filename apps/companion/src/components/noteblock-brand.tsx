import { NoteblockLogo } from './noteblock-logo';
import { cn } from '@/lib/utils';

const CONVERSION_LOGO_SRC = '/conversion-logo-sidebar.svg';

interface NoteblockBrandProps {
  size?: number;
  textSize?: 'sm' | 'base' | 'lg';
  className?: string;
}

export function NoteblockBrand({ size = 20, textSize = 'sm', className }: NoteblockBrandProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-nowrap whitespace-nowrap shrink-0',
        className
      )}
    >
      <NoteblockLogo size={size} className="text-notion-text shrink-0" />
      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            'font-semibold text-notion-text',
            textSize === 'sm' && 'text-sm',
            textSize === 'base' && 'text-base',
            textSize === 'lg' && 'text-lg'
          )}
        >
          SEO Brain
        </span>
        <span className="text-[11px] font-medium text-notion-text-muted">by</span>
        <img
          src={CONVERSION_LOGO_SRC}
          alt="Conversion"
          width={70}
          height={11}
          className="h-[11px] w-auto shrink-0"
          style={{ opacity: 0.78 }}
        />
      </span>
    </div>
  );
}
