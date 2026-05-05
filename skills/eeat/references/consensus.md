# Consenso entre 3 raters

3 sub-agents independentes produzem cada um um `rater-N.json`. O engine combina as 3 saídas em um relatório único. Estratégia escolhida: **mediana do score + união das findings**.

## Passos do engine

1. **Validação por rater**. Cada `rater-N.json` é validado contra o schema. Itens `present`/`partial` sem `evidence_quote` são rebaixados para `unclear` antes de qualquer cálculo. Se um rater entregar JSON inválido o engine falha a run inteira (não há substituição automática).
2. **Score por rater**. O engine calcula, para cada rater isoladamente:
   - rating por pilar (a partir do ratio dos itens, conforme rubrica);
   - pontos por pilar (rating → pontos);
   - aplicação dos gates (Trust gate, Reputation cap em modo URL, YMYL elevation);
   - score final do rater (0–100).
3. **Mediana**. O score consensuado é a **mediana** dos 3 scores. O page_quality consensuado é o **modo** dos 3 page_quality; em caso de tripla divergência, escolhe o rating correspondente ao score mediano.
4. **Por pilar**. Para cada pilar, a rating consensuada é o modo dos 3 ratings; em tripla divergência usa-se o rating do rater cujo score do pilar é o mediano.
5. **Itens do checklist**. Para cada item, registra-se a distribuição de estados entre os 3 raters (`agreement`: 3, 2 ou 1). Estado consensuado é o modo; empate triplo cai para `unclear`.
6. **YMYL**. Se 2 ou mais raters marcaram `ymyl: true`, o consenso é `true`.
7. **Reputation research (modo URL)**. União das fontes de todos os raters, deduplicada por `source_url`.
8. **Risk flags**. União das três listas, deduplicada.
9. **Remediation**. União das três listas, deduplicada por par `(priority, what)` normalizado (lowercased trim). Ordenar por prioridade `high → medium → low` e por contagem de raters que sugeriram.
10. **Findings**. Cada finding consensuado declara `agreement_count: 1|2|3`. Findings com `agreement_count = 1` são preservadas mas marcadas `low_confidence: true`.

## Divergência sinalizada, não escondida

O `report.json` inclui um bloco `divergence` que registra, por dimensão e por item:

- ratings/estados de cada rater individual;
- desvio máximo (diferença em pontos entre o maior e o menor score por pilar);
- itens com `agreement = 1` (apenas um rater viu).

Divergência alta (`max_pilar_spread > 25 pontos` ou >30% dos itens com agreement=1) gera `risk_flag: high_rater_divergence` e o `rater_narrative` final pede revisão humana.

## Narrativa final

O engine não escreve narrativa. Ele preserva os 3 `rater_narrative` originais em `report.json["rater_narratives"]` e o `report.md` os apresenta lado a lado. O agente principal pode (opcionalmente, fora do engine) sintetizar uma narrativa unificada — mas isso é uma etapa separada e marcada como `synthesized_by_main_agent: true`.
