export const INTENT_LABELS_PT: Record<string, string> = {
  informational: 'Informacional',
  transactional: 'Transacional',
  comparative: 'Comparativo',
  navigational: 'Navegacional',
};

export const INTENT_LABELS_EN: Record<string, string> = {
  informational: 'Informational',
  transactional: 'Transactional',
  comparative: 'Comparative',
  navigational: 'Navigational',
};

export const EDITORIAL_STATUS_LABELS_PT: Record<string, string> = {
  draft: 'Rascunho',
  'in-review': 'Em revisão',
  approved: 'Aprovado',
  published: 'Publicado',
};

export const EDITORIAL_STATUS_LABELS_EN: Record<string, string> = {
  draft: 'Draft',
  'in-review': 'In review',
  approved: 'Approved',
  published: 'Published',
};

export function intentLabel(value: string, locale: 'pt-BR' | 'en' = 'en'): string {
  if (!value) return '—';
  const map = locale === 'pt-BR' ? INTENT_LABELS_PT : INTENT_LABELS_EN;
  return map[value] || value;
}

export function editorialStatusLabel(
  value: string,
  locale: 'pt-BR' | 'en' = 'en',
): string {
  if (!value) return '—';
  const map = locale === 'pt-BR' ? EDITORIAL_STATUS_LABELS_PT : EDITORIAL_STATUS_LABELS_EN;
  return map[value] || value;
}

export const INTENT_CANONICAL_OPTIONS = [
  { value: 'informational' },
  { value: 'transactional' },
  { value: 'comparative' },
  { value: 'navigational' },
] as const;

export const EDITORIAL_STATUS_CANONICAL_OPTIONS = [
  { value: 'draft' },
  { value: 'in-review' },
  { value: 'approved' },
  { value: 'published' },
] as const;
