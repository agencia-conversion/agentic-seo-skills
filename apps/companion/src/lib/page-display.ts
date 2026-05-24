import type { Page } from '@/features/workspace/store';

type Translator = (key: string, vars?: Record<string, string | number>) => string;

export function displayPageTitle(page: Page, t: Translator): string {
  if (page.id === 'virtual/brain-empty' || page.path === 'brain/index.md') {
    return t('common.brain');
  }
  if (page.id === 'virtual/contents') return t('project.contents');
  if (page.id === 'virtual/workbench') return t('project.workbench');
  if (page.id === 'virtual/reports') return t('project.reports');
  return page.title || t('common.untitled');
}

export function pluralCount(t: Translator, oneKey: string, otherKey: string, count: number) {
  return t(count === 1 ? oneKey : otherKey, { count });
}
