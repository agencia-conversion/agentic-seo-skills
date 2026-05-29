# Rascunho automático do Cérebro a partir do site

Este passo é opcional. Ele só roda quando o usuário, no início do setup, escolhe
"criar um rascunho automático" em vez do setup manual. Ele NUNCA roda sozinho e
NUNCA escreve direto nos arquivos autorais do Cérebro (`brain/`) sem aprovação.

> Tom e progresso para leigos: ver `docs/output-and-tone.md`. Explique o termo
> técnico em linguagem simples na primeira menção (ex.: "Cérebro do projeto",
> "importar fontes").
>
> Trabalho silencioso: a seleção/leitura das URLs e a coleta da info adicional
> acontecem no agente principal (que tem web fetch e canal com o usuário); o
> subagente recebe esses dados prontos. O usuário vê só o checklist nativo e o
> rascunho para revisar — nunca comandos crus, URLs de debug nem exploração.

## Quando este passo se aplica

- O usuário escolheu pré-preencher o Cérebro (`prefill_choice: from_site`).
- Existe um `site_url` válido em `project/.agentic-seo/project.json` (ou o usuário
  informou a URL do site principal).
- A estrutura básica do projeto já foi criada (diretórios + arquivos do Cérebro
  em branco a partir dos templates). O rascunho automático acontece DEPOIS do
  setup básico, nunca no lugar dele.

Se não houver `site_url`, este passo não roda: peça a URL ou siga com o Cérebro
em branco (`prefill_choice: blank`).

## O que este passo faz (e o que NÃO faz)

Faz:

1. Combina DUAS fontes de insumo: (a) as extrações das até 10 URLs do site
   (`site_extractions`) e (b) as **informações adicionais** que o usuário
   forneceu (`additional_info`: páginas-chave, posicionamento, diferenciais,
   público, concorrentes, dados). Ambas são entregues prontas pelo agente
   principal.
2. Compõe um RASCUNHO das páginas do Cérebro (`identity`, `voice`, `technology`,
   `review`, `topic-clusters`, `index`) combinando o que foi lido do site com a
   info adicional do usuário.
3. Marca o rascunho como pendente de aprovação e registra a coleta no diário
   (`brain/log.md`) com `type: ingestion`.
4. Apresenta o rascunho para o usuário revisar, editar e aprovar.

NÃO faz:

- Não escreve o rascunho direto nos arquivos autorais em `project/brain/`.
- Não inventa fatos de marca, dados de mercado nem decisões técnicas.
- Não promove o rascunho a contexto aprovado por conta própria.

## Seleção das URLs (até 10)

Escolha um conjunto pequeno e representativo, não a maior quantidade possível.
Priorize, nesta ordem, as páginas que mais carregam identidade e tese:

1. Home (`/`).
2. Sobre / Quem somos / Sobre nós.
3. Serviços / Produtos / Soluções (a página-âncora da oferta).
4. Páginas de categoria ou pilar do blog.
5. Até 3-5 posts-chave (os mais recentes ou os mais ligados pela navegação).
6. Contato / Time, se ajudar a entender autoridade (E-E-A-T).

Regras:

- Máximo de 10 URLs. Pare em 10 mesmo que existam mais candidatas.
- Apenas o domínio principal (`site_url`); não siga para domínios externos.
- Pule páginas de login, carrinho, checkout, busca interna e páginas legais
  pouco informativas, a menos que sejam o único conteúdo disponível.
- Prefira páginas com texto real; descarte páginas quase vazias.

## Extração

Para cada URL, capture o que ajuda a montar o Cérebro:

- Título da página e meta descrição.
- Cabeçalhos (H1/H2) e o texto principal.
- Sinais de marca: aposto, promessa, frase âncora, público.
- Sinais técnicos visíveis: stack aparente, CMS, plataforma.
- Temas recorrentes (insumo para áreas editoriais e topic clusters).

Guarde as URLs efetivamente lidas; elas viram a evidência da ingestão.

## Informações adicionais do usuário (`additional_info`)

O seed combina o site com o texto/posicionamento/dados que o usuário forneceu.
Quando `additional_info` estiver presente, ela é **insumo obrigatório** da
composição — nunca apenas coletada e ignorada.

- **Seleção/leitura das URLs:** quando o usuário citar páginas-chave ou URLs
  específicas, priorize-as na seleção das até 10 (mantendo o teto de 10).
- **Distribuição por página do Cérebro:** mapeie cada tipo de conteúdo da
  `additional_info` para a página-alvo reaproveitando a tabela de distribuição de
  [`seed-from-doc.md`](seed-from-doc.md) — posicionamento/diferenciais/público →
  `identity`; tom desejado → `voice`; stack/plataforma → `technology`; temas e
  subtemas → `topic-clusters`; ofertas → `products` (opcional); regras editoriais
  → `review`.
- **Precedência em caso de conflito:** a informação fornecida pelo usuário é
  autoral e **tem prioridade** sobre a observação do site (o site é evidência
  observada). Mas dados/métricas sem comprovação continuam indo para o `log` como
  pendência, não para a prosa do Cérebro (ver "Regras duras de composição").

## Composição do rascunho (pendente)

Componha um rascunho para cada página do Cérebro combinando o que foi lido do site
com a `additional_info` do usuário (insumo obrigatório quando presente):

- `index` — status atual e mapa (estrutura já existe; só preencher o que for
  observável).
- `identity` — aposto, parágrafo de apresentação, promessa, público,
  identidade técnica e canais.
- `voice` — princípios e registro inferidos do tom dos textos.
- `technology` — stack/CMS aparente; o resto fica como pendência.
- `review` — regras editoriais específicas do projeto inferidas do material.
- `topic-clusters` — clusters semânticos inferidos dos temas recorrentes.

Regras duras de composição:

- O rascunho fica em `project/workbench/` (área de trabalho), claramente marcado
  como RASCUNHO / pendente de aprovação. Não toque nos arquivos de `project/brain/`.
- Onde a página não der base para um campo, deixe o placeholder do template ou
  escreva "a confirmar" — nunca preencha por suposição.
- Não fabrique credenciais, números, casos, datas nem decisões. Se não está no
  site, não entra no rascunho.

## Registro no diário (log)

Anexe ao `brain/log.md` exatamente uma entrada de ingestão por execução do
rascunho automático. Use o token do enum em inglês `ingestion` e as chaves em
inglês (ver formato em `AGENTS.md`):

```markdown
## YYYY-MM-DD - Coleta para rascunho automático do Cérebro

- type: ingestion
- scope: project/workbench/ (rascunho do brain)
- decision: Coletadas N páginas do domínio principal (+ informações adicionais do usuário, quando fornecidas) para compor rascunho do Cérebro.
- evidence: <lista das URLs lidas> + <"informações adicionais fornecidas pelo usuário" quando houver>
- approver: pending
- notes: Rascunho pendente de revisão e aprovação humana. Não é contexto aprovado.
```

## Aprovação obrigatória

O rascunho não vira contexto estratégico aprovado até o usuário aprová-lo
explicitamente. Conforme `AGENTS.md` e a skill `brain-keeper`:

- Apresente o rascunho para o usuário revisar e editar. O caminho recomendado é
  abrir o Cérebro numa tela no navegador (handoff `project-browser`, ver
  `AGENTS.md` → "Browser handoff"), no modo persistente/detached e mirando o
  projeto do usuário — nunca preso a um Bash com timeout.
- Só ao receber aprovação explícita, mova o conteúdo aprovado do `workbench/`
  para os arquivos de `project/brain/` e registre UMA entrada `type: approval`
  no `brain/log.md` (com `approver` = nome humano e `approved_at` preenchidos).
  Esse é o único registro de aprovação do rascunho.
- Sem essa aprovação, o rascunho permanece em `workbench/` e não é tratado como
  evidência por nenhuma outra skill.

Nunca auto-promova o rascunho. A ingestão registra que houve coleta; a aprovação
é um ato humano separado.
