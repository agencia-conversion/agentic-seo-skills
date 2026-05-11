import { NoteblockLogo } from './noteblock-logo';
import { cn } from '@/lib/utils';

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
    </div>
  );
}
