// Single source of truth for the deterministic emoji suggestion derived from a
// cluster name. Client-safe (no node/server deps) so the create modal can
// pre-fill the icon before the cluster is written to disk; the server-side
// cluster writer in lib/cluster-management.ts imports from here too. Falls back
// to a neutral compass so a cluster never starts iconless.
export const DEFAULT_CLUSTER_ICON = '🧭';

const ICON_KEYWORD_RULES: ReadonlyArray<{ icon: string; patterns: RegExp }> = [
  { icon: '⚙️', patterns: /tecnolog|tecnic|técnic|engenhar|stack|infra|devop|api/i },
  { icon: '✍️', patterns: /conteud|conteúd|redaç|redac|editor|blog|artig|escrit/i },
  { icon: '🔑', patterns: /keyword|palavra-?chave|termo|busca|search/i },
  { icon: '🔗', patterns: /backlink|link|autoridade|off-?page/i },
  { icon: '📊', patterns: /dado|data|analytic|metric|métric|relator|relatór|report/i },
  { icon: '🎯', patterns: /estrateg|estratég|plano|planejam|meta|objetiv/i },
  { icon: '🛒', patterns: /ecommerc|e-?commerc|loja|produt|venda|compra/i },
  { icon: '🤖', patterns: /\bia\b|inteligenc|inteligên|agentic|agêntic|automaç|automac|llm|gpt/i },
  { icon: '🌐', patterns: /seo|site|web|dominio|domínio|página|pagina|serp/i },
  { icon: '📈', patterns: /crescim|growth|trafeg|tráfeg|rank|posicion/i },
];

export function suggestClusterIcon(name: string): string {
  const value = String(name ?? '').trim();
  if (!value) return DEFAULT_CLUSTER_ICON;
  for (const rule of ICON_KEYWORD_RULES) {
    if (rule.patterns.test(value)) return rule.icon;
  }
  return DEFAULT_CLUSTER_ICON;
}
