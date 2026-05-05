# Checklist E-E-A-T

Cada item é avaliado pelo rater como `present | partial | absent | unclear` com citação obrigatória (`evidence_quote` literal + `evidence_locator` apontando para arquivo+âncora ou URL+seletor). Itens `unclear` contam como `absent` para o score, mas geram um `risk_flag`.

Itens marcados com `weight: 2` valem dobrado dentro do pilar. Os demais valem 1.

## Experience

| id | weight | item |
|---|---|---|
| ex1 | 2 | Conteúdo e/ou marca demonstram envolvimento de primeira pessoa (testamos, usamos, operamos), não apenas síntese de terceiros |
| ex2 | 2 | Casos, projetos ou operações concretos com data, escopo e resultado (não genéricos) |
| ex3 | 1 | Artefatos próprios (fotos, screenshots, prints, vídeos, planilhas) — não banco de imagens ou stock |
| ex4 | 1 | Resultados quantitativos atribuídos a engajamentos reais, com fonte interna ou cliente |
| ex5 | 1 | Menção a erros, limites, trade-offs ou lições — sinal de prática real, não marketing |
| ex6 | 1 | Duração ou tamanho de amostra da experiência declarado (anos no mercado, número de clientes, volume operado) |
| ex7 | 1 | Metodologia ancorada em operação concreta, não em conselho genérico |
| ex8 | 1 | Texto distinguível de uma síntese passiva de outras fontes |

## Expertise

| id | weight | item |
|---|---|---|
| eq1 | 2 | Autor identificado por nome e função em cada peça substantiva |
| eq2 | 2 | Bio do autor com credencial verificável (formação, certificação, histórico) |
| eq3 | 1 | Metodologia ou raciocínio explicitado, não só conclusões |
| eq4 | 1 | Citação de fontes primárias, dados, padrões ou pesquisa |
| eq5 | 1 | Profundidade técnica adequada ao tópico (vocabulário, distinções, limites) |
| eq6 | 1 | Cobre casos de borda e contraindicações, não só caminho feliz |
| eq7 | 1 | Linguagem do campo usada com precisão, sem jargão vazio |
| eq8 | 1 | Conteúdo reflete o estado atual da área (sem afirmações datadas como verdade) |

## Authoritativeness

| id | weight | item |
|---|---|---|
| au1 | 2 | Menções independentes da marca/autor em fontes de terceiros (`reputation_research` obrigatório no modo URL) |
| au2 | 2 | Backlinks editoriais de sites do campo |
| au3 | 1 | Prêmios, certificações ou acreditações com fonte verificável |
| au4 | 1 | Histórico de palestras, ensino, publicação (eventos, livros, cursos, papers) |
| au5 | 1 | Parcerias, clientes ou afiliações institucionais verificáveis |
| au6 | 1 | Reconhecimento dentro do nicho (visibilidade para termos de marca, comunidade) |
| au7 | 1 | Citado por pares ou imprensa especializada |
| au8 | 1 | Cobertura externa é substantiva, não apenas auto-publicada ou paga |

## Trust

| id | weight | item |
|---|---|---|
| tr1 | 2 | Página Sobre/About com entidade real (nome legal, endereço, registro quando aplicável) |
| tr2 | 2 | Contato com canais múltiplos e caminho humano |
| tr3 | 2 | Política de privacidade e termos acessíveis |
| tr4 | 1 | Política editorial / fact-check / correções declarada |
| tr5 | 1 | Autor identificado por artigo com link para bio |
| tr6 | 1 | Datas de publicação e última revisão visíveis por artigo |
| tr7 | 1 | HTTPS, sem flags de malware/phishing |
| tr8 | 1 | Fontes citadas no conteúdo; disclosures (patrocinado, afiliado) visíveis |
| tr9 | 1 | Propriedade ou financiamento divulgados quando relevantes |
| tr10 | 1 | Sem padrões enganosos, sem indícios de conteúdo gerado em massa de baixa qualidade |

## Adaptação por modo

- **Modo wiki**: itens são avaliados sobre o conteúdo do wiki tratado como "self-declaration" da marca. Itens externos (au1, au2, au7, au8) só podem virar `present` se houver fonte catalogada em `wiki/fontes/index.md` apontando para evidência em `sources/`.
- **Modo URL**: rater navega o site real. `au1` é obrigatório vir do `reputation_research`; sem isso o item é `absent` e dispara o cap de Authoritativeness em Medium.

## Detecção YMYL

O rater marca `ymyl: true` quando o conteúdo principal trata de saúde, finanças, segurança, direito, decisões de vida ou tópicos onde informação ruim causa dano significativo. YMYL eleva o piso aceitável: uma página YMYL com Trust abaixo de High já é tratada como risco crítico.
