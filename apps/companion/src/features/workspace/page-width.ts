import { REPORT_DIR_NAME } from '../../../../../shared/report-modules';
import { TranslationKey } from '@/lib/i18n';
import { Page, PageWidth } from './store';

const PAGE_WIDTH_KEYS: {
  value: PageWidth;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}[] = [
  { value: 'sm', labelKey: 'pageWidth.smLabel', descriptionKey: 'pageWidth.smDescription' },
  { value: 'md', labelKey: 'pageWidth.mdLabel', descriptionKey: 'pageWidth.mdDescription' },
  { value: 'lg', labelKey: 'pageWidth.lgLabel', descriptionKey: 'pageWidth.lgDescription' },
  { value: 'full', labelKey: 'pageWidth.fullLabel', descriptionKey: 'pageWidth.fullDescription' },
];

export function getPageWidthOptions(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
) {
  return PAGE_WIDTH_KEYS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
    description: t(option.descriptionKey),
  }));
}

const CLASS_MAP: Record<PageWidth, string> = {
  sm: 'max-w-[640px]',
  md: 'max-w-[960px]',
  lg: 'max-w-[1200px]',
  full: 'max-w-none',
};

export function widthToClass(width: PageWidth): string {
  return CLASS_MAP[width];
}

export function resolvePageWidth(
  pageId: string | null,
  pages: Page[],
  defaultWidth: PageWidth
): PageWidth {
  if (!pageId) return defaultWidth;
  const page = pages.find((p) => p.id === pageId);
  let current: Page | undefined = page;
  while (current) {
    if (current.path?.startsWith(`${REPORT_DIR_NAME}/`) && current.width === 'full') return 'lg';
    if (current.width) return current.width;
    if (!current.parentId) break;
    current = pages.find((p) => p.id === current!.parentId);
  }
  if (page?.path?.startsWith(`${REPORT_DIR_NAME}/`) && defaultWidth === 'full') return 'lg';
  if (page?.path === 'brain/topic-clusters.md' || page?.path?.startsWith('brain/topic-clusters/')) return 'full';
  return defaultWidth;
}
