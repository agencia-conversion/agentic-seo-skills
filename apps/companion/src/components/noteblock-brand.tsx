import { NoteblockLogo } from './noteblock-logo';
import { cn } from '@/lib/utils';

interface NoteblockBrandProps {
  size?: number;
  textSize?: 'sm' | 'base' | 'lg';
  className?: string;
}

export function NoteblockBrand({ size = 25, textSize = 'base', className }: NoteblockBrandProps) {
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
      <span className="mt-0 flex h-[14px] items-center gap-1.5 leading-none">
        <span className="text-[13px] font-medium leading-none text-notion-text-muted">by</span>
        <span
          role="img"
          aria-label="Conversion"
          title="Conversion"
          className="h-[14px] w-[92px] shrink-0 bg-notion-text"
          style={{
            WebkitMask: "url('/brand/conversion-logo-sidebar.svg') center / contain no-repeat",
            mask: "url('/brand/conversion-logo-sidebar.svg') center / contain no-repeat",
          }}
        />
      </span>
    </div>
  );
}
