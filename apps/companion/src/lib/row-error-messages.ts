// Maps backend `reason:` codes from Companion API responses into user-readable
// localized toast messages. Keep this file flat — backend-driven literal-string
// translation table, no schema imports.

export type RowErrorLanguage = 'pt-BR' | 'en';

const REASON_MESSAGES_PT: Record<string, string> = {
  'planned-entry-not-found': 'Entrada planejada não encontrada',
  'unsupported-field': 'Campo não suportado',
  'unique-pillar-violation': 'Já existe um pilar com este slug',
  'content-not-found': 'Conteúdo não encontrado',
  'cluster-not-found': 'Cluster não encontrado',
  'active-pillar-required': 'Cluster ativo precisa de um pilar — escolha outro antes',
  'pillar-not-found': 'Pilar não encontrado',
  'invalid-field': 'Campo inválido',
  'invalid-volume': 'Volume inválido',
  'invalid-title': 'Título inválido',
  'invalid-slug': 'Slug inválido',
  'invalid-keyword': 'Keyword inválida',
  'invalid-name': 'Nome inválido',
  'invalid-pillar': 'Pilar inválido',
  'slug-already-exists': 'Já existe um item com este slug',
  'cluster-exists': 'Cluster com este slug já existe',
  'missing-cluster': 'Cluster não informado',
  'missing-token': 'Token do Companion ausente',
};

const REASON_MESSAGES_EN: Record<string, string> = {
  'planned-entry-not-found': 'Planned entry not found',
  'unsupported-field': 'Unsupported field',
  'unique-pillar-violation': 'Pillar slug already in use',
  'content-not-found': 'Content not found',
  'cluster-not-found': 'Cluster not found',
  'active-pillar-required': 'Active cluster needs a pillar — pick another first',
  'pillar-not-found': 'Pillar not found',
  'invalid-field': 'Invalid field',
  'invalid-volume': 'Invalid volume',
  'invalid-title': 'Invalid title',
  'invalid-slug': 'Invalid slug',
  'invalid-keyword': 'Invalid keyword',
  'invalid-name': 'Invalid name',
  'invalid-pillar': 'Invalid pillar',
  'slug-already-exists': 'Item with this slug already exists',
  'cluster-exists': 'Cluster with this slug already exists',
  'missing-cluster': 'Cluster missing',
  'missing-token': 'Companion token missing',
};

const SAVE_PREFIX: Record<RowErrorLanguage, string> = {
  'pt-BR': 'Falha ao salvar',
  en: 'Failed to save',
};

const REASON_LABEL: Record<RowErrorLanguage, string> = {
  'pt-BR': 'motivo',
  en: 'reason',
};

function lookupReason(reason: string, language: RowErrorLanguage): string | null {
  // Backend sometimes appends conflict context after a colon (e.g.
  // `unique-pillar-violation:other-cluster`). Match the base code.
  const baseCode = reason.split(':')[0];
  const map = language === 'en' ? REASON_MESSAGES_EN : REASON_MESSAGES_PT;
  return map[baseCode] ?? null;
}

export function formatRowError(
  field: string | undefined,
  reason: string | undefined,
  language: RowErrorLanguage,
): string {
  const fieldLabel = (field || '').trim();
  const savePrefix = fieldLabel ? `${SAVE_PREFIX[language]} ${fieldLabel}` : SAVE_PREFIX[language];
  if (!reason) return savePrefix;
  const message = lookupReason(reason, language);
  if (message) return `${savePrefix}: ${message}`;
  return `${savePrefix} (${REASON_LABEL[language]}: ${reason})`;
}
