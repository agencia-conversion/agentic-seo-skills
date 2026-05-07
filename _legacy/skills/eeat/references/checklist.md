# Checklist E-E-A-T v2

O rater sempre classifica `page_type` antes de pontuar: `homepage`, `about`, `service`, `case_study`, `article`, `author_profile`, `contact`, `policy`, `product_tool` ou `landing_page`.

Cada critério recebe `state: present | partial | absent | unclear | not_applicable` e o engine deriva `criterion_score` em escala 0–100.

- `present`: evidência suficiente.
- `partial`: evidência útil, mas incompleta.
- `absent`: critério aplicável e não encontrado.
- `unclear`: critério aplicável, mas a evidência não permite decidir.
- `not_applicable`: critério não esperado para o propósito da página; sai do denominador.

`present` e `partial` exigem `evidence_quote`. `absent`, `unclear` e `not_applicable` exigem explicação.

## Experience

| id | critério | o que avaliar |
| --- | --- | --- |
| ex1 | Envolvimento direto | Operação, uso, teste, execução ou vivência direta no tópico |
| ex2 | Trabalho real | Casos, exemplos, clientes, projetos ou provas concretas de atuação |
| ex3 | Ativos próprios | Dados, artefatos, imagens, screenshots, ferramentas, processos ou materiais próprios |
| ex4 | Escopo e contexto | Período, escopo, amostra, contexto, limites ou condições dos claims |
| ex5 | Prática específica | Diferença clara entre prática real e conselho genérico ou síntese passiva |

## Expertise

| id | critério | o que avaliar |
| --- | --- | --- |
| eq1 | Responsável adequado | Entidade, equipe, autor ou revisor identificável quando esperado |
| eq2 | Qualificação compatível | Papéis, credenciais, histórico, especialização ou qualificação compatíveis |
| eq3 | Profundidade técnica | Raciocínio, método, distinções técnicas ou domínio do assunto |
| eq4 | Fontes e dados | Fontes, padrões, dados, metodologia ou referências quando exigidos |
| eq5 | Atualidade e precisão | Conteúdo atual o bastante para o tópico, sem simplificação enganosa |

## Authoritativeness

| id | critério | o que avaliar |
| --- | --- | --- |
| au1 | Reputação externa | Menções independentes, reviews, imprensa, rankings ou fontes externas |
| au2 | Provas verificáveis | Clientes, parceiros, certificações, prêmios ou afiliações verificáveis |
| au3 | Reconhecimento no nicho | Reconhecimento tópico no mercado ou comunidade |
| au4 | Ativos de autoridade | Cases, publicações, estudos, cursos, palestras, ferramentas ou propriedade intelectual |
| au5 | Separação de prova | Diferença clara entre evidência externa, evidência própria e claim promocional |

## Trust

| id | critério | o que avaliar |
| --- | --- | --- |
| tr1 | Identidade da entidade | Quem responde pelo site, negócio, produto ou conteúdo |
| tr2 | Caminhos de contato e políticas | Contato, suporte, privacidade, termos ou caminhos legais esperados |
| tr3 | Claims substanciados | Claims comerciais, garantias, números e superlativos com evidência proporcional |
| tr4 | Transparência comercial | Patrocínio, afiliação, conflitos, preço, dados ou finalidade comercial claros |
| tr5 | Experiência segura e honesta | Sem UX enganosa, conteúdo obstruído, malware, phishing, exagero ou spam |

## Aplicabilidade por tipo de página

- Homepage: autoria individual é irrelevante; entidade, oferta, prova, claims, contato e reputação importam.
- Article: autor/revisor, data, fontes, método e atualidade são esperados; página institucional não substitui autoria.
- Case study: cliente, escopo, período, intervenção, baseline, resultado e limites são esperados.
- About: identidade, equipe, história, qualificação e reputação são esperadas.
- Service/landing/product_tool: promessa, escopo, prova, transparência comercial e contato são esperados.
- Contact/policy: muitos critérios de experiência e autoridade são `not_applicable`; identidade, caminhos legais e clareza dominam.
