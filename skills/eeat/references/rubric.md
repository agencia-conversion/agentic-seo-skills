# Rubrica E-E-A-T

Ratings inspirados no Search Quality Rater Guidelines (QRG) do Google. O julgamento está nas notas; a aritmética é fixa.

## Estados de item

| Estado | Valor | Notas |
|---|---|---|
| present | 1.0 | item plenamente atendido com evidência citada |
| partial | 0.5 | item parcialmente atendido, ainda há lacunas |
| absent | 0.0 | item ausente, com declaração explícita de ausência |
| unclear | 0.0 | rater não conseguiu decidir; vira `risk_flag` |

## Rating por pilar

Para cada pilar, calcular `ratio = soma(valor × weight) / soma(weights)`.

| Faixa de ratio | Rating |
|---|---|
| 0.85–1.00 | Highest |
| 0.65–0.84 | High |
| 0.40–0.64 | Medium |
| 0.20–0.39 | Low |
| 0.00–0.19 | Lowest |

## Rating → pontos

| Rating | Pontos |
|---|---|
| Highest | 100 |
| High | 75 |
| Medium | 50 |
| Low | 25 |
| Lowest | 0 |

## Score final

`score = média simples(pontos das 4 letras)`, depois aplicar gates abaixo.

## Gates

1. **Trust gate**: se `Trust = Lowest`, `page_quality = Lowest` independentemente das demais. O score numérico não é zerado, mas o `page_quality` final é forçado para Lowest e isso deve aparecer no `rater_narrative`.
2. **Reputation cap (modo URL)**: se `reputation_research` está vazio ou só contém auto-publicações, Authoritativeness é capada em Medium (máx. 50 pontos). Item `au1` não pode ser `present` sem fonte externa.
3. **YMYL elevation**: se `ymyl = true`, qualquer pilar abaixo de Medium subtrai 15 pontos do score final (uma vez, mesmo que múltiplos pilares estejam abaixo). E o `risk_flags` recebe `ymyl_below_floor`.
4. **Quote-required**: itens `present` ou `partial` sem `evidence_quote` literal são rebaixados para `unclear` pelo engine na validação. Sem citação não há rating.

## page_quality global

Mapeamento do score (após gates) para o rating QRG agregado:

| Score | page_quality |
|---|---|
| 85–100 | Highest |
| 65–84 | High |
| 40–64 | Medium |
| 20–39 | Low |
| 0–19 | Lowest |

Trust gate sobrescreve esta tabela quando aplicável.

## Risk flags padronizados

- `anonymous_authorship` — conteúdo sem autor identificável
- `no_about_page` — sem `/sobre` ou equivalente acessível
- `outdated_content` — datas de revisão antigas para tópico que muda rápido
- `unverifiable_credentials` — credenciais alegadas sem fonte
- `reputation_only_self_published` — modo URL sem fontes externas reais
- `ymyl_below_floor` — pilar abaixo de Medium em YMYL
- `fabrication_risk` — rater detectou afirmação forte sem fonte; sinaliza para revisão humana
- `trust_gate_triggered` — Trust = Lowest acionou o gate
