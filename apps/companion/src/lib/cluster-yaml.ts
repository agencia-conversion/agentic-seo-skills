// Bilingual normalization for cluster.yaml.
//
// v1 contract used pt-BR keys (nome, tese, pilar, satelites, papel, publicados,
// planejados). v2 uses EN keys (name, thesis, pillar, planned_satellites, role,
// published, planned). This helper accepts either form and adds aliases so
// downstream code can use either side.

const ROLE_PT_TO_EN: Record<string, string> = { pilar: 'pillar', satelite: 'satellite' };
const ROLE_EN_TO_PT: Record<string, string> = { pillar: 'pilar', satellite: 'satelite' };

function aliasRoleObject(obj: Record<string, any> | null | undefined) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.papel && !obj.role) {
    obj.role = ROLE_PT_TO_EN[obj.papel as string] || obj.papel;
  } else if (obj.role && !obj.papel) {
    obj.papel = ROLE_EN_TO_PT[obj.role as string] || obj.role;
  }
}

export function normalizeClusterYaml(yaml: any): any {
  if (!yaml || typeof yaml !== 'object') return yaml;
  if (yaml.nome && yaml.name == null) yaml.name = yaml.nome;
  if (yaml.name && yaml.nome == null) yaml.nome = yaml.name;
  if (yaml.tese && yaml.thesis == null) yaml.thesis = yaml.tese;
  if (yaml.thesis && yaml.tese == null) yaml.tese = yaml.thesis;
  if (yaml.pilar && yaml.pillar == null) yaml.pillar = yaml.pilar;
  if (yaml.pillar && yaml.pilar == null) yaml.pilar = yaml.pillar;
  if (Array.isArray(yaml.satelites) && yaml.satellites == null) yaml.satellites = yaml.satelites;
  if (Array.isArray(yaml.satellites) && yaml.satelites == null) yaml.satelites = yaml.satellites;
  if (Array.isArray(yaml.planned_satellites)) {
    for (const sat of yaml.planned_satellites) aliasRoleObject(sat);
  }
  if (Array.isArray(yaml.satelites)) {
    for (const sat of yaml.satelites) aliasRoleObject(sat);
  }
  if (yaml.satelite_overrides && !yaml.satellite_overrides) yaml.satellite_overrides = yaml.satelite_overrides;
  if (yaml.satellite_overrides && !yaml.satelite_overrides) yaml.satelite_overrides = yaml.satellite_overrides;
  aliasRoleObject(yaml.pilar);
  aliasRoleObject(yaml.pillar);
  if (yaml.stats && typeof yaml.stats === 'object') {
    if (yaml.stats.publicados != null && yaml.stats.published == null) yaml.stats.published = yaml.stats.publicados;
    if (yaml.stats.published != null && yaml.stats.publicados == null) yaml.stats.publicados = yaml.stats.published;
    if (yaml.stats.planejados != null && yaml.stats.planned == null) yaml.stats.planned = yaml.stats.planejados;
    if (yaml.stats.planned != null && yaml.stats.planejados == null) yaml.stats.planejados = yaml.stats.planned;
  }
  return yaml;
}
