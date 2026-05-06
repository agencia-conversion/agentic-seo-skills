# Consenso E-E-A-T v2

Três raters independentes avaliam o mesmo alvo. O engine valida JSON, normaliza evidência e gera um relatório único.

## Combinação

1. `present` ou `partial` sem `evidence_quote` vira `unclear`.
2. `not_applicable` fica fora do denominador do critério.
3. Score por pilar usa os cinco critérios aplicáveis do pilar.
4. Score final usa pesos: Trust 35%, Expertise 25%, Experience 20%, Authoritativeness 20%.
5. O consenso usa a mediana dos três scores por pilar e do score final.
6. `ymyl` vira verdadeiro quando pelo menos dois raters marcam verdadeiro.
7. `reputation_research` é unido e deduplicado por URL.
8. `issues[]` é deduplicado por severidade, tipo, critério, page_type e recomendação.
9. `remediation[]` continua agrupado por ids de checklist e similaridade textual.
10. Divergência alta gera `risk_flag: high_rater_divergence`.

## Relatório

O Markdown deve mostrar:

- `page_type`;
- critérios usados, estado, aplicabilidade e evidência;
- score de cada critério em escala 0–100;
- critérios `not_applicable`;
- score por pilar e score final;
- issues priorizadas;
- ações recomendadas;
- limitações e pesquisa de reputação.

O relatório público não expõe opiniões lado a lado por rater; detalhes ficam em `report.json._audit`.
