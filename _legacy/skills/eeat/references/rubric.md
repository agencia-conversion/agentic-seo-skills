# Rubrica E-E-A-T v2

O score mede a adequação da página ao seu propósito. Critérios irrelevantes para o `page_type` não penalizam.

## Estados

| Estado | Valor |
| --- | ---: |
| present | 100 |
| partial | 50 |
| absent | 0 |
| unclear | 0 |
| not_applicable | excluído |

Aplicabilidade pesa o denominador:

| Aplicabilidade | Peso |
| --- | ---: |
| required | 1.25 |
| expected | 1.0 |
| optional | 0.5 |
| not_applicable | excluído |

## Score

`pillar_score = soma(score_do_critério × peso_aplicabilidade) / soma(peso_aplicabilidade)`.

`score_final = Trust × 0.35 + Expertise × 0.25 + Experience × 0.20 + Authoritativeness × 0.20`.

Trust pesa mais porque, nas diretrizes do Google, Experience, Expertise e Authoritativeness sustentam a confiança.

## Ratings

| Score | Rating |
| --- | --- |
| 85–100 | Highest |
| 65–84 | High |
| 40–64 | Medium |
| 20–39 | Low |
| 0–19 | Lowest |

## Gates

- `trust_gate_triggered`: Trust abaixo de 20 força `page_quality = Lowest`.
- `reputation_only_self_published`: no modo URL, Authoritativeness fica limitado a 50 quando não há reputação externa.
- `ymyl_below_floor`: em YMYL, qualquer pilar abaixo de 40 subtrai 15 pontos.

## Issues estruturadas

Não use flags genéricas como `anonymous_authorship`, `unverifiable_credentials` ou `fabrication_risk`.

Use `issues[]` com: `severity`, `page_type`, `criterion_id`, `issue_type`, `applicability_reason`, `evidence`, `recommendation`.

Tipos aceitos:

- `missing_expected_author`
- `unsupported_material_claim`
- `verification_needed`
- `insufficient_reputation_evidence`
- `missing_business_contact`
- `missing_required_policy`
- `outdated_or_undated_editorial_content`
- `missing_responsible_entity`
- `deceptive_or_unsafe_experience`
